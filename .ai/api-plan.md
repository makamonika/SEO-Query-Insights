# REST API Plan

## 1. Resources

| Resource | Database Table | Description |
|----------|----------------|-------------|
| `auth` | `auth.users` | User authentication & profile (managed by Supabase Auth) |
| `queries` | `queries` | Daily GSC query metrics (shared dataset) |
| `imports` | *n/a* (writes to `queries`) | Trigger manual GSC data import |
| `groups` | `groups` | Manual & AI-generated query groups (per-user) |
| `groupItems` | `group_items` | Query texts attached to a group |
| `aiClusters` | *n/a* (writes to `groups` & `group_items`) | Temporary AI clustering suggestions |
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
{ "name": "Topical Cluster", "aiGenerated": false }
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

#### Basic sorting (MVP)

- Supported params: `sortBy` in `name | createdAt` (default: `createdAt`), `order` in `asc | desc` (default: `desc`).
- Example: `/groups?sortBy=name&order=asc`.

##### Errors
`400` validation, `404` not found, `403` forbidden (not owner).

---

### 2.5 Group Items

| Method | Path | Description |
|--------|------|-------------|
| POST | `/groups/{groupId}/items` | Add one or many queries to group |
| DELETE | `/groups/{groupId}/items/{queryText}` | Remove query from group |

#### POST body
```json
{ "queryTexts": ["query a", "query b"] }
```

---

### 2.6 AI Clusters (Suggestions Lifecycle)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/clusters:generate` | Run K-means clustering on latest data |
| GET | `/ai/clusters/suggestions` | Fetch current suggestions (ephemeral) |
| POST | `/ai/clusters/{suggestId}:accept` | Persist suggestion as real group(s) |

Responses mirror the `groups` shape for consistency. Accepting inserts into `groups`, `group_items`, and `user_actions` (`cluster_accepted`).

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
| `group_items.queryText` | lower-cased, non-empty | `422` |

### 4.2 Business Logic

| Feature | Implementation |
|---------|---------------|
| **Opportunity detection** | During import: `isOpportunity = impressions > 1000 AND ctr < 0.01 AND 5 ≤ avgPosition ≤ 15`. Flag stored in DB; clients filter via `isOpportunity` param. |
| **AI clustering** | `/ai/clusters:generate` fetches latest `queries`, embeds text, runs K-means **on-demand**, and returns suggestions in the same response. Suggestions are **not persisted** server-side; when the client accepts a cluster, it is saved via the regular `groups` endpoints, otherwise it is simply discarded |
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
