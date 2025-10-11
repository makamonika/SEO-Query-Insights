## API Endpoint Implementation Plan: GET /queries

### 1. Endpoint Overview
Lists query performance records from the `queries` table with optional filtering by search term and opportunity flag, supports sorting and pagination. Authenticated users only. Results use camelCase fields in the JSON response.

### 2. Request Details
- **HTTP Method**: GET
- **URL**: `/queries`
- **Parameters**:
  - **Required**: none
  - **Optional**:
    - `search` (string): case-insensitive partial match against `query_text`
    - `isOpportunity` (boolean): filter by `is_opportunity`
    - `sortBy` (`impressions | clicks | ctr | avgPosition`): default `impressions`
    - `order` (`asc | desc`): default `desc` for `impressions`, else `asc`
    - `limit` (int): default 50, allowed 1–1000
    - `offset` (int): default 0, min 0
- **Request Body**: none

### 3. Used Types
- `QueryDto` from `src/types.ts` (camelCase projection of `queries` row)
- `GetQueriesRequestDto` from `src/types.ts` (query params contract)
- `ErrorResponse` from `src/types.ts`

### 4. Response Details
- **Success 200**: JSON of `GetQueriesResponseDto`
  - Each item fields: `id`, `date` (YYYY-MM-DD), `queryText`, `url`, `impressions`, `clicks`, `ctr`, `avgPosition`, `isOpportunity`
- **Errors**:
  - 400 Bad Request: malformed or out-of-range params
  - 401 Unauthorized: missing or invalid session
  - 500 Internal Server Error: unexpected server-side failure

### 5. Data Flow
1. Client sends GET `/queries` with optional query params.
2. Astro API route `src/pages/api/queries.ts` handles request via `export const GET`.
3. Read `locals.supabase` (typed as `SupabaseClient` from `src/db/supabase.client.ts`) and ensure user session; if absent, return 401.
4. Parse and validate query parameters with Zod; coerce types and apply defaults/bounds.
5. Build Supabase query on `queries` table:
   - Apply filters:
     - `search`: `.ilike('query_text', '%<term>%')`
     - `isOpportunity`: `.eq('is_opportunity', true|false)`
  - Sorting: map `sortBy` to DB column names (`impressions`, `clicks`, `ctr`, `avg_position`) and apply `.order(column, { ascending })` with deterministic secondary sort (e.g., by `date` desc, `impressions` desc) to stabilize pagination.
   - Pagination: `.range(offset, offset + limit - 1)`.
   - Column projection with SQL aliases to camelCase to avoid runtime mapping:
     - `id, date, query_text as queryText, url, impressions, clicks, ctr, avg_position as avgPosition, is_opportunity as isOpportunity`.
6. Execute query; on success, return the resulting rows as a `GetQueriesResponseDto`.
7. Return JSON with status 200.

### 6. Security Considerations
- **Authentication**: Require authenticated Supabase session via `locals.supabase.auth.getUser()`; return 401 otherwise.
- **Authorization/RLS**: Rely on RLS policies from the database plan:
  - `queries` table allows SELECT for `authenticated` role.
- **Input validation**: Strict Zod validation and coercion for all query params; clamp `limit` to 1–1000 and `offset` ≥ 0.
- **Injection risks**: Supabase query builder uses parameterized queries; no string interpolation of SQL. Avoid dynamic column names except from a fixed whitelist for sorting.
- **DoS protection**: Enforce upper bound on `limit`; optionally add middleware-based rate limiting later.

### 7. Error Handling
- Validation errors: 400 with `ErrorResponse` and `code: 'validation_error'` including per-field details.
- Unauthorized: 401 with `ErrorResponse` and `code: 'unauthorized'`.
- Supabase or unexpected errors: 500 with `ErrorResponse` and `code: 'internal'`; do not leak internals.
- Logging: Use server-side structured logging (e.g., `console.error` with request id). No dedicated error table exists; do not persist errors in DB.

