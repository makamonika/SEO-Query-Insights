# View Implementation Plan — AI Clusters Suggestions

## 1. Overview
The AI Clusters Suggestions view lets users generate, review, edit, accept, or discard AI-suggested query clusters. Suggestions are ephemeral (client-only) until users accept them, at which point the selected clusters are persisted as groups and the user is redirected to `/groups`.

This view fulfills US-015 through US-019 from the PRD and integrates with the following endpoints:
- GET `/api/ai-clusters` — generate suggestions (stateless)
- POST `/api/ai-clusters/accept` — persist selected clusters as user groups

## 2. View Routing
- Path: `/ai-clusters`
- Astro page: `src/pages/ai-clusters.astro`
  - Provides layout and mounts a React entry component for the interactive experience

## 3. Component Structure
- `src/pages/ai-clusters.astro`
  - `AIClustersProvider` (React context; ephemeral state)
    - `ClustersPage` (entry component)
      - `LiveRegion` (status updates) — reuse `src/components/queries/LiveRegion.tsx`
      - `ClustersToolbar` (Regenerate suggestions, Accept selected) — reuse `src/components/queries/GroupWithAIButton.tsx` for the regenerate action
      - `ClustersList` (grid/list of cluster cards)
        - `ClusterCard` (per cluster)
          - `EditableHeader` (rename cluster) — reuse `src/components/groups/EditableHeader.tsx` via thin wrapper
          - `MetricsSummary` (aggregated metrics) — reuse `src/components/groups/MetricsSummary.tsx`
          - `MemberQueriesTable` (list of queries in cluster) — reuse `src/components/queries/QueriesTable.tsx` in read-only mode with optional actions
          - `ClusterActions` (Edit, Remove/Discard)
      - `EditClusterModal` (modify name and membership) — reuse `src/components/groups/AddQueriesToGroupModal.tsx` adapted for clusters
      - `ConfirmationModal` (confirm discard) — reuse `src/components/groups/ConfirmDialog.tsx`

### Reused Components
- `QueriesTable` for rendering member queries lists.
- `GroupWithAIButton` for the Regenerate CTA.
- `ConfirmDialog` for discard confirmation.
- `EditableHeader` for inline cluster renaming.
- `LiveRegion` for ARIA updates.
- `MetricsSummary` for stats.
- `AddQueriesToGroupModal` as the base for `EditClusterModal` (name + membership edits).

## 4. Component Details
### AIClustersProvider
- Component description: React context provider storing ephemeral cluster suggestions and related actions (generate, edit, remove, accept). State is lost on navigation or refresh by design (MVP).
- Main elements: React context + reducer/state; provides value via Context API.
- Handled interactions:
  - Load/generate suggestions
  - Update cluster name
  - Add/remove query IDs from a cluster
  - Discard cluster
  - Accept selected clusters
- Handled validation:
  - Ensure cluster name is non-empty (<=120 chars)
  - Ensure cluster has at least 1 query before accept
- Types:
  - `AiClusterSuggestionDto`, `AcceptClusterDto`, `AcceptClustersRequestDto`, `AcceptClustersResponseDto`
  - `AIClusterViewModel`, `AIClustersContextValue`
- Props: none (provider supplies context to descendants)

### ClustersPage
- Component description: Page-level orchestration. Shows toolbar, list, and modals; wires context to UI.
- Main elements: header/title, `ClustersToolbar`, `ClustersList`, `LiveRegion`, modals.
- Handled interactions: kickoff generation on mount (optional), open edit modal, discard confirmation, accept.
- Validation: disables accept when no valid clusters are selected; surfaces errors via toasts and ARIA live region.
- Types: uses context types and `AiClusterSuggestionDto`.
- Props: none (consumes context)

### ClustersToolbar
- Component description: Actions to regenerate suggestions and accept selected clusters.
- Main elements: `GroupWithAIButton` for regenerate + secondary `Button` for Accept.
- Handled interactions:
  - Regenerate: calls GET `/api/ai-clusters`, replaces context state
  - Accept Selected: validates and POSTs accepted clusters, then routes to `/groups`
- Validation:
  - Block clicking Accept if none selected or any selected invalid (empty name or 0 members)
- Types: `AcceptClustersRequestDto`
- Props:
  - `selectedClusterIds: string[]`
  - `onRegenerate: () => Promise<void>`
  - `onAcceptSelected: () => Promise<void>`
  - `isGenerating: boolean`
  - `isAccepting: boolean`

### ClustersList
- Component description: Grid/list of `ClusterCard`s with selection.
- Main elements: responsive grid using Tailwind; checkbox for select-all and per-card selection.
- Handled interactions: select/deselect cluster(s), open edit modal, discard cluster.
- Validation: N/A (selection only).
- Types: `AIClusterViewModel`
- Props:
  - `clusters: AIClusterViewModel[]`
  - `selected: Set<string>`
  - `onToggleSelect: (id: string) => void`
  - `onOpenEdit: (id: string) => void`
  - `onDiscard: (id: string) => void`

