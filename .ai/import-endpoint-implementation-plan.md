## API Endpoint Implementation Plan: POST /api/import

### 1. Endpoint Overview
- Initiates a manual Google Search Console (GSC) data import using a source URL derived from server-side settings (client does not provide the URL) into the `queries` table.
- MVP behavior: synchronous. The request blocks until the import completes (within a strict timeout) and returns the final outcome.
- Upon completion (success or failure), writes a `user_actions` row with `action_type = 'import_completed'` and metadata summarizing the run.

### 2. Request Details
- **HTTP Method**: POST
- **URL**: `/api/import`
- **Headers**:
  - Required: `Authorization: Bearer <JWT>` (Supabase auth)
  - Content-Type: `application/json`
- **Request Body**: none

Timeout:
- Server enforces a max runtime (e.g., 25–30s). If exceeded, return 500 with `internal` and log failure; user can retry.

Authorization:
- Verify the JWT and resolve `userId` via Supabase Auth. Reject with 401 if missing/invalid.


### 3. Used Types
- From `src/types.ts`:
  - `UserActionType` – includes `'import_initiated'`, `'import_completed'`
  - `ErrorResponse`
- Plan DTO for response (MVP): `ImportRunResultDto` – `{ status: 'completed' | 'failed'; rowCount: number; durationMs: number; completedAt?: string; error?: { message: string } }`
- From `src/db/database.types` (generated):
  - `Tables<'queries'>`, `TablesInsert<'queries'>`
  - `TablesInsert<'user_actions'>`

### 4. Response Details
- Success 200 OK (synchronous):
```json
{ "status": "completed", "rowCount": 1234, "durationMs": 8421 }
```

- Error responses (JSON, `ErrorResponse` shape):
  - 400 Bad Request – settings missing or invalid URL (`validation_error`)
  - 401 Unauthorized – missing/invalid auth (`unauthorized`)
  
  - 500 Internal Server Error – timeout or unexpected server error (`internal`)

### 5. Data Flow
1. Client POSTs to `/api/import` with JWT.
2. Handler authenticates user.
3. Handler builds the `sourceUrl` from server-side settings (env or `settings` service), appending a daily filename derived from 3 days ago UTC date in `YYYYMMDD` format (e.g., `data_20251009.json` when today is 2025-10-12) due to GSC data delay.
4. Handler logs `user_actions` with `action_type = 'import_initiated'` and `metadata` `{ importId }`.
5. Handler runs the import inline with a strict timeout and returns the final result (200 on success, 500 on timeout/error).
6. Service steps:
   - Build daily filename from 3 days ago UTC date: `const date3DaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); const yyyymmdd = formatUtcYYYYMMDD(date3DaysAgo); const fileName = \`data_${yyyymmdd}.json\`; const sourceUrl = \`${baseUrl}/${fileName}\``.
   - Fetch data from `sourceUrl` with timeout, size limit, and content-type validation.
   - Parse rows (JSON). For each record, map into `queries` schema:
     - `date`, `query_text` (store lowercase), `url`, `impressions`, `clicks`, `avg_position`, `is_opportunity`, `created_at`.
     - Calculate `ctr` from `clicks / impressions` (or 0 if impressions = 0).
     - Compute `is_opportunity` per PRD: `impressions > 1000 && ctr < 0.01 && 5 <= avg_position && avg_position <= 15`.
   - Batch insert using Supabase `.insert([...], { returning: 'minimal' })`. Data provider handles deduplication.
   - On completion, insert `user_actions` row with `action_type = 'import_completed'` and `metadata` `{ importId, rowCount, durationMs, success: true }` (or `success: false` and error details on failure).

### 6. Security Considerations
- Authentication required (401 if not authenticated). Use `locals.supabase` and `supabase.auth.getUser()` to resolve current user.
- SSRF prevention:
  - `sourceUrl` is derived from trusted server settings; still enforce HTTPS and hostname allowlist.
  - Enforce allowlist via `IMPORT_URL_ALLOWLIST` and strict timeouts.
