# REST API Plan

## 1. Resources

| Resource | Database Table | Description |
|----------|----------------|-------------|
| `auth` | `auth.users` | User authentication & profile (managed by Supabase Auth) |
| `queries` | `queries` | Daily GSC query metrics (shared dataset) |
| `imports` | *n/a* (writes to `queries`) | Trigger manual GSC data import |
| `groups` | `groups` | Manual & AI-generated query groups (per-user) |
| `groupItems` | `group_items` | Query records (by ID) attached to a group via foreign key |
| `aiClusters` | *n/a* (writes to `groups` & `group_items`) | Stateless AI clustering suggestions (not persisted server-side); acceptance writes to `groups` & `group_items` |
| `userActions` | `user_actions` | Analytics trail of user actions |

> **Naming convention**: camelCase for JSON keys, kebab-case for URL paths.

---

## 2. Endpoints

All endpoints are rooted at `/api/v1`. Responses use `application/json; charset=utf-8` unless specified.

### 2.1 Authentication

| Method | Path | Description | Req Body | Success | Errors |
|--------|------|-------------|----------|---------|--------|
| POST | `/auth/login` | Authorize user, return session JWT from Supabase | `{ email, password }` | `200 OK` `{ accessToken, expiresIn, refreshToken, user }` | `400 Bad Request` invalid payload<br>`401 Unauthorized` wrong credentials |
| POST | `/auth/logout` | Revoke current session | – | `204 No Content` | `401 Unauthorized` |
| POST | `/auth/refresh` | Exchange refresh token for new JWT | `{ refreshToken }` | `200 OK` same payload as login | `401 Unauthorized` invalid/expired token |

All subsequent endpoints require header `Authorization: Bearer <accessToken>`.

---

### 2.2 Queries

| Method | Path | Description |
|--------|------|-------------|
| GET | `/queries` | List queries with filtering, sorting & pagination |

#### GET `/queries` parameters

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `search` | string | – | Case-insensitive partial match on `query_text` |
| `isOpportunity` | boolean | – | Filter by opportunity flag |
| `sortBy` | `impressions \| ctr \| avgPosition` | impressions | Field to sort |
| `order` | `asc \| desc` | desc for impressions, asc otherwise | |
| `limit` | int | 50 | 1-1000 |
| `offset` | int | 0 | For pagination |

##### Success 200
```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2025-10-10",
      "queryText": "example query",
      "url": "https://example.com/page",
      "impressions": 1234,
      "clicks": 12,
      "ctr": 0.0097,
      "avgPosition": 7.3,
      "isOpportunity": true
    }
  ],
  "meta": { "total": 9800, "limit": 50, "offset": 0 }
}
```

##### Errors
- `400 Bad Request` malformed params
- `401 Unauthorized`

---

### 2.3 Imports

| Method | Path | Description | Req Body | Success | Errors |
|--------|------|-------------|----------|---------|--------|
| POST | `/imports` | Initiate manual GSC import (server builds source URL; synchronous MVP) | – | `200 OK` `{ status: "completed", rowCount, durationMs }` | `400` invalid configuration<br>`500` internal |

> MVP: Import runs synchronously; server derives the source URL from settings. On completion a `user_actions` row with `action_type = import_completed` is inserted.

---

### 2.4 Groups

| Method | Path | Description |
|--------|------|-------------|
| GET | `/groups` | List user’s groups (manual & AI) |
| POST | `/groups` | Create new group |
| GET | `/groups/{groupId}` | Get group details & aggregated metrics |
| PATCH | `/groups/{groupId}` | Rename or flag aiGenerated |
| DELETE | `/groups/{groupId}` | Delete group & its items |

#### POST `/groups` body
```json
{ 
  "name": "Topical Cluster", 
  "aiGenerated": false,
  "queryIds": ["uuid-1", "uuid-2"]  // optional: queries to add to group on creation
}
```

#### Aggregated metrics response snippet
```json
{
  "id": "uuid",
  "name": "Topical Cluster",
  "aiGenerated": false,
  "queryCount": 42,
  "metrics": { "impressions": 123456, "clicks": 789, "ctr": 0.0064, "avgPosition": 8.1 }
}
```

#### GET `/groups` parameters

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `search` | string | – | Case-insensitive partial match on `name` |
| `sortBy` | `name \| createdAt \| aiGenerated` | createdAt | Field to sort |
| `order` | `asc \| desc` | desc | Sort direction |
| `limit` | int | 50 | 1-200 |
| `offset` | int | 0 | For pagination |

##### Examples
- `/groups?sortBy=name&order=asc` - Sort by name alphabetically
- `/groups?sortBy=aiGenerated&order=desc` - AI-generated groups first
- `/groups?search=topical&sortBy=createdAt` - Search for "topical" and sort by creation date

##### Errors
`400` validation, `404` not found, `403` forbidden (not owner).

---

### 2.5 Group Items

| Method | Path | Description |
|--------|------|-------------|
| GET | `/groups/{groupId}/items` | Get all queries in a group |
| POST | `/groups/{groupId}/items` | Add one or many queries to group |
| DELETE | `/groups/{groupId}/items/{queryId}` | Remove query from group |

