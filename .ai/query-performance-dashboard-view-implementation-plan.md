# View Implementation Plan – Query Performance Dashboard

## 1. Overview
A data-rich landing view for exploring Google Search Console (GSC) query metrics. Users can import the latest data, search/filter/sort up to 10,000 queries, identify opportunity queries, select queries and create groups, and generate AI cluster suggestions to convert into groups.

## 2. View Routing
- Path: `/queries`
- Requires auth. If a `401` occurs on any API call, redirect to login and announce via an aria-live region.

- Scope note: This view supports quick-create groups from selected queries. Full group management (rename/delete, deep metrics, members) is owned by Groups views at `/groups` and `/groups/:groupId`. `GroupCreateModal` and the groups API layer are shared across views.
  Additionally, AI clustering is initiated here (GET `/api/ai-clusters`) and the user is routed to `/ai-clusters` for review. Suggestions are stored ephemerally (e.g., context or navigation state).

## 3. Component Structure
- `src/pages/queries.astro` (page shell)
  - `PageHeader` (import status, last import date/time)
    - `ImportButton`
    - `DataStatusLabel`
  - `UnifiedToolbar`
    - `SearchInput`
    - `OpportunityToggle`
    - `ColumnSorters`
    - `GroupWithAIButton`
    - `NewGroupButton`
  - `QueriesTable` (virtualized grid with row selection and `OpportunityBadge`)
  - `GroupCreateModal` (portal)
  - `LiveRegion` (visually hidden, for import status and error announcements)

## 4. Component Details
### PageHeader
- Component description: Displays import status and last import time.
- Main elements: heading, `DataStatusLabel`, `ImportButton`.
- Handled interactions: Click import triggers synchronous import run; announces progress; refreshes table data on success.
- Validation: Disable import during an active run; show retry on failure.
- Types: `ImportRunResultDto`.
- Props: `{ lastImportAt?: string; isImporting: boolean; onImport: () => Promise<void>; statusMessage?: string }`.

### ImportButton
- Description: Triggers POST `/api/import` and blocks UI until completion (MVP).
- Elements: Button with spinner state.
- Events: `onClick` → `onImport()`.
- Validation: Disabled when `isImporting`.
- Types: `ImportRunResultDto`.
- Props: `{ isImporting: boolean; onImport: () => void }`.

### DataStatusLabel
- Description: Shows last import date/time and status.
- Elements: Label, timestamp.
- Validation: If timestamp missing, show “No imports yet”.
- Types: none (string props).
- Props: `{ lastImportAt?: string; status?: "idle" | "running" | "completed" | "failed" }`.

### UnifiedToolbar
- Description: Search/filter/sort controls + actions.
- Elements: text input, toggle, select(s), action buttons.
- Events:
  - `onSearchChange(value)` debounced 300ms
  - `onOpportunityToggle(checked)`
  - `onSortChange({ sortBy, order })`
  - `onOpenNewGroup()`
  - `onGenerateAI()`
- Validation: Apply within 500ms; show current sort indicator.
- Types: request query params: `GetQueriesRequestDto` fields `search`, `isOpportunity`, `sortBy`, `order`.
- Props: `{ valueSearch: string; isOpportunity?: boolean; sortBy: QuerySortField; order: SortOrder; onSearchChange: (v: string) => void; onOpportunityToggle: (v: boolean) => void; onSortChange: (p: { sortBy: QuerySortField; order: SortOrder }) => void; onOpenNewGroup: () => void; onGenerateAI: () => void }`.

### QueriesTable
- Description: Virtualized table (grid semantics) for up to 10k rows.
- Elements: table header + virtualized body; row checkbox; `OpportunityBadge`.
- Events:
  - Row checkbox toggle → updates selected query texts
  - Header checkbox → select/deselect visible page
  - Column header click → sort
- Validation: Respect filters/sort; opportunity rows visually highlighted.
- Types: `GetQueriesResponseView` (VM), derived from `QueryDto`.
- Props: `{ rows: QueryRowVM[]; isLoading: boolean; selected: Set<string>; onToggleRow: (queryText: string) => void; onToggleAllVisible: (queryTexts: string[]) => void; sortBy: QuerySortField; order: SortOrder; onSortChange: (p: { sortBy: QuerySortField; order: SortOrder }) => void }`.