### 8. Performance Considerations
- Index usage (per DB plan):
  - Sorting on `impressions`, `ctr`, `avg_position` uses dedicated indexes.
  - `search` uses trigram GIN on `lower(query_text)`; ensure `pg_trgm` is enabled in the environment that imports migrations.
  - Filter on `is_opportunity` benefits from partial index.
- Stabilize pagination with secondary sorts to prevent duplicate/missing rows when values tie.

### 9. Implementation Steps
1. Create API route file `src/pages/api/queries.ts`.
2. Add parameter validation schema with Zod (install `zod` if not already present):
   - Schema (conceptual):
     - `search`: string optional, trim, min length 1 when provided.
     - `isOpportunity`: coerce boolean from `"true"|"false"`.
     - `sortBy`: enum(`impressions`, `ctr`, `avgPosition`), default `impressions`.
     - `order`: enum(`asc`, `desc`); default depends on `sortBy`: `desc` only when `impressions`, else `asc`.
     - `limit`: coerce number; default 50; clamp to 1–1000.
     - `offset`: coerce number; default 0; clamp to ≥ 0.
3. Implement GET handler using Astro API and `locals.supabase`:
   - Retrieve and validate params.
   - Determine `dbSortColumn` by mapping `avgPosition -> 'avg_position'` and pass `ascending` accordingly.
   - Execute Supabase query:
     ```ts
     const columns = 'id,date,query_text as queryText,url,impressions,clicks,ctr,avg_position as avgPosition,is_opportunity as isOpportunity';
     let q = supabase
       .from('queries')
       .select(columns);

     if (search) q = q.ilike('query_text', `%${search}%`);
     if (typeof isOpportunity === 'boolean') q = q.eq('is_opportunity', isOpportunity);

     q = q.order(dbSortColumn, { ascending });
     // optional secondary ordering
     q = q.order('date', { ascending: false });

     const { data, error } = await q.range(offset, offset + limit - 1);
     ```
   - On error: log and return 500 `ErrorResponse`.
   - On success: return 200 with `data` (`GetQueriesResponseDto`).
4. Type the handler response with `GetQueriesResponseDto | ErrorResponse` and import DTOs from `src/types.ts`.
5. Ensure `locals.supabase` is typed with `SupabaseClient` from `src/db/supabase.client.ts` (do not import from `@supabase/supabase-js`).
6. Add unit tests for param parsing utilities (if test infra exists) and a couple of integration tests (happy path, validation error, unauthorized).
7. Manual test scenarios:
   - No params (defaults)
   - `search=seo` with mixed case
   - `isOpportunity=true`
   - `sortBy=ctr&order=asc`
   - `limit=1&offset=100`
   -  invalid `order=down`, invalid `sortBy=views` (400)
   - Unauthenticated request (401)

### 10. Validation Schema Sketch (for reference)
```ts
import { z } from 'zod';

const QueryParamsSchema = z.object({
  search: z.string().trim().min(1).optional(),
  isOpportunity: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => (typeof v === 'string' ? v === 'true' : v)),
  sortBy: z
    .enum(['impressions', 'ctr', 'avgPosition'])
    .default('impressions'),
  order: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0),
}).transform((input) => {
  const sortBy = input.sortBy ?? 'impressions';
  const order = input.order ?? (sortBy === 'impressions' ? 'desc' : 'asc');
  return { ...input, sortBy, order };
});

type ParsedQueryParams = z.infer<typeof QueryParamsSchema>;
```

### 11. Mapping: sortBy -> DB column
- `impressions` -> `impressions`
- `clicks` -> `clicks` 
- `ctr` -> `ctr`
- `avgPosition` -> `avg_position`

### 12. Notes on DB and RLS
- Migrations in `supabase/migrations` already include `queries` schema, indexes, and RLS policies.
- The endpoint must not bypass RLS and must use the end-user session via `locals.supabase`.


