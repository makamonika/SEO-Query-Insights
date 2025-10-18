# API Endpoint Implementation Plan: Group Items Management

## 1. Endpoint Overview
Provides CRUD-like operations for the *membership* between groups and query texts.

* **POST /groups/{groupId}/items** – Add one or many query texts to an existing group.  
* **DELETE /groups/{groupId}/items/{queryText}** – Remove a single query text from the group.

Operations are scoped to the authenticated user and must respect Supabase RLS: a user can modify only their own groups.

---

## 2. Request Details
### 2.1 POST /groups/{groupId}/items
* **HTTP Method:** POST  
* **Path Params**  
  • `groupId` (uuid, required) – target group  
* **Body**  

  ```json5
  {
    "queryTexts": ["query a", "query b"]
  }
  ```
  * `queryTexts[]` (array<string>, 1-500 items, each ≥1 char, trimmed); duplicates allowed in input but ignored in processing.

* **Headers** – `Authorization: Bearer <access-token>` (handled by Supabase session middleware)

### 2.2 DELETE /groups/{groupId}/items/{queryText}
* **HTTP Method:** DELETE  
* **Path Params**  
  • `groupId` (uuid, required)  
  • `queryText` (string, required, URL-encoded) – will be normalised to lowercase server-side  
* **Headers** – same as above

---

## 3. Used Types
Frontend/contract types already exist in `src/types.ts`:

* `AddGroupItemsRequestDto`         (body for POST)  
* `GroupItemDto`                    (response model if we decide to echo items)  
* `ErrorResponse`                   (standard error wrapper)

We will add internal service-layer helpers:

* `type AddGroupItemsResult = { addedCount: number }`  
* `type RemoveGroupItemResult = { removed: boolean }`

---

## 4. Response Details
| Scenario | Status | Body |
|----------|--------|------|
| Items inserted (≥1) | **201** | `{ "addedCount": n }` |
| All items already existed | **200** | `{ "addedCount": 0 }` |
| Item deleted | **200** | `{ "removed": true }` |
| Item not found | **404** | `ErrorResponse` |
| Validation failed | **400** | `ErrorResponse` |
| Not authenticated | **401** | – |
| Group not found / forbidden | **404** | `ErrorResponse` |
| Internal error | **500** | `ErrorResponse` |

*(A 409 “conflict” isn’t used; duplicates simply yield 0 added.)*

---

## 5. Data Flow
```text
Client
  │
  ├─► API Route (Astro server)
  │     • Parse & validate with Zod
  │     • Retrieve Supabase client from `locals.supabase`
  │     • Extract `user.id` from session
  │     • Invoke service layer
  │
  └─ Service (src/lib/groups/items.service.ts)
        • (POST) 1) Confirm group exists & belongs to user
                 2) Normalise queryTexts → lowercase, dedupe
                 3) Batch insert into `group_items`
                      – use `upsert` with unique constraint (`group_id, lower(query_text)`)
                 4) Insert `user_actions` row (“group_item_added”)
        • (DELETE) 1) Verify ownership as above
                   2) Delete row with matching group_id + lower(query_text)
                   3) Insert `user_actions` row (“group_item_removed”)
  │
  └─► Supabase/Postgres
        • RLS additionally enforces ownership
```

---

## 6. Security Considerations
1. **Authentication** – All access requires a valid Supabase session; enforced in Astro middleware (`locals.supabase`).
2. **Authorisation** –  
   • Ownership double-checked in service layer (`SELECT id FROM groups WHERE id = :groupId AND user_id = :uid`).  
   • RLS on `group_items` and `groups` tables provides defence-in-depth.
3. **Input Validation** – Zod schemas ensure:
   * groupId is UUID  
   * queryText strings are trimmed, non-empty, ≤255 chars  
   * queryTexts array size cap (e.g. 500) prevents DoS
4. **SQL Injection** – Supabase query builder uses parameterised queries; no string concatenation.
5. **Rate Limiting** – (out of scope here) but endpoint can be placed behind Astro middleware if needed.

---

## 7. Error Handling
| Error Case | Detection | Response |
|------------|-----------|----------|
| Malformed JSON / schema violations | Zod `.safeParse` fails | 400 + details |
| Group does not exist | Initial `SELECT` returns 0 | 404 |
| Not owner (RLS or select returns 0) | 404 (to avoid leaking existence) |
| Supabase insert/delete error | catch & log | 500 |
| Row not found on delete | `count === 0` | 404 |

**Logging** – Use existing logger (or `console.error` placeholder) plus insert into `user_actions` for audit & metrics.

---

## 8. Performance Considerations
* **Batch insert** – Use `upsert` (`.insert(..., { onConflict: 'group_id,query_text', ignoreDuplicates: true })`) to handle duplicates in a single round-trip.  
* **Chunking** – If `queryTexts.length > 1000` (Postgres limit for multi-row insert), chunk into batches (though we cap at 500).  
* **Index Usage** – `idx_group_items_group_id` & `idx_group_items_query_text` already exist.  
* **Payload size** – 500 items × ~100 bytes ≈ 50 KB, safe.

---

## 9. Implementation Steps
1. **Create service file**
   `src/lib/groups/items.service.ts` with:
   ```ts
   export async function addGroupItems(
     supabase: SupabaseClient<Database>,
     userId: string,
     groupId: string,
     queryTexts: string[]
   ): Promise<AddGroupItemsResult> { /* … */ }

   export async function removeGroupItem(
     supabase: SupabaseClient<Database>,
     userId: string,
     groupId: string,
     queryText: string
   ): Promise<RemoveGroupItemResult> { /* … */ }
   ```
2. **Add Zod schemas**  
   `src/pages/api/_schemas/groupItem.ts`
   * `pathParamsSchema = z.object({ groupId: z.string().uuid() })`
   * `addItemsBodySchema = z.object({ queryTexts: z.array(z.string().trim().min(1).max(255)).min(1).max(500) })`
   * `deleteParamsSchema = pathParamsSchema.extend({ queryText: z.string().trim().min(1) })`

3. **Implement API routes**
   ```
   src/pages/api/groups/[groupId]/items.ts          (POST)
   src/pages/api/groups/[groupId]/items/[queryText].ts   (DELETE)
   ```
   • Use `defineApi` pattern (Astro endpoint)  
   • Parse request with Zod → 400 on failure  
   • Grab `locals.supabase` and `locals.user`  
   • Call service and return JSON `201/200`.

4. **Insert user actions**  
   Inside service functions, after success:  
   ```ts
   await supabase.from('user_actions').insert({
     user_id: userId,
     action_type: 'group_item_added',
     target_id: groupId,
     metadata: { count: addedCount }
   });
   ```

5. **Unit tests (if framework available)** – happy path, duplicates, validation errors, ownership abuse.

6. **Update OpenAPI (if used) & README** – Document new endpoints.

7. **Commit & Push**  
   * File path: `.ai/group-items-endpoint-implementation-plan.md`  
   * Message: “docs(api): implementation plan for group items endpoints”

---