### ClusterCard
- Component description: Shows one cluster: name (editable), metrics, query list, action buttons.
- Main elements: card container; `EditableHeader` (reused) for name; `MetricsSummary`; `QueriesTable` (reused) as member list; action buttons.
- Handled interactions: inline rename, open edit dialog, discard, toggle selection.
- Validation: inline rename constrained to 1–120 characters; debounced save into context.
- Types: `AIClusterViewModel`, `GroupMetricsDto`, `QueryDto`
- Props:
  - `cluster: AIClusterViewModel`
  - `isSelected: boolean`
  - `onToggleSelect: () => void`
  - `onOpenEdit: () => void`
  - `onDiscard: () => void`
  - `onRename: (name: string) => void`

### MemberQueriesTable (reused `QueriesTable`)
- Component description: Table of queries in the cluster using existing `QueriesTable` in non-selectable or action-enabled mode.
- Main elements: `QueriesTable` with `renderActions` to support per-row Remove; local sort state per card.
- Handled interactions: optional remove row from cluster.
- Validation: ensure remove updates metrics and count.
- Types: `QueryDto`
- Props:
  - `queries: QueryDto[]`
  - `onRemove?: (queryId: string) => void`

### ClusterActions
- Component description: Button group for Edit and Discard.
- Main elements: Shadcn/ui `Button`, `DropdownMenu` (optional), `Trash` icon.
- Handled interactions: open edit modal; trigger discard flow.
- Validation: none; guard via confirmation.
- Types: none new
- Props:
  - `onEdit: () => void`
  - `onDiscard: () => void`

### EditClusterModal (reused `AddQueriesToGroupModal`)
- Component description: Dialog to adjust membership using existing `AddQueriesToGroupModal` plumbing; optionally pair with a simple name input above the modal or inline rename via `EditableHeader`.
- Main elements: reuse `AddQueriesToGroupModal` to search and add queries; pass `existingQueryIds` from the cluster; use its `onAdd` to append to `queryIds`. Rename handled inline by `EditableHeader` or an extra small input field within the modal header.
- Handled interactions: rename; remove items; optional add items by search.
- Validation:
  - Name: 1–120 chars
  - At least 1 query required to save
- Types: `QueryDto`
- Props:
  - `open: boolean`
  - `cluster: AIClusterViewModel | null`
  - `onClose: () => void`
  - `onSave: (changes: { name: string; queryIds: string[] }) => void`

### ConfirmationModal (reused `ConfirmDialog`)
- Component description: Confirm discard of cluster using existing `ConfirmDialog`.
- Main elements: `ConfirmDialog` with `title`, `description`, `confirmLabel: "Discard"`.
- Handled interactions: confirm discard or cancel.
- Validation: none.
- Props:
  - `open: boolean`
  - `title: string`
  - `description?: string`
  - `onConfirm: () => void`
  - `onCancel: () => void`

### LiveRegion
- Component description: ARIA live region for async status updates.
- Main elements: visually hidden region; status messages for generation/accept-errors/success.
- Handled interactions: none (programmatic updates).
- Props:
  - `message: string`

## 5. Types
Existing DTOs (from `src/types.ts`):
- `AiClusterSuggestionDto` { name: string; queryIds: string[]; queryCount: number; metrics: GroupMetricsDto }
- `AcceptClusterDto` { name: string; queryIds: string[] }
- `AcceptClustersRequestDto` { clusters: AcceptClusterDto[] }
- `AcceptClustersResponseDto` { groups: GroupWithMetricsDto[] }
- `GroupWithMetricsDto` { ...; queryCount: number; metrics: GroupMetricsDto }
- `GroupMetricsDto` { impressions: number; clicks: number; ctr: number; avgPosition: number }
- `QueryDto`

New view types:
- `AIClusterViewModel` — client-only enriched model for UI
  - `id: string` (generated client-side key, e.g., stable hash of `name + queryIds.sort().join()` or UUID)
  - `name: string`
  - `queryIds: string[]`
  - `queryCount: number`
  - `metrics: GroupMetricsDto`
  - `queries?: QueryDto[]` (optional resolved details for table; can be derived from a `queriesById` map)
  - `isDirty?: boolean` (name/members changed)

- `AIClustersContextValue`
  - `clusters: AIClusterViewModel[]`
  - `selectedIds: Set<string>`
  - `isGenerating: boolean`
  - `isAccepting: boolean`
  - `generate: () => Promise<void>`
  - `setClusters: (clusters: AIClusterViewModel[]) => void`
  - `toggleSelect: (id: string) => void`
  - `selectAll: () => void`
  - `clearSelection: () => void`
  - `rename: (id: string, name: string) => void`
  - `removeQueryFromCluster: (id: string, queryId: string) => void`
  - `addQueriesToCluster: (id: string, newIds: string[]) => void`
  - `discard: (id: string) => void`
  - `acceptSelected: () => Promise<void>`

## 6. State Management
- Use `AIClustersProvider` with `useReducer` or `useState` to store:
  - `clusters: AIClusterViewModel[]`
  - `selectedIds: Set<string>`
  - `isGenerating`, `isAccepting`
  - `liveMessage` for `LiveRegion`
