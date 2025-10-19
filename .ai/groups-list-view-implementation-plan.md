# View Implementation Plan – Groups List

## 1. Overview
The Groups List view lets SEO specialists manage manual and AI-generated query groups. It displays each group’s name, AI badge, query count, and aggregated metrics (impressions, clicks, CTR, average position), with sorting and search. Users can create, rename, and delete groups, and access actions such as viewing a group’s details. The view adheres to performance and accessibility requirements from the PRD.

## 2. View Routing
- Path: `/groups`
- Astro page: `src/pages/groups.astro` – mounts a React component for interactivity.

## 3. Component Structure
- `src/pages/groups.astro`
  - `src/components/groups/GroupsPage.tsx`
    - `GroupsToolbar`
      - `SearchInput` (reuse pattern from queries)
      - `GroupWithAIButton` (existing)
    - `GroupsTable`
      - `GroupRow` rows with metrics cells and `GroupRowActions`
        - `GroupRowActions` → Inline rename (name only), View (redirect), Delete → `ConfirmationModal`
    - `LiveRegion` (existing) for announcements

## 4. Component Details
### GroupsPage
- Component description: Container that orchestrates state (search, sorting, pagination) and data loading, renders toolbar and table, handles create/rename/delete workflows.
- Main elements: wrapper, header, `GroupsToolbar`, `GroupsTable`, `LiveRegion`.
- Handled interactions:
  - Change search query (debounced)
  - Change sort field/direction
  - Open/close Create Group modal, submit create
  - Inline rename group (PATCH)
  - Delete group (DELETE with confirmation)
  - Navigate to group details (View)
- Handled validation:
  - Group name must be non-empty and trimmed on create/rename
  - Show conflict (409) error for duplicate names
  - Respect API query constraints for `limit` (1–200) and `offset ≥ 0`
- Types:
  - Uses `GroupWithMetricsDto` from `src/types.ts`
  - New view types: `GroupSortField`, `GetGroupsRequestView`, `UseGroupsParams`, `UseGroupsResult`, `GroupRowView`
- Props: none (top-level view component)

### GroupsToolbar
- Component description: Controls for searching; action to trigger AI grouping.
- Main elements: search input; button for Group with AI.
- Handled interactions: onSearchChange, onGenerateAI.
- Handled validation: search input is free text; no validation other than debounce; ARIA labeling for input.
- Types: callbacks only.
- Props:
  - `search: string`
  - `onSearchChange: (value: string) => void`
  - `onGenerateAI: () => void`
  - `isGeneratingAI: boolean`

### GroupsTable
- Component description: Displays groups as a table; sorting is provided by the table headers; indicates sort state.
- Main elements: header row with sortable columns; body rows virtualized or simple list (≤200 per page) for performance; cells for name, ai badge, queryCount, impressions, clicks, CTR, avg position, createdAt, actions.
- Handled interactions: header clicks toggle sort (handled internally in table); inline rename; delete; navigate to details.
- Handled validation: name non-empty on rename; disable rename submit if invalid.
- Types: `GroupWithMetricsDto`, `GroupSortField`, `SortOrder`.
- Props:
  - `rows: GroupRowView[]`
  - `isLoading: boolean`
  - `onRename: (id: string, name: string) => Promise<void>`
  - `onDelete: (id: string) => Promise<void>`
  - `onView: (id: string) => void`

### GroupRowActions
- Component description: Row action buttons.
- Main elements: Edit (toggles inline editable name field), View (navigates), Delete (opens confirmation modal).
- Handled interactions: edit start/save/cancel; delete confirm/cancel; view.
- Handled validation: name non-empty on save.
- Types: callback signatures only.
- Props: `onRename(id, name)`, `onDelete(id)`, `onView(id)`

