# API Endpoint Implementation Plan: Groups Resource

## 1. Endpoint Overview
The **Groups** API provides CRUD operations for user-owned query groups, including AI-generated clusters. It allows clients to:

1. List all of the authenticated user’s groups (manual + AI-generated).
2. Create a new group.
3. Retrieve a single group with aggregated query metrics.
4. Partially update a group (rename or toggle `aiGenerated`).
5. Delete a group together with its items.

All routes live under `/groups` and are protected—accessible only to authenticated users. Row-level security (RLS) in Supabase enforces ownership, while the HTTP layer validates and returns appropriate status codes.

## 2. Request Details
| Method | Path | Purpose | Request Body | Path Params | Query Params |
|--------|------|---------|--------------|-------------|--------------|
| GET | `/groups` | List current user's groups with metrics & queryCount | — | — | `limit?`, `offset?`, `sortBy?`, `order?`, `search?` |
| POST | `/groups` | Create new group | `{ name: string; aiGenerated?: boolean }` | — | — |
| GET | `/groups/{groupId}` | Get single group with metrics | — | `groupId: uuid` | — |
| PATCH | `/groups/{groupId}` | Rename or toggle `aiGenerated` | `{ name?: string; aiGenerated?: boolean }` | `groupId: uuid` | — |
| DELETE | `/groups/{groupId}` | Delete group & its items | — | `groupId: uuid` | — |

### Required vs Optional Parameters
* `name` (POST) – **required**, non-empty trimmed.
* `aiGenerated` (POST/PATCH) – optional, default `false`.
* `groupId` – required UUID path param for singular routes.
* `sortBy` (GET /groups) – optional, one of `name`, `createdAt`, `aiGenerated`; default: `createdAt`.
* `order` (GET /groups) – optional, one of `asc`, `desc`; default: `desc`.
* `search` (GET /groups) – optional, case-insensitive partial match on group name.

## 3. Used Types
* **DTOs (from `src/types.ts`)**
  * `GroupDto`
  * `GroupWithMetricsDto`
  * `CreateGroupRequestDto`
  * `UpdateGroupRequestDto`
  * `GetGroupsResponseDto`
  * `GetGroupByIdResponseDto`
* **Internal**
  * `GroupInsert`, `GroupUpdate`
  * `GroupMetricsDto`

## 4. Response Details
| Route | Success Code | DTO / Structure |
|-------|--------------|-----------------|
| GET `/groups` | 200 | `GetGroupsResponseDto` → `{ data: GroupWithMetricsDto[] }` |
| POST `/groups` | 201 | Newly created `GroupWithMetricsDto` |
| GET `/groups/{id}` | 200 | `GroupWithMetricsDto` |
| PATCH `/groups/{id}` | 200 | Updated `GroupWithMetricsDto` |
| DELETE `/groups/{id}` | 204 | — (no body) |

### Error Codes
* 400 – Validation failed
* 401 – No/invalid JWT
* 403 – Authenticated but not owner (Supabase RLS should block; translate to 403)
* 404 – Group not found / deleted
* 409 – Name duplicate (unique per user) *(future)*
* 429 – Rate-limited (middleware)
* 500 – Unhandled server error

## 5. Data Flow
1. **HTTP Layer** (`src/pages/api/groups*.ts`)
   * Parse & validate request via Zod schemas.
   * Extract `supabase` from `Astro.locals` (see backend rule).
   * Call **GroupsService**.
2. **GroupsService** (`src/lib/groups/service.ts`)
   * Encapsulates all DB access & aggregation queries.
   * Uses the typed `SupabaseClient<Database>`.
   * Methods:
     * `list(userId, opts)` – joins `groups`, `group_items`, aggregated `queries` for latest date. Supports:
       * Sorting by `name`, `createdAt`, or `aiGenerated` (maps to `ai_generated` column)
       * Filtering by `search` (case-insensitive ILIKE match on group name)
       * Pagination via `limit` and `offset`
     * `create(userId, payload)` – insert row, return with metrics (zero counts).
     * `getById(userId, id)` – select + aggregates, ensure ownership.
     * `update(userId, id, patch)` – update & return.
     * `delete(userId, id)` – delete cascade (RLS ensures ownership).
3. **Database**
   * RLS policies from `db-plan.md` already guard data.
   * Aggregations computed with SQL views or inline SELECTs (CTEs) for impressions, etc.
4. **Response**
   * Convert snake_case → camelCase via helper (`CamelCaseKeys`).
   * Return JSON with correct status.

## 6. Security Considerations
* **Authentication** – Require valid Supabase JWT via auth hook; otherwise 401.
* **Authorization** – RLS plus explicit check that selected row’s `user_id = auth.uid()`; if not, return 403.
* **Input Validation** – Zod schemas:
  * `name` trimmed, length ≤ 100, no control chars.
  * `aiGenerated` boolean.
  * `groupId` uuid.
* **Rate Limiting** – Existing middleware (if any) or add rate-limit per user.
* **SQL Injection** – Only use Supabase query builder / prepared statements.
* **Mass Assignment** – Whitelist allowed fields in PATCH.
* **Enumeration** – Do not leak existence of groups owned by others; respond 404 if not found OR 403 when RLS blocked.

## 7. Error Handling
* Wrap service calls in try/catch.
* Map Supabase errors:
  * `PGRST116` (RLS violation) → 403.
  * `22P02` (invalid uuid) → 400.
  * `23505` (duplicate) → 409.
* Log unexpected errors to `user_actions` table (action_type=`internal_error`) or external logger.
* Return `ErrorResponse` DTO with code and message.

## 8. Performance Considerations
* **Indexes** are already defined—ensure queries use `idx_group_items_*` and `idx_queries_date`.
* The `idx_groups_user_created` composite index supports sorting by `created_at` for user-filtered queries.
* The `idx_groups_ai_generated` index supports sorting by `ai_generated` status.
* Search uses `ILIKE` with pattern `%search%` on the `name` column—this is case-insensitive but won't use index for prefix matching; acceptable for MVP with limited groups per user.
* Fetch metrics in a single query per endpoint (avoid N+1).
* Pagination on list (`limit`, `offset`). Default `limit = 50`, max `200`.
* SELECT only latest `queries` date for metrics via sub-select.
* Use `HEAD` requests (future) for counts.

## 9. Implementation Steps
1. **Design Zod Schemas** in `src/pages/api/_schemas/group.ts`.
2. **Scaffold GroupsService** in `src/lib/groups/service.ts` with methods above.
3. **Write SQL for aggregation** (helper in service) – impressions, clicks, ctr, avg_position.
4. **Implement API Routes**
   * `src/pages/api/groups/index.ts` – handle GET & POST.
   * `src/pages/api/groups/[groupId].ts` – handle GET, PATCH, DELETE.
5. **Add route tests** (e.g., Vitest + supertest) covering success & error paths.
6. **Integrate with RLS** – verify Supabase policies, add seed data for tests.
7. **Add logging** – service-level `console.error` + insert into `user_actions` when errors occur.
8. **Update `src/types.ts`** if new types added (e.g., pagination options).
9. **Update README & OpenAPI spec** (future) to document endpoints.
10. **Run linter & formatter**, ensure CI passes.
