# View Implementation Plan – Group Details

## 1. Overview
The Group Details view enables SEO specialists to view and edit a single group at path `/groups/:groupId`. It shows an editable group header (name), aggregated performance metrics (impressions, clicks, CTR, average position, query count), and a table of member queries with the ability to remove queries from the group. It adheres to the MVP PRD: quick UI feedback (<500ms where possible), clear error handling, and consistency with existing query metrics formatting.

## 2. View Routing
- Path: `/groups/:groupId`
- Astro page: `src/pages/groups/[groupId].astro`
- Renders a React page component `GroupDetailsPage` and passes `groupId` as a prop from route params.

## 3. Component Structure
- `GroupDetailsPage`
  - `EditableHeader`
  - `MetricsSummary`
  - `QueriesTable` (reused) with an added Actions column for remove
    - Row action: `RemoveButton`
  - `ConfirmDialog` (reusable for destructive actions: remove item, delete group)
  - `TableEmptyState` (reused) when no member queries

## 4. Component Details
### GroupDetailsPage
- Component description: Top-level React component for the view; orchestrates data fetching, mutation handlers, and layout.
- Main elements:
  - Page wrapper with `main` landmark
  - Breadcrumb/back link to `/groups`
  - `EditableHeader`, `MetricsSummary`, `MemberQueriesTable` or `EmptyState`
  - Optional page-level `Delete Group` button in header actions
- Handled interactions:
  - Rename group (submit from `EditableHeader`)
  - Delete group (opens confirm, then deletes; on success navigate to `/groups`)
  - Remove query (delegated from table via handler)
- Handled validation:
  - Group name must be non-empty after trim; disallow unchanged names
  - Show conflict errors (409) if duplicate name
- Types:
  - Props: `{ groupId: string }`
  - Uses: `GroupWithMetricsDto`, `UpdateGroupRequestDto`, `ErrorResponse`, `QueryDto[]` (for members)
- Props:
  - `groupId` from route

### EditableHeader
- Component description: Inline-editable group name with save/cancel; shows AI badge (`aiGenerated`) and a delete button.
- Main elements:
  - Heading (h1) with inline input when editing
  - `Badge` (from `src/components/ui/badge.tsx`) for AI-generated label if `aiGenerated === true`
  - `Button` actions: Edit, Save, Cancel; `Delete Group` button
- Handled interactions:
  - Edit click toggles edit mode
  - Save triggers PATCH `/api/groups/:groupId`
  - Cancel restores previous name
  - Delete opens `ConfirmDialog`; on confirm, DELETE `/api/groups/:groupId`, then navigate to `/groups`
- Handled validation:
  - Name: required (non-empty after trim), max length (optional, e.g., 120 chars for UX), no change → disable Save
  - Duplicate name → surface `409` conflict
- Types:
  - Input: current `group.name`, `group.aiGenerated`
  - Output: `onRename(nextName: string) => Promise<void>`, `onDelete() => Promise<void>`
- Props:
  - `{ name: string; aiGenerated?: boolean; isSaving: boolean; onRename: (name: string) => Promise<void>; onDelete: () => Promise<void>; }`

### MetricsSummary
- Component description: Displays aggregated metrics and query count in compact cards, consistent with queries list formatting.
- Main elements:
  - Cards or inline stat blocks for Impressions, Clicks, CTR, Avg Position, Query Count
- Handled interactions:
  - None (display-only)
- Types:
  - `{ impressions: number; clicks: number; ctr: number; avgPosition: number; queryCount: number }`
- Props:
  - `{ metrics: GroupWithMetricsDto['metrics']; queryCount: number }`

### MemberQueriesTable
- Component description: REPLACED by reusing existing `QueriesTable` from queries module with a custom Actions column injected via props/composition.
- Main elements:
  - `QueriesTable` (existing) columns: Query, Impressions, Clicks, CTR, Avg Position; extend with Actions column to include Remove.
  - Optional search filter input (client-side filter for MVP) may be omitted if not needed—server already scopes to group membership.
- Handled interactions:
  - Remove row → opens confirm → on confirm, DELETE `/api/groups/:groupId/items/:queryText`
- Handled validation:
  - Ensure `queryText` is URL-encoded for DELETE path
  - Disable remove while request in-flight