### GroupCreateModal
- Component description: Modal dialog (used in Queries view, not in Groups List) for creating a new manual group.
- Main elements: Input for name (with `aria-label`); list of selected queries to include; submit and cancel buttons.
- Handled interactions: submit create; close on success; trap focus using shadcn/ui `Dialog`.
- Handled validation: name required, trim; display 409 conflict errors; disable submit while loading.
- Types: `CreateGroupRequestDto` from `src/types.ts` plus a view prop for `queryTexts: string[]` to display.
- Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `onCreate: (payload: CreateGroupRequestDto) => Promise<void>`, `isSubmitting: boolean`, `error?: string`, `queryTexts: string[]`

### ConfirmationModal
- Component description: Generic confirmation modal for deletions.
- Main elements: message, confirm and cancel buttons; focus trap.
- Handled interactions: confirm delete; cancel.
- Handled validation: none.
- Types: none beyond props.
- Props: `open`, `title`, `description`, `confirmLabel`, `onConfirm`, `onCancel`, `isProcessing`

## 5. Types
- Existing (from `src/types.ts`):
  - `GroupWithMetricsDto`: `{ id: string; name: string; aiGenerated: boolean; queryCount: number; metrics: { impressions: number; clicks: number; ctr: number; avgPosition: number; }; createdAt?: string; }` (createdAt inferred from `GroupDto`)
  - `CreateGroupRequestDto`: `{ name: string; aiGenerated?: boolean }`
  - `UpdateGroupRequestDto`: `{ name?: string; aiGenerated?: boolean }`
  - `GetGroupsResponseDto`: `{ data: GroupWithMetricsDto[] }`
- New view types (frontend only):
  - `type GroupSortField = "name" | "createdAt" | "aiGenerated"`
  - `type GetGroupsRequestView = { search?: string; sortBy?: GroupSortField; order?: SortOrder; limit?: number; offset?: number; }`
  - `type GroupRowView = GroupWithMetricsDto & { createdAt?: string }`
  - `interface UseGroupsParams extends GetGroupsRequestView {}`
  - `interface UseGroupsResult { data: GroupWithMetricsDto[]; isLoading: boolean; error: Error | null; refetch: () => void; }`

## 6. State Management
- Local state in `GroupsPage`:
  - `search: string` (debounced 300ms via `useDebouncedValue`)
  - `limit: number` (default 50, clamped 1–200)
  - `offset: number` (default 0)
  - Row edit states: `editingId: string | null`, `isRenamingId: string | null`, `isDeletingId: string | null`
- Note: Creation modal state is not present on this view; creation is initiated from the Queries view.
- Custom hook `useGroups(params: UseGroupsParams): UseGroupsResult`
  - Mirrors `useQueries` pattern; builds query string; fetches `/api/groups` and parses `GetGroupsResponseDto`.
  - Handles 401/403 redirects or toasts; toasts for generic errors.
  - Exposes `refetch()` for post-mutation refresh.

## 7. API Integration
- Base endpoints (implemented server-side under `/api/groups`):
  - GET `/api/groups?search&sortBy&order&limit&offset`
    - Request: `GetGroupsRequestView`
    - Response: `GetGroupsResponseDto`
  - POST `/api/groups`
    - Request body: `CreateGroupRequestDto`
    - Response: `GroupWithMetricsDto` (201)
    - Errors: 400 validation, 409 duplicate name, 500
  - PATCH `/api/groups/:groupId`
    - Request body: `UpdateGroupRequestDto`
    - Response: `GroupWithMetricsDto` (200)
    - Errors: 400 validation, 404 not found, 409 duplicate name, 500
  - DELETE `/api/groups/:groupId`
    - Response: 204
    - Errors: 400 validation, 404 not found, 500
- Frontend actions:
  - Load list: call GET with current `search/sortBy/order/limit/offset`.
  - Create: POST; on success, close modal, toast success, `refetch()`.
  - Rename: PATCH; optimistic update optional; on success toast; on error revert, show error.
  - Delete: DELETE; on success close confirm, toast, `refetch()`.

## 8. User Interactions
- Search by name:
  - User types in search; value debounced to 300ms; triggers GET; shows “No groups found” when empty.
- Sort groups:
  - Clicking header toggles sort order for current field; handled by table; updates `aria-sort` and icons; triggers GET.
