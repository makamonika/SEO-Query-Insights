# API Endpoint Implementation Plan: AI Clusters (Suggestions Lifecycle)

## 1. Endpoint Overview
The AI Clusters feature provides users with on-demand keyword clustering suggestions derived from the latest query data.  It exposes three REST endpoints that together form the suggestion lifecycle:

* **GET /ai-clusters** – computes clusters and returns them to the client.
* **POST /ai-clusters/{suggestId}:accept** – persists (all or a subset of) the suggested clusters as real `groups`/`group_items` records.
* **POST /ai-clusters/{suggestId}:discard** – discards the suggestion without persisting anything.

All routes require authentication and log a corresponding entry in `user_actions` for analytics.

---

## 2. Request Details
### 2.1 `GET /ai-clusters`
* **HTTP Method:** GET  
* **URL:** `/api/ai-clusters` (Astro route: `src/pages/api/ai-clusters/index.ts`)
* **Query Params:** None (rate-limited globally per user).
* **Headers:** `Authorization: Bearer <jwt>`.
* **Request Body:** _—_

### 2.2 `POST /ai-clusters/{suggestId}:accept`
* **HTTP Method:** POST  
* **URL:** `/api/ai-clusters/[suggestId]/accept.ts`  
* **Path Params:** `suggestId` (UUID v4, required).
* **Request Body:**
```json
{
  "clusters": [
    {
      "name": "string (1–120 chars)",
      "queryTexts": ["non-empty string", "…"] (1–1000 items)
    }
  ]
}
```

### 2.3 `POST /ai-clusters/{suggestId}:discard`
* **HTTP Method:** POST  
* **URL:** `/api/ai-clusters/[suggestId]/discard.ts`  
* **Path Params:** `suggestId` (UUID v4, required).
* **Request Body:** `{}` (empty JSON).

---

## 3. Used Types
| Purpose | Type | File |
|---------|------|------|
| Suggestion item | `AiClusterSuggestionDto` | `src/types.ts` |
| Generate response | `GenerateAiClustersResponseDto` | `src/types.ts` |
| Accept request (single) | **NEW:** `AcceptClustersRequestDto` (array) | `src/types.ts` |
| Accept response | **NEW:** `AcceptClustersResponseDto` (array of `GroupWithMetricsDto`) | `src/types.ts` |
| User actions | `UserActionInsert` | `src/types.ts` |
| Group persistence | `GroupInsert`, `GroupItemInsert` | `src/types.ts` |

Zod validation schemas will live in `src/pages/api/_schemas/aiCluster.ts`.

---

## 4. Response Details
### 4.1 `GET /ai-clusters` – 200
```json
{
  "suggestId": "uuid",
  "clusters": [AiClusterSuggestionDto, …],
  "ttlSeconds": 1800
}
```
Headers: `Cache-Control: no-store`.

### 4.2 `POST …:accept` – 200
```json
{
  "groups": [GroupWithMetricsDto, …]
}
```
### 4.3 `POST …:discard` – 204 (No Content)

Error status codes common to all three routes:
* **400** – validation / malformed UUID, body, or unknown/expired `suggestId`.
* **401** – missing/invalid auth token.
* **404** – `suggestId` refers to suggestion of another user.
* **409** – `accept` called twice for same `suggestId`.
* **429** – rate limited (handled by middleware).
* **500** – unexpected server error.

---

## 5. Data Flow
```mermaid
graph TD
  subgraph API Layer (Astro)
    A1[GET /ai-clusters]
    A2[POST /ai-clusters/{id}:accept]
    A3[POST /ai-clusters/{id}:discard]
  end
  subgraph Service Layer
    S1[generateClusters(userId)]
    S2[acceptClusters(userId, id, clusters[])]
    S3[discardClusters(userId, id)]
  end
  subgraph Storage
    R1[(Ephemeral Suggestion Store <Map|Redis>)]
    DB[(Supabase DB)]
  end
  A1 -->|auth uid| S1 -->|suggest| R1
  A2 --> S2 --> DB
  A3 --> S3
  S1 -->|log action_type=cluster_generated| DB
  S2 -->|insert groups & items + action_type=cluster_accepted| DB
  S3 -->|action_type=cluster_discarded| DB
```