- Ephemeral lifecycle: state is reset when leaving `/ai-clusters`.
- Optional `beforeunload` warning if state is dirty and user tries to navigate away.
- Reuse `useAIClusters` to call GET `/api/ai-clusters` and update provider; extend it to accept a callback that writes into context and navigates to `/ai-clusters` if invoked from elsewhere.

## 7. API Integration
- Generate suggestions
  - Request: GET `/api/ai-clusters`
  - Response: `AiClusterSuggestionDto[]`
  - Client handling:
    - Set `isGenerating=true`; update `liveMessage` to "Generating AI clusters..."
    - On 200: map to `AIClusterViewModel[]` (create `id`), store in context, show success toast like "Generated N cluster suggestions"; `liveMessage` mirrors
    - On 401: toast + redirect to `/login?returnUrl=/ai-clusters`
    - On 429: toast error "Rate limited. Try again in a minute."
    - On error: toast error + set `liveMessage`

- Accept clusters
  - Request: POST `/api/ai-clusters/accept`
  - Body: `AcceptClustersRequestDto`
  - Response: `AcceptClustersResponseDto`
  - Client handling:
    - Validate selected clusters before request (name 1–120 chars; at least 1 query)
    - Set `isAccepting=true`
    - On 200: toast success with created group count; navigate to `/groups`
    - On 401: toast + redirect to `/login`
    - On 400: surface validation details; highlight invalid clusters
    - On error: toast error

- Query resolution for tables (optional): use already loaded global dataset if present or fetch by IDs via existing `/api/queries` (filter client-side). For MVP, we can render counts/metrics without fetching per-query details if not strictly necessary.

## 8. User Interactions
- Regenerate suggestions
  - Click Regenerate → calls GET, replaces clusters, clears selection
- Select clusters
  - Click card checkbox; toolbar shows selected count; Accept button enabled when valid
- Rename cluster
  - Inline `EditableHeader` or via `EditClusterModal` → updates context; validates constraints
- Edit membership
  - In modal remove items or add by search; updates queryIds, queryCount, and metrics; marks cluster dirty
- Discard cluster
  - Click Discard → `ConfirmationModal` → remove from context on confirm
- Accept selected
  - Validates; POST to accept; on success redirect to `/groups`

## 9. Conditions and Validation
- Name: required, 1–120 chars; trimmed
- Membership: at least one `queryId` required for acceptance
- When invalid:
  - Disable Accept button if any selected cluster invalid
  - Show inline error states next to name inputs
  - In modal, prevent Save until valid

## 10. Error Handling
- 401 Unauthorized: toast + redirect to `/login?returnUrl=/ai-clusters`
- 429 Rate limited: toast descriptive message; disable regenerate briefly
- Network/server errors (500): toast error; keep existing suggestions in state
- Empty suggestions: show empty state with CTA to Regenerate
- Navigation away: optional confirm if there are unaccepted suggestions with edits
- Data mismatches: if a `queryId` not found locally for table, show it in a fallback row with ID only

## 11. Implementation Steps
1. Create `src/pages/ai-clusters.astro` mounting `ClustersPage` inside `Layout.astro`.
2. Implement `AIClustersProvider` in `src/hooks/useAIClustersSuggestions.tsx` or `src/components/ai-clusters/context.tsx` (prefer hooks dir for logic), exporting context + provider + hook.
3. Extend `useAIClusters` to accept a callback to inject suggestions into provider, and to navigate to `/ai-clusters` after generation when invoked outside.
4. Build `ClustersPage` in `src/components/ai-clusters/ClustersPage.tsx` wiring provider, toolbar, list, modals, and `LiveRegion` (reused component).
5. Implement `ClustersToolbar` using `GroupWithAIButton` for regenerate and a secondary `Button` for Accept Selected; show selected count; wire to provider.
6. Implement `ClustersList` and `ClusterCard` reusing `EditableHeader`, `MetricsSummary`, and `QueriesTable` (via `MemberQueriesTable`) with `renderActions` to remove items. Add selection checkbox.
7. Implement `EditClusterModal` by reusing `AddQueriesToGroupModal`; pass `existingQueryIds`, wire `onAdd` to append IDs; handle rename via `EditableHeader` inline or a small name input in the modal header.
8. Implement `ConfirmationModal` by reusing `ConfirmDialog` with `confirmLabel="Discard"`.
9. Wire API calls:
   - GET `/api/ai-clusters` (use provider action)
   - POST `/api/ai-clusters/accept` using selected clusters transformed to `AcceptClustersRequestDto`
10. Add ARIA/Accessibility:
    - `LiveRegion` updates, button `aria-busy` states, dialog focus management
11. Add empty state UI and loading skeletons for generation.
12. Add toasts for success/failure using `sonner` and ensure errors are human-friendly.
13. QA against user stories US-015 → US-019; verify redirects and state loss after accept.
14. Lint and ensure no type errors; keep components within the documented directory structure.
