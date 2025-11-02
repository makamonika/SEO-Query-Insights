# OpenRouter Service – Implementation Guide

## 1. Service Description
A **singleton** TypeScript class responsible for interacting with the OpenRouter LLM API. It encapsulates all network requests, request‐building logic, and response parsing, exposing a clean, typed API for the rest of the application (`src/lib/ai`).

Key responsibilities:
1. Build and dispatch chat/completion requests (stream & non-stream)
2. Inject model details, system & user messages, `response_format`, and tunable parameters
3. Validate and coerce model responses to strongly-typed DTOs
4. Handle errors, retries, rate-limits, and logging
5. Enforce security (API key, PII redaction, etc.)

---

## 2. Constructor Description
```typescript
constructor(config: {
  apiKey: string;          // Required – OpenRouter API key (env-driven)
  endpoint?: string;       // Defaults to "https://openrouter.ai/api/v1/chat/completions"
  model?: string;          // Default model name (e.g. "openrouter/anthropic:claude-3-sonnet")
  timeoutMs?: number;      // Default: 30_000
  maxRetries?: number;     // Default: 3
})
```
* Stores immutable configuration
* Sets sane defaults
* Performs basic validation (non-empty key, valid URL)

---

## 3. Public Methods & Fields
| Signature | Purpose |
|-----------|---------|
| `chat(options: ChatOptions): Promise<ChatResponse>` | Main entry – single request, returns parsed result |
| `chatStream(options: ChatOptions): AsyncIterable<ChatChunk>` | Returns an async generator yielding streamed chunks |
| `setModel(model: string): void` | Override default model at runtime |
| `getDefaultHeaders(): Record<string,string>` | Exposed for testing/diagnostics |
| `static getInstance(): OpenRouterService` | Enforces singleton pattern |

`ChatOptions` includes:
```typescript
{
  systemPrompt?: string;
  userPrompt: string;
  responseFormat?: JsonSchemaConfig;
  parameters?: Partial<{ temperature: number; top_p: number; max_tokens: number; }>; // etc.
}
```

---

## 4. Private Methods & Fields
| Name | Purpose |
|------|---------|
| `buildPayload(opts: ChatOptions): OpenRouterRequestDto` | Compose request payload inc. messages, model, params |
| `fetchWithRetry(payload, signal): Promise<Response>` | Centralized fetch w/ exponential back-off |
| `parseResponse(res: Response): Promise<ChatResponse>` | Handles JSON parsing, schema validation, error mapping |
| `validateSchema(schemaCfg, content): any` | Uses Zod/Ajv to validate model JSON output |
| `_config` | Immutable service-level configuration |
| `_instance` | Static singleton reference |

---

## 5. Error Handling
1. **Network errors** – unreachable host, DNS, etc. → retry (exponential), fallback, bubble after `maxRetries`
2. **HTTP ≥400** – map status codes:
   * 401/403 – `AuthError`
   * 429 – `RateLimitError` (includes `retry_after` if present)
   * 5xx – `ServerError` (retry eligible)
3. **Timeouts** – Abort request using `AbortController`; emit `TimeoutError`
4. **Invalid JSON** – `ParseError`
5. **Schema validation failures** – `SchemaValidationError` (include path & message)
6. **Streaming interruptions** – `StreamError`
7. **Unknown** – fallback to `UnknownOpenRouterError`

All custom errors extend a base `OpenRouterError` containing `code`, `message`, and optional `cause`.

---

## 6. Security Considerations
* API key **never** logged – filter headers/body before logging
* Use `dotenv` to load `OPENROUTER_API_KEY`; validate at boot via `zod`
* TLS enforced (HTTPS endpoint)
* Sanitize prompts to remove PII before optional logging/analytics
* Limit injected parameters (e.g., `max_tokens`) to safe ranges to avoid ballooning costs
* Strict schema validation prevents code injection from model output

---

## 7. Step-by-Step Implementation Plan
1. **Scaffold service file** – `src/lib/ai/openrouter.service.ts`
2. **Define DTOs & types**
   * `OpenRouterMessage`, `OpenRouterRequestDto`, `OpenRouterResponseDto`
   * `ChatOptions`, `ChatResponse`, `ChatChunk`
3. **Implement error classes** extending `OpenRouterError`
4. **Write `OpenRouterService` class**
   1. Add private constructor & singleton accessor
   2. Store `_config`
   3. Implement `buildPayload`:
      * Compose `messages` array:
        ```json
        [
          {"role":"system","content": systemPrompt || defaultSystem},
          {"role":"user","content": userPrompt}
        ]
        ```
      * Inject `model`, `response_format`, `parameters`
   4. Implement `fetchWithRetry` w/ `AbortController`
   5. Implement `chat` & `chatStream` using `fetchWithRetry`
   6. Parse/validate response via `parseResponse`
5. **Integrate schema validation** (Ajv/Zod)

---

### Examples – Request Elements
1. **System message**
   ```json
   { "role": "system", "content": "You are a helpful assistant." }
   ```
2. **User message**
   ```json
   { "role": "user", "content": "Summarise Astro advantages" }
   ```
3. **Structured response via `response_format`**
   ```json
   {
     "response_format": {
       "type": "json_schema",
       "json_schema": {
         "name": "astro_summary",
         "strict": true,
         "schema": {
           "type": "object",
           "properties": {
             "benefits": { "type": "array", "items": { "type": "string" } }
           },
           "required": ["benefits"],
           "additionalProperties": false
         }
       }
     }
   }
   ```
4. **Model name**
   ```json
   { "model": "openrouter/google/gemini-pro" }
   ```
5. **Model parameters**
   ```json
   { "temperature": 0.2, "top_p": 0.95, "max_tokens": 512 }
   ```

Each example maps directly to fields in `buildPayload`.