#### POST body
```json
{ "queryIds": ["uuid-1", "uuid-2"] }
```

#### GET response
Returns array of full query objects (QueryDto[]) that are members of the group, ordered by impressions descending.

---

### 2.6 AI Clusters

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ai-clusters` | Generate and return clustering suggestions (on-demand) |
| POST | `/ai-clusters/accept` | Persist clusters as real group(s) |

#### Behavior & Payloads (MVP)

- `GET /ai-clusters`
  - Success 200:
  ```json
  [
    {
      "name": "Topic A",
      "queryIds": ["uuid-1", "uuid-2"],
      "queryCount": 2,
      "metrics": { "impressions": 12345, "clicks": 67, "ctr": 0.0054, "avgPosition": 8.2 }
    }
  ]
  ```
  - Side effects: Log `user_actions` with `action_type = cluster_generated`.
  - Notes: Suggestions are not stored server-side; returned directly to client.

- `POST /ai-clusters/accept`
  - Body: `{ "clusters": [{ "name": "string", "queryIds": ["uuid-1", "uuid-2"] }] }` (allows rename and subset selection before commit)
  - Success 200: 
  ```json
  {
    "groups": [
      {
        "id": "uuid",
        "name": "Topic A",
        "aiGenerated": true,
        "queryCount": 2,
        "metrics": { "impressions": 12345, "clicks": 67, "ctr": 0.0054, "avgPosition": 8.2 }
      }
    ]
  }
  ```
  - Side effects: Insert into `groups` with `ai_generated = true`, insert into `group_items` with foreign key references to query IDs; log `user_actions` with `action_type = cluster_accepted`.

Notes:
- Suggestions are stateless and never persisted server-side. Only accepted clusters are saved as user groups.
- Server sets `Cache-Control: no-store` for `/ai-clusters` to avoid caching of compute-heavy responses.
- Rate limiting still applies (3 requests/min for generation endpoint).

---

### 2.7 User Actions (Admin / Analytics only)

All endpoints require service-role JWT.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/user-actions` | List actions with filters (actionType, date range, userId) |

---

## 3. Authentication & Authorization

1. **JWT (Supabase)**
   - Front-end obtains JWT via `/auth/login` and stores in cookies/localStorage.
   - Each request includes `Authorization: Bearer <token>`.
   - Backend verifies token via Supabase Auth API and sets `req.user = { id, email }`.

2. **Row-Level Security (RLS)**
   - Database enforces ownership for `groups`, `group_items`, `user_actions`.

3. **Role Separation**
   - `authenticated` role → regular endpoints.
   - `service_role` JWT (server only) → admin analytics & background import job.

4. **Rate Limiting**
   - 60 requests/min per user (configurable) via middleware (e.g., `@fastify/rate-limit`).

5. **CORS**
   - Restricted to company domains.

---

## 4. Validation & Business Logic

### 4.1 Field Validation (derived from DB constraints)

| Field | Rule | Error |
|-------|------|-------|
| `queries.impressions` | `>= 0` | `422` "impressions must be non-negative" |
| `queries.clicks` | `>= 0 ` | `422` |
| `queries.ctr` | `0 ≤ ctr ≤ 1` | `422` |
| `queries.avgPosition` | `>= 0` | `422` |
| `groups.name` | non-empty, trimmed | `422` |
| `group_items.queryId` | valid UUID, must reference existing query | `422` |

### 4.2 Business Logic

| Feature | Implementation |
|---------|---------------|
| **Opportunity detection** | During import: `isOpportunity = impressions > 1000 AND ctr < 0.01 AND 5 ≤ avgPosition ≤ 15`. Flag stored in DB; clients filter via `isOpportunity` param. |
| **AI clustering** | `GET /ai-clusters` fetches latest `queries`, embeds text, runs K-means **on-demand**, and returns suggestions in the same response. Suggestions are **stateless** and not persisted server-side; when the client accepts clusters via `POST /ai-clusters/accept`, they are saved as groups with `ai_generated = true` |
| **AI cluster actions logging** | `user_actions` logs `cluster_generated` and `cluster_accepted` with relevant metadata (cluster counts, query counts). |
| **Aggregated metrics** | `/groups/{id}` and `/groups` compute metrics on-the-fly via SQL JOIN on latest date. |
| **User actions logging** | Middleware records significant events (login, import, cluster actions, group CRUD) into `user_actions`. |

---

## 5. Error Handling Convention

```json
{
  "error": {
    "code": "validation_error",
    "message": "group name must not be empty",
    "details": {
      "field": "name"
    }
  }
}
```

Error codes: `validation_error`, `not_found`, `unauthorized`, `forbidden`, `rate_limited`, `conflict`, `internal`.

---

## 6. Performance Considerations

- **Indexes** from schema support filtering (`isOpportunity`) & sorting (`impressions`, `ctr`, `avgPosition`).
- Pagination enforced (`limit ≤ 10000`).
- Bulk insert during import uses `COPY` for 10k rows < 1 min.
- Long-running tasks (import, clustering) executed asynchronously and reported via polling.

---

## 7. Versioning & Future-Proofing

- Prefix all paths with `/api/v1`.
- Deprecate via sunset headers; introduce `/v2` for breaking changes.