- Settings security:
  - Keep the import URL/base and credentials in server-only config (env or secured table). Restrict write access.
- RLS/Authorization:
  - Inserts into `queries` are allowed for `authenticated` per policies. The task runs under the user's context.
- Rate limiting (recommended): per-user limit (e.g., 1 import/min).
- Input size/type caps: content-length up to 50 MB; accept `text/csv` or `application/json` only.

### 7. Error Handling
- Use consistent `ErrorResponse` format.
- Map scenarios to status codes:
  - Missing/invalid settings (no URL, malformed URL) → 400 `validation_error`
  - Disallowed hostname → 400 `validation_error`
  - Timeout/network/parse errors during run → 500 `internal` (and log outcome)
  - Unexpected handler exceptions → 500 `internal`
- Logging:
  - Server logs via `console.error` with `importId` correlation.
  - Persist outcome via `user_actions` (`import_completed`), including error summary in `metadata` when failed.

### 8. Performance Considerations
- Stream parsing to minimize memory footprint (CSV reader with backpressure).
- Batch inserts (e.g., 1k rows per batch) and disable returning to reduce payload.
- Use database indexes (see `.ai/db-plan.md`) to keep ingest performant.
- Compute `is_opportunity` in-code before insert to avoid per-row DB compute.
- Data provider handles deduplication, so no client-side dedup needed.
- Concurrency control: only one running import per user (in-memory mutex for MVP). For multi-instance deployments, move to DB-level locking (e.g., `pg_advisory_lock`) or a dedicated `imports` table with a `status` field.

### 9. Implementation Steps
1. Route file
   - Create `src/pages/api/import.ts` exporting `POST: APIRoute`.
   - Use `locals.supabase` for DB access and auth resolution.
2. Auth
   - Resolve current user via `await locals.supabase.auth.getUser()` and retrieve `userId`. Return 401 if null.
3. Import Configuration
   - Add `src/lib/imports/config.ts` with `getImportSourceBaseUrl()` that returns a trusted HTTPS base URL from env; validate it.
   - Implement `formatUtcYYYYMMDD(date)` utility to produce `YYYYMMDD`.
   - Build daily filename and URL for 3 days ago: `const date3DaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); const fileName = \`data_${formatUtcYYYYMMDD(date3DaysAgo)}.json\`; const sourceUrl = \`${baseUrl}/${fileName}\``.
4. Generate `importId`
   - Use `crypto.randomUUID()`.
5. Pre-log action
   - Insert `user_actions` `{ user_id: userId, action_type: 'import_initiated', metadata: { importId } }`.
6. Run import inline
   - Execute `runImport` with a strict timeout (e.g., AbortController at 25–30s). On success respond 200 with `{ status: 'completed', rowCount, durationMs }`. On failure/timeout respond 500 `internal` and still log completion.
7. Background service
   - Implement `src/lib/imports/service.ts` to fetch, parse, compute, batch insert, and write `user_actions` completion; return `{ success, rowCount, durationMs }` for response composition.
8. Configuration
   - Add envs: `IMPORT_URL_ALLOWLIST`, `IMPORT_FETCH_TIMEOUT_MS` (default 30000), `IMPORT_MAX_BYTES` (default 50_000_000).
9. Tests/Verification
   - Unit-test settings resolution and allowlist.
   - Unit-test daily filename generation for timezone/edge cases.
   - Unit-test timeout behavior.
   - E2E: trigger import and verify rows inserted and `user_actions` completed.


### 11. Files to Add
- `src/pages/api/import.ts` – route handler.
- `src/lib/imports/config.ts` – import configuration (URL building, date formatting, config constants).
- `src/lib/imports/service.ts` – import service implementation (fetch, parse, batch insert, user_actions logging).

### 12. Notes and Assumptions
- MVP assumes a single application instance. For multi-instance deployments, replace in-memory lock with DB advisory locks or a dedicated `imports` table with transactional state transitions (`processing` → `completed`/`failed`).
- Import runs under the end-user’s `authenticated` role to satisfy RLS and auditing requirements.

