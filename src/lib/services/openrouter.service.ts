import { z } from "zod";

import type {
  ChatOptions,
  ChatResponse,
  OpenRouterRequestPayload,
  OpenRouterResponseDto,
  OpenRouterServiceConfig,
} from "./openrouter.types";

// ---- Error Handling --------------------------------------------------------

export class OpenRouterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterError";
  }
}

// ---- Service Skeleton -----------------------------------------------------

const DEFAULT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

const ConfigSchema = z.object({
  apiKey: z.string().min(1, "`apiKey` is required"),
  endpoint: z.string().url().optional(),
  model: z.string().min(1).optional(),
  timeoutMs: z.number().int().positive().optional(),
  maxRetries: z.number().int().nonnegative().optional(),
});

interface ResolvedConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
}

export class OpenRouterService {
  private static _instance: OpenRouterService | null = null;

  private readonly _config: Readonly<ResolvedConfig>;
  private _model: string;

  private constructor(config: OpenRouterServiceConfig) {
    const parsed = ConfigSchema.safeParse(config);
    if (!parsed.success) {
      throw new OpenRouterError(parsed.error.message);
    }

    this._config = Object.freeze({
      apiKey: parsed.data.apiKey,
      endpoint: parsed.data.endpoint ?? DEFAULT_ENDPOINT,
      model: parsed.data.model ?? DEFAULT_MODEL,
      timeoutMs: parsed.data.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRetries: parsed.data.maxRetries ?? DEFAULT_MAX_RETRIES,
    });

    this._model = this._config.model;
  }

  public static getInstance(config?: OpenRouterServiceConfig): OpenRouterService {
    if (!OpenRouterService._instance) {
      if (!config) {
        throw new OpenRouterError("OpenRouterService requires configuration on first initialisation.");
      }

      OpenRouterService._instance = new OpenRouterService(config);
    }

    return OpenRouterService._instance;
  }

  public setModel(model: string): void {
    const trimmed = model?.trim();
    if (!trimmed) {
      throw new OpenRouterError("Model name cannot be empty.");
    }

    this._model = trimmed;
  }

  public async chat(options: ChatOptions): Promise<ChatResponse> {
    const payload = this.buildPayload(options, false);
    const response = await this.fetchWithRetry(payload, options.abortSignal);
    return this.parseResponse(response);
  }

  // TODO
  // public chatStream(_options: ChatOptions): AsyncIterable<ChatChunk> {
  //   throw new OpenRouterError('chatStream will be implemented in a subsequent step.');
  // }

  private buildPayload(options: ChatOptions, stream = false): OpenRouterRequestPayload {
    if (!options?.userPrompt || !options.userPrompt.trim()) {
      throw new OpenRouterError("`userPrompt` is required.");
    }

    const systemPrompt = options.systemPrompt?.trim();
    const messages: OpenRouterRequestPayload["messages"] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    } else {
      messages.push({ role: "system", content: "You are a helpful assistant." });
    }

    messages.push({ role: "user", content: options.userPrompt });

    const payload: OpenRouterRequestPayload = {
      model: this._model,
      messages,
    };

    if (options.responseFormat) {
      payload.response_format = options.responseFormat;
    }

    if (options.parameters) {
      const { temperature, top_p: topP, max_tokens: maxTokens } = options.parameters;
      if (typeof temperature === "number") {
        payload.temperature = temperature;
      }
      if (typeof topP === "number") {
        payload.top_p = topP;
      }
      if (typeof maxTokens === "number") {
        payload.max_tokens = maxTokens;
      }
    }

    if (stream) {
      payload.stream = true;
    }

    return payload;
  }

  private async fetchWithRetry(payload: OpenRouterRequestPayload, signal?: AbortSignal): Promise<Response> {
    const maxAttempts = Math.max(this._config.maxRetries + 1, 1);
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      attempt += 1;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this._config.timeoutMs);
      const abortHandler = () => controller.abort(signal?.reason);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${this._config.apiKey}`,
      };

      if (signal) {
        if (signal.aborted) {
          clearTimeout(timeoutId);
          throw new OpenRouterError("Request aborted by caller.");
        }

        signal.addEventListener("abort", abortHandler, { once: true });
      }

      try {
        const response = await fetch(this._config.endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (response.ok) {
          return response;
        }

        const shouldRetry = this.shouldRetry(response.status) && attempt < maxAttempts;
        if (!shouldRetry) {
          throw new OpenRouterError(`OpenRouter request failed with status ${response.status}.`);
        }

        await this.sleep(RETRY_DELAY_MS);
      } catch (error) {
        lastError = error;
        const isAbortError = error instanceof DOMException && error.name === "AbortError";

        if (signal?.aborted) {
          throw new OpenRouterError("Request aborted by caller.");
        }

        if (isAbortError && attempt >= maxAttempts) {
          throw new OpenRouterError("OpenRouter request timed out.");
        }

        if (attempt >= maxAttempts) {
          if (error instanceof OpenRouterError) {
            throw error;
          }
          const message = error instanceof Error ? error.message : "Unknown error while contacting OpenRouter.";
          throw new OpenRouterError(message);
        }

        await this.sleep(RETRY_DELAY_MS);
      } finally {
        clearTimeout(timeoutId);
        if (signal) {
          signal.removeEventListener("abort", abortHandler);
        }
      }
    }

    const message = lastError instanceof Error ? lastError.message : "OpenRouter request failed.";
    throw new OpenRouterError(message);
  }

  private async parseResponse(response: Response): Promise<ChatResponse> {
    let json: unknown;
    try {
      json = await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse response body.";
      throw new OpenRouterError(message);
    }

    if (!this.isResponseDto(json)) {
      throw new OpenRouterError("Unexpected response structure from OpenRouter.");
    }

    const choiceWithMessage = json.choices.find((choice) => choice.message?.content);
    if (!choiceWithMessage?.message) {
      throw new OpenRouterError("OpenRouter response did not include a message.");
    }

    return {
      id: json.id,
      model: json.model,
      created: json.created,
      message: {
        role: choiceWithMessage.message.role,
        content: choiceWithMessage.message.content,
      },
      usage: json.usage,
      raw: json,
    };
  }

  private shouldRetry(status: number): boolean {
    if (status === 408 || status === 429) {
      return true;
    }

    return status >= 500 && status < 600;
  }

  private isResponseDto(value: unknown): value is OpenRouterResponseDto {
    if (!value || typeof value !== "object") {
      return false;
    }

    const dto = value as Partial<OpenRouterResponseDto>;
    return (
      typeof dto.id === "string" &&
      typeof dto.created === "number" &&
      typeof dto.model === "string" &&
      Array.isArray(dto.choices) &&
      dto.choices.length > 0
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
