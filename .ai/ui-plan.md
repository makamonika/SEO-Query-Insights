# UI Architecture for SEO Query Insights Dashboard (MVP)

## 1. UI Structure Overview

The application is a desktop-first, responsive dashboard that users reach after authentication. A persistent **App Shell** frame provides global navigation (collapsible side-bar) and utilities (top-bar). All feature screens render inside the shell’s main content area and exchange state through React Query caches and URL params. Mobile devices collapse the side-bar into a hidden drawer and substitute virtualized tables with paginated card lists.

```
┌──────────────────────────────────────────── App Shell ────────────────────────────────────────────┐
│ Top-Bar (user menu, dark-mode)                                                                    │
├────── Side-Bar (nav) ──────┬────────────────── Feature View (router outlet) ──────────────────────┤
│ • Queries                  │                                                                      │
│ • Groups                   │   e.g. Query Performance Dashboard                                   │
└────────────────────────────┴──────────────────────────────────────────────────────────────────────┘
```

Key cross-cutting concerns:
• **State Management** – React Query + URL query-string params for list state.
• **Accessibility** – ARIA roles (`navigation`, `grid`, `dialog`), keyboard support, high-contrast badges, visible focus.
• **Security** – `httpOnly` JWT cookies; axios/fetch interceptor refreshes tokens and redirects to `/login` on `401`.
• **Performance** – Virtualized rows (desktop), paginated cards (mobile), lazy data chunks (`limit`/`offset`).

## 2. View List

### 2.1 Auth (Login & Registration)

- **Path**: `/login` (login default) / `/register` (deep-link) – single component toggles views.
- **Purpose**: Authenticate existing users and register new ones.
- **Key Info**: 
  • Login: email, password, “Remember me” checkbox, error text.  
  • Registration: email, password, confirm password, error text, link back to login.
- **Components**: AuthForm (mode = login | register), SubmitButton, FormField, AuthToggleLink, ErrorToast.
- **Notes**: Client toggles between modes without route change (query param or local state); after successful registration user is auto-logged-in and redirected to `/queries`.

### 2.2 Query Performance Dashboard

- **Path**: `/queries`
- **Purpose**: Primary landing page; explore GSC query metrics (US-005 → US-008, US-020 → US-021).
- **Key Info**: Up-to-date status / import progress, last import date/time in PageHeader, virtualized table of queries with impressions, clicks, CTR, avg position, opportunity badge with row highlight for opportunity queries, Generate Groups with AI button, create a group button, queries with checkbox enabling adding them to a group manually.
- **Components**: PageHeader (ImportButton/DataStatusLabel, last import date/time), UnifiedToolbar (SearchInput, OpportunityToggle, ColumnSorters), QueriesTable (virtualized, with OpportunityBadge on qualifying rows), GroupWithAIButton, NewGroupButton, GroupCreateModal (opens when creating a new group from selected queries or when clicking a button).
- **UX & A11y**: `grid` semantics, row checkbox selection, live region for import status, skip-to-content link.
- **Security**: Requires auth; handles `401`.

### 2.3 Query Details Slide-Over (overlay component) // Out of scope for MVP

- **Path**: N/A (URL retains `/queries`; optional `?queryId=` param for deep-link).
- **Purpose**: Show metrics & URLs for one query;
- **Key Info**: Metrics card, list of URL metrics, add-to-group selector.
- **Components**: SlideOverPanel, MetricsTable.
- **Edge Cases**: Fallback message when additional URL data missing.

### 2.4 Groups List

- **Path**: `/groups`
- **Purpose**: Manage manual & AI groups (US-009 → US-014b).
- **Key Info**: Group cards/table with name, aiGenerated badge, queryCount, aggregated metrics, createdAt.
- **Components**: GroupsToolbar (SearchInput, ColumnSorters), GroupsTable, GroupRowActions (edit/view, delete → ConfirmationModal), NewGroupButton → GroupCreateModal, GroupWithAIButton
- **Accessibility**: Editable name field uses `aria-label`, modals trap focus.

### 2.5 Group Details

- **Path**: `/groups/:groupId`
- **Purpose**: View & edit a single group (US-010 → US-014).
- **Key Info**: Group header (name editable), aggregated metrics, member queries list with remove action.
- **Components**: EditableHeader, MetricsSummary, MemberQueriesTable, RemoveButton, Toasts.
- **Edge Cases**: Empty-state illustration when no queries.

### 2.6 AI Clusters Suggestions

- **Path**: `/ai-clusters`
- **Purpose**: Display on-demand clustering results; user may accept, edit, or discard (US-015 → US-019).
- **Key Info**: Cluster with name, query list and aggregated metrics preview; accept/edit/discard buttons.
- **Components**: ClustersToolbar (Regenerate), MetricsSummary, MemberQueriesTable, RemoveButton, EditClusterModal, ConfirmationModal.
- **Notes**: Ephemeral state held in React context until accept; “accept” mutation persists via `/ai-clusters/accept` then routes to `/groups`.


### 2.8 Error Pages

- **Paths**: `/404`, `/500`, `/rate-limited`
- **Purpose**: Friendly error handling and recovery routes.
- **Components**: DesignedErrorPage with illustration, back link.