- Types:
  - `QueryDto[]`
- Props:
  - `{ rows: QueryDto[]; onRemove: (queryText: string) => Promise<void>; isRemovingId?: string; }`
- Integration notes:
  - For empty lists, render `TableEmptyState` with message "This group has no queries yet."

### RemoveButton (table action cell)
- Component description: Small destructive icon/button to remove a query from group.
- Main elements:
  - `Button` variant destructive; optional trash icon
- Handled interactions:
  - Click → calls `onClick(queryText)`; parent opens confirm
- Validation:
  - Disabled while removing that row
- Props:
  - `{ queryText: string; disabled?: boolean; onClick: (queryText: string) => void }`

### ConfirmDialog (reusable)
- Component description: Modal dialog using `src/components/ui/dialog.tsx` to confirm destructive actions.
- Main elements:
  - Title, description, Confirm and Cancel buttons
- Props:
  - `{ open: boolean; title: string; description?: string; confirmLabel?: string; onConfirm: () => void; onOpenChange: (open: boolean) => void; }`

### EmptyState
- Component description: Shown when the group has no member queries.
- Main elements:
  - Illustration or icon, message, and contextual guidance
- Props:
  - `{ title: string; description?: string }`

## 5. Types
- Use existing shared DTOs from `src/types.ts`:
  - `GroupWithMetricsDto`: `{ id, userId, name, aiGenerated, createdAt, updatedAt, queryCount, metrics: { impressions, clicks, ctr, avgPosition } }`
  - `UpdateGroupRequestDto`: `{ name?: string; aiGenerated?: boolean }`
  - `GroupItemDto` (not directly displayed, but relevant to membership)
  - `QueryDto`: query performance row with camelCase fields
- New frontend-only helper types (if not already present; can be colocated or added to `src/types.ts` as needed):
  - `GetGroupItemsResponseDto = QueryDto[]`
  - `RemoveGroupItemResponseDto = { removed: boolean }`
  - `AddGroupItemsResponseDto = { addedCount: number }` (for completeness, though not used in this view)
  - `RenameGroupResponse = GroupWithMetricsDto`
- View models:
  - `GroupDetailsVm = { group: GroupWithMetricsDto; members: QueryDto[] }`

## 6. State Management
- Local component state in `GroupDetailsPage` with custom hooks:
  - `useGroup(groupId)` → fetches `GroupWithMetricsDto` via GET `/api/groups/:groupId`
  - `useGroupItems(groupId)` → fetches `QueryDto[]` via GET `/api/groups/:groupId/items` (see API note below)
  - `useRenameGroup()` → PATCH `/api/groups/:groupId`
  - `useDeleteGroup()` → DELETE `/api/groups/:groupId`
  - `useRemoveGroupItem()` → DELETE `/api/groups/:groupId/items/:queryText`
- State variables:
  - `group: GroupWithMetricsDto | null`
  - `members: QueryDto[]`
  - `loadingGroup: boolean`, `loadingMembers: boolean`
  - `savingName: boolean`, `deletingGroup: boolean`
  - `removingQueryText: string | null`
  - `error?: string` (surface via toasts)
- After successful item removal:
  - Refresh members list; then re-fetch group to get updated metrics/queryCount (MVP correctness)
  - Optionally optimistic: remove row immediately, decrement `queryCount`; if server fails, rollback and show error

## 7. API Integration
- Base paths use existing Astro API routes under `/api`.
- Endpoints used:
  - GET `/api/groups/:groupId` → `GroupWithMetricsDto` (already implemented)
  - PATCH `/api/groups/:groupId` (body `UpdateGroupRequestDto`) → `GroupWithMetricsDto` (already implemented)
  - DELETE `/api/groups/:groupId` → 204 No Content (already implemented)
  - DELETE `/api/groups/:groupId/items/:queryText` → `RemoveGroupItemResponseDto` (already implemented)
  - GET `/api/groups/:groupId/items` → `GetGroupItemsResponseDto` (NOTE: not present in `src/pages/api/groups/[groupId]/items.ts` yet; add a GET handler returning `QueryDto[]` joined by membership. Frontend will consume it.)