- Create group:
  - Not available on Groups List view. Creation is available from the Queries view only.
- Rename group:
  - Click Edit on row → name becomes editable with `aria-label="Group name"`; on blur or Enter → auto-commit via PATCH; revert on error.
- Delete group:
  - Click Delete → confirmation modal; confirm → DELETE; on success remove row; on error show toast.
- View group:
  - Click View → redirect to `/groups/{id}` (detail page) for full editing.

## 9. Conditions and Validation
- Search: case-insensitive partial match on `name` – enforced server-side; client simply passes `search`.
- Sorting: `sortBy ∈ {name, createdAt, aiGenerated}`, `order ∈ {asc, desc}`; client validates before sending; default `createdAt desc`.
- Pagination: `1 ≤ limit ≤ 200`, `offset ≥ 0` – clamp on client.
- Name rules:
  - Required, non-empty after `trim()`; enforce in `GroupCreateModal` and inline rename.
  - Display server 400 messages; map 409 to “Name already exists”.
- Accessibility:
  - Editable input has `aria-label`.
  - Modals use focus trap; restore focus to trigger on close.
  - `aria-live` polite region announces create, rename, delete success.
  - Sort headers set `aria-sort` correctly.

## 10. Error Handling
- Network/500: toast error “Failed to load groups”; keep existing data rendered, avoid full-screen blocker after first load.
- 401/403: toast “Authentication required” and redirect to `/login?returnUrl=/groups` (match pattern in `useQueries`).
- 400 validation: show inline field errors in modals; toast generic message.
- 404 on PATCH/DELETE: show toast “Group not found” and `refetch()`.
- 409 duplicate name: show inline message under name input; keep modal open; focus input.

## 11. Implementation Steps
1. Routing: create `src/pages/groups.astro` that imports `GroupsPage` and renders it within `Layout.astro`.
2. Types: add frontend-only `GroupSortField` union in view file or a local `src/types/groups.ts` (avoid modifying shared DTOs unless needed).
3. Hook: implement `src/hooks/useGroups.ts` mirroring `useQueries.ts` with `GetGroupsResponseDto` shape (`{ data: GroupWithMetricsDto[] }`).
4. Page shell: implement `src/components/groups/GroupsPage.tsx` managing state and wiring toolbar/table, using `useDebouncedValue` and `useGroups`.
5. Toolbar: implement `src/components/groups/GroupsToolbar.tsx` using shadcn/ui `Input`, `Select`, `Button`, reuse existing `GroupWithAIButton` from `src/components/queries/GroupWithAIButton.tsx`.
6. Create modal: implement `src/components/groups/GroupCreateModal.tsx` using shadcn/ui `Dialog`; wire POST call and validation.
7. Table: implement `src/components/groups/GroupsTable.tsx` using shadcn/ui `table` primitives; columns: Name, AI, Query Count, Impr., Clicks, CTR, Avg Pos., Created, Actions; header click toggles sort with icons and `aria-sort`.
8. Row actions: implement `src/components/groups/GroupRowActions.tsx`; inline rename input with save/cancel; `ConfirmationModal` for deletes.
9. Live region: reuse `src/components/queries/LiveRegion.tsx` to announce state changes.
10. API calls: implement light client helpers in `src/lib/groups/api.ts` (optional): `listGroups`, `createGroup`, `updateGroup`, `deleteGroup` using `fetch`.
11. Metrics formatting: reuse helpers from queries table (`formatNumber`, `CTR%` pattern) to ensure consistency.
12. Accessibility: verify inputs have `aria-label`, modals trap focus, headers expose `aria-sort`, buttons have accessible names.
13. Empty/loading states: add skeleton or simple text states consistent with queries UI (“Loading groups…”, “No groups found”).
14. QA performance: ensure sorting and search update within 500ms (debounce search, immediate UI updates for sort), page size ≤200.
15. Tests/manual checks: duplicate name handling (409), invalid name handling (400), not found on delete (404), and auth redirect behavior.