### OpportunityBadge
- Description: Pill shown when `isOpportunity` is true.
- Elements: span with icon.
- Events: none.
- Validation: Shown only if `isOpportunity`.
- Types: none.
- Props: `{ isOpportunity: boolean }`.

### GroupWithAIButton
- Description: Initiates AI clustering via `GET /api/ai-clusters` and then navigates to `/ai-clusters` for review.
- Elements: button with progress state.
- Events: `onClick` → call generation; announce progress via live region; on success, store suggestions in ephemeral state (context or navigation state) and navigate to `/ai-clusters`.
- Validation: Disable while generating; surface rate limit or server errors.
- Types: `AiClusterSuggestionDto[]`.
- Props: `{ onGenerate: () => Promise<void>; isGenerating: boolean }`.

### NewGroupButton
- Description: Opens `GroupCreateModal` for manual group creation (optionally with selected queries).
- Elements: button.
- Events: `onClick` → open modal.
- Validation: Disabled if no selection and creating empty groups is disallowed; MVP allows empty.
- Types: `CreateGroupRequestDto` for POST `/api/groups`, then optionally POST `/api/groups/:id/items` with `AddGroupItemsRequestDto`.
- Props: `{ disabled?: boolean; onClick: () => void }`.
  - Note: This is a quick-create entry point on `/queries`. Further edits (rename/delete, members management) happen in Groups views.

### GroupCreateModal
- Description: Dialog for naming group and confirming items to add.
- Elements: name input, selected queries list preview (truncated), submit/cancel.
- Events:
  - Submit: POST `/api/groups` then optionally POST `/api/groups/:id/items`
  - Cancel: close modal
- Validation:
  - Name required, non-empty
  - Deduplicate query texts client-side before sending
- Types: `CreateGroupRequestDto`, `GroupWithMetricsDto`, `AddGroupItemsRequestDto`.
- Props: `{ isOpen: boolean; defaultName?: string; selectedQueryTexts: string[]; onClose: () => void; onCreated?: (group: GroupWithMetricsDto) => void }`.
  - Note: Place component at `src/components/groups/GroupCreateModal.tsx` and reuse in `/groups` routes. After success, show toast with link to `/groups/:id`; navigation is optional on `/queries` but default in `/groups`.

### LiveRegion
- Description: Visually hidden `aria-live="polite"` container for async status/errors (import, auth, generation).
- Props: `{ message?: string }`.

## 5. Types
- Uses existing DTOs from `src/types.ts`:
  - `QueryDto`, `GetQueriesRequestDto`, `GetQueriesResponseDto`
  - `GroupWithMetricsDto`, `CreateGroupRequestDto`, `AddGroupItemsRequestDto`
  - `AiClusterSuggestionDto`, `AcceptClustersRequestDto`, `AcceptClustersResponseDto`
  - `ImportRunResultDto`, `ErrorResponse`
- New ViewModel types:
  - `QueryRowVM`:
    - `id: string`
    - `queryText: string`
    - `url: string`
    - `impressions: number`
    - `clicks: number`
    - `ctr: number` (0-1)
    - `avgPosition: number`
    - `isOpportunity: boolean`
  - `GetQueriesResponseView`:
    - `rows: QueryRowVM[]`
    - `meta: { total: number; limit: number; offset: number }`

## 6. State Management
- Local component state with React hooks inside the page’s main client component.
- Core state:
  - `search: string` (debounced)
  - `isOpportunity?: boolean`
  - `sortBy: QuerySortField` (default `impressions`)
  - `order: SortOrder` (default depends on `sortBy`)
  - `limit: number` (e.g., 100)
  - `offset: number`
  - `selected: Set<string>` (query texts)
  - `isImporting: boolean`, `importMessage?: string`, `lastImportAt?: string`
  - `isGeneratingAI: boolean`
  - `isCreateModalOpen: boolean`
- Custom hooks:
  - `useDebouncedValue(value, delay)` for search (300ms)
  - `useQueries(params)` fetcher keyed by `{ search, isOpportunity, sortBy, order, limit, offset }`
  - `useSelection()` utilities for select/deselect visible

