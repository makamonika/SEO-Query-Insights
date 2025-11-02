export type OpenRouterRole = "system" | "user" | "assistant";

export interface OpenRouterMessage {
  role: OpenRouterRole;
  content: string;
}

export interface JsonSchemaConfig {
  type: "json_schema";
  json_schema: {
    name: string;
    schema: Record<string, unknown>;
    strict?: boolean;
  };
}

export interface ChatParameters {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

export interface ChatOptions {
  systemPrompt?: string;
  userPrompt: string;
  responseFormat?: JsonSchemaConfig;
  parameters?: ChatParameters;
  abortSignal?: AbortSignal;
}

export interface OpenRouterRequestPayload {
  model: string;
  messages: OpenRouterMessage[];
  response_format?: JsonSchemaConfig;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OpenRouterChoice {
  message?: OpenRouterMessage;
  delta?: Partial<OpenRouterMessage>;
  finish_reason?: string;
}

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterResponseDto {
  id: string;
  created: number;
  model: string;
  choices: OpenRouterChoice[];
  usage?: OpenRouterUsage;
}

export interface ChatResponseMessage {
  role: OpenRouterRole;
  content: string;
}

export interface ChatResponse {
  id: string;
  model: string;
  created: number;
  message: ChatResponseMessage;
  usage?: OpenRouterUsage;
  raw?: OpenRouterResponseDto;
}

export interface ChatChunk {
  id: string;
  index: number;
  delta: Partial<OpenRouterMessage>;
  finishReason?: string;
}

export interface OpenRouterServiceConfig {
  apiKey: string;
  endpoint?: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
}