1. User hits **GET** – service pulls fresh query data, runs clustering (OpenRouter AI call or placeholder), produces suggestions, stores them in `R1` keyed by `(userId,suggestId)`, returns to client.
2. Client edits/filters suggestion, then **accepts**: service validates ownership & TTL, starts DB transaction: insert into `groups` & `group_items`, then commits and logs `user_action`.
3. **Discard** simply removes map entry and logs a `user_action`.

---

## 6. Security Considerations
* **Authentication** – Astro middleware attaches `supabase` client and `user` to `locals`. Reject `401` if absent.
* **Authorization** – suggestions are private to the requesting user (check `userId` matches entry owner).
* **Input Validation** – Zod schemas for path/body; reject over-long names, empty arrays, duplicate query texts.
* **RLS** – `groups` and `group_items` rely on existing policies; inserts use the user’s JWT, not service-role key.
* **Rate Limiting** – existing middleware applies (e.g., 3 req / min for generation).
* **TTL** – suggestions expire after 30 min to avoid stale persistence.
* **No Caching** – explicit `Cache-Control: no-store` header.

Threats & Mitigations:
1. **IDOR** – UUID collision: enforce ownership checks.
2. **Prompt Injection** (later when AI involved) – sanitize inputs before AI calls.
3. **Resource Exhaustion** – limit max clusters (≤50) & queryTexts per cluster (≤1000).
4. **SQL Injection** – use Supabase query builder only.

---

## 7. Error Handling
| Scenario | Status | Body |
|----------|--------|------|
| Missing auth | 401 | `ErrorResponse` |
| Invalid UUID | 400 | `ErrorResponse` |
| Body fails schema | 400 | `ErrorResponse` + zod issues |
| Suggestion expired | 400 | `ErrorResponse` (`code: 'gone'`) |
| Suggestion not owned | 404 | `ErrorResponse` |
| Accept twice | 409 | `ErrorResponse` |
| DB failure | 500 | `ErrorResponse` |

All errors are logged via `lib/utils.ts -> logError()`.

---

## 8. Performance Considerations
* **Heavy compute** – generation uses OpenRouter; wrap in 30 s timeout.
* **Caching** – store suggestion payload in in-memory LRU (per-node) for MVP; upgrade to Redis in prod.
* **Batch Inserts** – use `supabase().from('group_items').insert([...], { returning: 'minimal' })` to reduce I/O.
* **Indices** – DB already indexed; ensure `queries.date` latest query uses indexed look-up.

---

## 9. Implementation Steps
1. **Types**  
   a. Append `AcceptClustersRequestDto` & `AcceptClustersResponseDto` to `src/types.ts`.  
   b. Export `AiClusterSuggestionDto` & `GenerateAiClustersResponseDto` if not already.
2. **Validation Schemas**  
   Create `src/pages/api/_schemas/aiCluster.ts` with Zod validators for all payloads & `suggestId` param.
3. **Service Layer**  
   Add `src/lib/ai-clusters/service.ts` with:
   * `generateClusters(userId): GenerateAiClustersResponseDto`  
   * `acceptClusters(userId, suggestId, clusters): GroupWithMetricsDto[]` (wrapped in transaction)  
   * `discardClusters(userId, suggestId)`
   * internal `store` (Map with TTL) abstraction.
4. **API Routes**  
   * `src/pages/api/ai-clusters/index.ts` – GET handler: auth ➜ `service.generateClusters` ➜ log ➜ return JSON.
   * `src/pages/api/ai-clusters/[suggestId]/accept.ts` – POST handler: auth ➜ parse body ➜ `service.acceptClusters` ➜ return 200 JSON.
   * `src/pages/api/ai-clusters/[suggestId]/discard.ts` – POST handler: auth ➜ `service.discardClusters` ➜ return 204.
5. **User Action Logging**  
   Integrate `insertUserAction(userId, type, metadata)` utility and call in each service method.
6. **Middleware Updates**  
   Ensure existing rate-limit middleware tags `/ai-clusters` path; add `Cache-Control: no-store` header.
7. **Testing**  
   * Unit-test service functions with mocked Supabase.  
   * Integration tests for API routes (happy path & error cases).
8. **Docs**  
   Update `project_spec.md` and OpenAPI file (if maintained) with new endpoints.
9. **Deployment**  
   Verify Supabase RLS already covers `groups` / `group_items` inserts by user.

---

> **Estimated Effort:** ~2 dev-days (service + routes + tests).