- Request/response details:
  - Rename group:
    - Request: `PATCH /api/groups/:groupId`, body `{ name: string }`
    - Responses: `200 GroupWithMetricsDto`, `400 ErrorResponse`, `404`, `409 ErrorResponse { code: "conflict" }`
  - Delete group:
    - Request: `DELETE /api/groups/:groupId`
    - Responses: `204`, `400 ErrorResponse`, `404`, `500 ErrorResponse`
  - Remove member:
    - Request: `DELETE /api/groups/:groupId/items/:queryText` (URL-encode `queryText`)
    - Responses: `200 { removed: true }`, `404 ErrorResponse` if text not in group, `500 ErrorResponse`
  - List members: (backend addition)
    - Request: `GET /api/groups/:groupId/items`
    - Response: `200 QueryDto[]` (ordered by impressions desc; optional query params: `search`, `sortBy`, `order` for future)

## 8. User Interactions
- Rename group:
  - User clicks Edit → input appears with current name auto-focused
  - On Save: validate non-empty, disable controls; on success, show toast “Group renamed” and update header; on conflict (409), show inline error and keep edit mode
- Delete group:
  - User clicks Delete → confirm dialog explains that queries aren’t deleted; on confirm, delete and navigate to `/groups` with toast “Group deleted”
- Remove query from group:
  - User clicks Remove on a row → confirm dialog; on confirm, call DELETE, optimistically hide row; on success, toast “Removed from group”; refresh metrics; on failure, restore row and show error
- Empty state:
  - If `members.length === 0`, show `TableEmptyState` with guidance

## 9. Conditions and Validation
- Group name:
  - Required, trimmed; block Save if empty or unchanged
  - Handle duplicate name: show server message (409 conflict)
- Remove query:
  - Ensure `queryText` is provided and URL-encoded
  - Block multiple concurrent removals of the same `queryText`
- Navigation on delete:
  - Only navigate after receiving `204`
- Metrics consistency:
  - After any membership change, re-fetch group to sync aggregated metrics and `queryCount`

## 10. Error Handling
- Network/API errors:
  - Map `ErrorResponse.error.code` to user-friendly toasts (“Validation error”, “Not found”, “Conflict”, “Internal error”)
- Validation errors (rename):
  - Inline input error state with message; disable Save
- Not found (group or item):
  - If group 404 on initial load → show centered message with link back to `/groups`
  - If item 404 on removal → show toast and refresh members
- Loading states:
  - Skeletons or spinners for header and metrics; table-level spinner while loading members
- Accessibility:
  - Use `aria-live="polite"` for toast container; ensure confirm dialogs trap focus and are labelled

## 11. Implementation Steps
1. Routing
   - Add `src/pages/groups/[groupId].astro` to mount `GroupDetailsPage` with `groupId` from params.
2. Components
   - Create `src/components/groups/GroupDetailsPage.tsx` composing subcomponents
   - Create `EditableHeader.tsx`, `MetricsSummary.tsx`, `ConfirmDialog.tsx`
   - Reuse `QueriesTable` with an added Actions column and reuse `TableEmptyState` for empty state
3. Hooks
   - Implement `src/hooks/useGroups.ts` (if not present) or add `useGroup(groupId)`
   - Implement `useGroupItems(groupId)` for member queries
   - Implement mutation hooks: `useRenameGroup`, `useDeleteGroup`, `useRemoveGroupItem`
4. API integration
   - Wire GET `/api/groups/:groupId` into `useGroup`
   - Wire DELETE `/api/groups/:groupId/items/:queryText` into `useRemoveGroupItem`
   - On success of removal, refresh both `members` and `group`
5. Backend alignment (small addition)
   - Add GET handler to `src/pages/api/groups/[groupId]/items.ts` to return `QueryDto[]` for that group (join `group_items` with `queries` by `query_text`)
6. UX/Validation
   - Inline rename validation and conflict handling (409)
   - Confirm dialogs for remove and delete
   - Disabled states while requests are in-flight
7. Styling & A11y
   - Use Tailwind utility classes; respect dark mode; utilize `ui` components (`button`, `badge`, `dialog`, `table`)
   - Ensure ARIA attributes for dialogs and live regions
8. Testing & QA
   - Manual flows: load group, rename, remove query, delete group
   - Metrics update after removals; empty state rendering
9. Navigation
   - On group delete, route to `/groups` and show success toast