## 3. User Journey Map

1. **Login** → `/queries` (dashboard auto-loads with latest data).
2. **Explore Queries**: search & filter, identify opportunities, multi-select rows.
3. **Group Creation**
   a. Manual – “Add to group” from a query level (to a new group or to an existing one)
   b. AI – “Group with AI” → redirects to `/ai-clusters` → review clusters → accept selected clusters → `/groups`.
   c. Manual - "Create a new group" -> create a new group with a name and items
4. **Group Management**: rename/delete via row actions; open group → edit membership.
5. **Import New Data**: Click ImportButton when stale → modal confirmation → label shows progress → on success, page cache invalidates & refetches.
6. **Logout**: User menu → logout → returns to `/login`.

## 4. Layout and Navigation Structure

Navigation resides in a **collapsible side-bar**:

| Icon | Label | Route | Badge |
|------|-------|-------|-------|
| 🔍 | Queries | `/queries` | `●` opportunity count (optional) |
| 📂 | Groups | `/groups` | – |


Utilities in the **top-bar**:
• Dark-mode toggle  • UserMenu (profile & logout)

The router uses nested layouts: `AppShellLayout` wraps all auth-protected routes. Lazy-loaded feature bundles improve first-paint.

Mobile: the side-bar hides behind a hamburger; top-bar gains a hamburger button; route content switches to card lists.

## 5. Key Components

| Component | Responsibility | Re-use |
|-----------|---------------|--------|
| AppShellLayout | Frame with side-bar & top-bar | All protected views |
| SideNav | Primary nav links with collapse state | AppShell |
| TopBar | User menu, theme toggle | AppShell |
| PageHeader | Hosts ImportButton/DataStatusLabel and Query view title | Queries |
| DataStatusLabel | Indicates “Data up-to-date” or running import spinner | PageHeader |
| ImportButton | Visible only when data stale or last import failed; opens confirmation modal then triggers import | PageHeader |
| GroupCreateModal | Modal to create a new group and assign selected queries | Queries, Groups |
| UnifiedToolbar | Search, filter, sort controls bound to URL params | Queries, Groups |
| QueriesTable | Virtualized grid of queries with selection | Queries |
| OpportunityBadge | Visible label for opportunity queries based on criteria | Queries |
| QuerySlideOver | Right-hand panel with query details | Queries |
| GroupsTable | List or cards of groups with actions | Groups |
| MetricsSummary | Aggregated impressions/clicks/CTR/position | Groups, GroupDetails, AI Clusters |
| ClusterCard | Visual representation of an AI cluster | AI Clusters |
| ModalDialog | Generic stacked modal with focus trap | delete, confirm |
| ToastProvider | Global transient notifications | AppShell |
| AuthForm | Reusable form supporting login & registration modes with validation | Auth |
| AuthToggleLink | Small link/button to switch between login and register | Auth |

## 6. Mapping Requirements to UI Elements

| PRD / User Story | UI Element(s) |
|------------------|----------------|
| FR-08 → FR-13, US-005 → US-008 | QueriesTable, UnifiedToolbar, QuerySlideOver |
| FR-14 → FR-21, US-009 → US-014b | GroupsTable, GroupDetails, InlineRename, ModalDialog |
| FR-22 → FR-28, US-015 → US-019 | AI Clusters view, ClusterCard, EditClusterModal, ConfirmationModal |
| FR-29 → FR-31, US-020 → US-021 | Opportunity badge styling, OpportunityToggle filter |
| FR-01 → FR-07, US-003 → US-004 | ImportButton, DataStatusLabel (in Queries dashboard) |
| FR-32 → FR-33, US-001 → US-002 | Login view, Auth interceptor |
| Performance targets | Virtualized tables, React Query caching |
| Accessibility targets | ARIA roles, keyboard support, focus rings |

## 7. Edge Cases & Error States

| Scenario | Handling |
|----------|----------|
| Import fails | ImportButton re-appears with error state, toast shows failure, user can retry |
| API `422` validation | Inline field errors under inputs, no modal shake |
| API `429` rate-limit | DesignedErrorPage `/rate-limited` with retry countdown |
| Lost auth (`401`) | Interceptor clears cookies & redirects to `/login` |
| No queries/data | Empty-state illustration with “Import data” call-to-action |
| Network offline | Toast “Offline mode”, React Query retry disabled |

## 8. Addressing User Pain Points

1. **Quick discovery of related queries** – AI Clusters & Groups views surface semantic clusters with acceptance workflow.
2. **High-volume data performance** – Virtualized lists and chunked API queries keep UI responsive under 10 k rows.
3. **Clarity of opportunity** – High-contrast badges and toggle filter highlight low-CTR/high-impression queries.
4. **Error transparency** – Inline validation and toasts communicate failures without blocking progress.
5. **Responsive workplace flexibility** – Tailwind breakpoints adapt layout to tablet/mobile, switching to cards for readability.

---

This architecture aligns every PRD requirement with navigable views and reusable components, leverages the defined REST API, and embeds performance, accessibility, and security best practices throughout the UX.