## 7. API Integration
- Queries: `GET /api/queries?search&isOpportunity&sortBy&order&limit&offset`
  - Request type: `GetQueriesRequestDto`
  - Response type: `GetQueriesResponseDto` (array) + meta in spec. Since backend currently returns array only, compute `meta.total` client-side by tracking last known total length if provided; MVP: infer total from response length for visible window and show “approx.” counts.
  - Handle `401` by redirecting to login.
- Import: `POST /api/import`
  - Response: `ImportRunResultDto`
  - Block UI during run; on success, refresh queries and update `lastImportAt` using `completedAt`.
- Groups:
  - `POST /api/groups` with `CreateGroupRequestDto` → `GroupWithMetricsDto`
  - `POST /api/groups/:groupId/items` with `{ queryTexts: string[] }` → returns `{ addedCount: number, duplicatesCount: number, totalInGroup: number }`
- AI Clusters:
  - This view initiates generation by calling `GET /api/ai-clusters`, stores suggestions ephemerally (context or navigation state), then navigates to `/ai-clusters` for review and acceptance.

## 8. User Interactions
- Search typing debounced → refresh table.
- Toggle “Opportunities only” → refresh table, show count.
- Sort header click → toggle order; refresh.
- Row checkbox → update selection.
- Header checkbox → select/deselect visible.
- Click “Import Data” → run import; live announce progress; refresh on success.
- Click “Generate Groups with AI” → generate; announce progress; show result count or navigate.
- Click “Create Group” → open modal; submit to create group; optionally add selected queries; confirm via toast; clear selection.

## 9. Conditions and Validation
- Apply filters and sorting within 500ms from interaction (debounce/throttle network calls).
- Prevent concurrent import requests (disable button while running).
- Group name must be non-empty; trim input.
- Only send unique, lowercased `queryTexts` to group-items endpoint.
- Opportunity highlighting: show badge and row highlight when `isOpportunity`.
- Grid A11y: `role="grid"`, rows `role="row"`, headers `role="columnheader"` with `aria-sort`, cells `role="gridcell"`.
- Provide a “Skip to content” link at the top to jump to the grid container.
- Live region updates for import status and error messages.

## 10. Error Handling
- Network/API errors: show toast + live region message with context (action, status code, message).
- `401 Unauthorized`: redirect to login; preserve return URL; live announce.
- Import failure: show retry button; keep previous data intact.
- Group creation name conflict (`409`): surface inline error under name field.
- Add items: if group not found (`404`), show error and close modal; for duplicates, show “0 added” success.
- AI cluster generation failure (`500` or rate-limit): show error and allow retry.

## 11. Implementation Steps
1. Create route `src/pages/queries.astro` with a single client:visible React root component `QueriesPage`.
2. Implement `QueriesPage` layout: `PageHeader`, `UnifiedToolbar`, `QueriesTable`, `GroupCreateModal`, `LiveRegion`.
3. Build `useDebouncedValue` and `useQueries` hooks. Wire search/toggle/sort/limit/offset state.
4. Implement virtualized `QueriesTable` using a headless virtualization lib; add grid roles, header sort controls, row selection.
5. Implement `PageHeader` with `ImportButton` and `DataStatusLabel`; wire `POST /api/import` and aria-live updates.
6. Implement `UnifiedToolbar` with search, opportunity toggle, sort controls; wire to state and re-fetch within 500ms.
7. Implement `GroupCreateModal` in `src/components/groups/GroupCreateModal.tsx`: form validation, `POST /api/groups`, then `POST /api/groups/:id/items` when selection non-empty; success toasts and callbacks. Reuse the same component in `/groups` views for consistency.
8. Implement `GroupWithAIButton`: call `GET /api/ai-clusters`, handle loading/errors, store suggestions ephemerally, then navigate to `/ai-clusters` for review.
9. Add skip-to-content link bound to the grid container; ensure keyboard focus management for modal open/close and import completion.
10. Add error handling pathways for 400/401/409/500 with toasts and live region messages; redirect on 401.
11. Add unit tests for hooks and utils; smoke-test rendering 10k rows in virtualization config; verify interaction response <500ms.
