```markdown
<conversation_summary>
<decisions>
1. Post-login landing view will be the Query Performance Dashboard (`/queries`) with a compact “Data up-to-date” status label in the top-bar or a button enabling importing data (if it's not been updated for this day yet); during imports this label morphs into “Importing…​” with a spinner. If success - show quickly a success status and get back to "data up-to-date" label. If failed, show error message and get back to the import button again.
2. Global navigation will use a collapsible left side-bar (Queries, Groups, AI Clusters, Imports) with user actions (profile, logout, dark-mode toggle) in the top-bar.
3. Queries view will implement virtualized scrolling that loads 1 k-row chunks via `limit`/`offset`, plus:
   • unified toolbar with search, opportunity filter, column-header sorts
   • prominent “Group with AI” button above the table to trigger `/ai-clusters`.
4. Groups view lists manual and AI-generated groups together, flagged by an `aiGenerated` badge; header provides name/date/aigenerated sorting, name search and “Generate AI Clusters” button (secondary placement).
5. CRUD edits (rename group, delete group, discard AI cluster) and confirmations use simple modal dialogs (yes/no for destructive actions).
6. Query row click opens a right-hand slide-over panel showing query metrics and all related URL metrics; supports quick “Add to group”.
7. JWT handling: login form includes “Remember me”; tokens stored in `httpOnly` cookies, refreshed via `/auth/refresh` interceptor; redirect to `/login` on 401.
8. Error handling: inline field errors (`422`) in modals, toast notifications for transient/server errors; modal save buttons disabled while pending (no header shake).
9. Responsiveness: three Tailwind breakpoints (desktop ≥1280 px, tablet 768-1279 px, mobile <768 px). On mobile the Queries list switches to paginated cards (100 per page) instead of virtualization.
10. Accessibility: keyboard-navigable tables, ARIA `grid` roles, high-contrast opportunity badges, visible focus rings; dark-mode toggle implemented via Tailwind `dark` class.
</decisions>

<matched_recommendations>
1. Compact top-bar status label with spinner for import progress and success/error states.  
2. Collapsible left side-bar primary navigation with top-bar utilities.  
3. React-Query powered virtualized Queries table with cached page windows.  
4. Unified toolbar (search + filter + sort) bound to API query params.  
5. Inline error display beneath fields in modal forms for API validation errors.  
6. Slide-over Query Details panel fetching extra data from a `/queries/{id}` endpoint.  
7. “Group with AI” outlined button above Queries list; duplicate button in Groups view.  
8. Modal-based edits for rename/delete/confirm actions.  
9. Tailwind breakpoint strategy and card-layout fallback on mobile.  
10. JWT storage in `httpOnly` cookies with refresh interceptor and login “Remember me”.
</matched_recommendations>

<ui_architecture_planning_summary>
The MVP UI will center on a desktop-first dashboard, built with Astro 5 + React 19, Tailwind 4, and Shadcn/ui components. After authentication the user lands on the Query Performance Dashboard, which shows up-to-date status and import progress directly in the top-bar. Global navigation lives in a collapsible side-bar, while contextual actions (refresh, AI grouping) appear in view-level toolbars.

Key screens & flows  
• Login → Dashboard (`/queries`)  
• Dashboard → multi-select rows → “Add to group” or “Group with AI” → Groups view  
• Queries row click → Slide-over details panel (metrics + URLs)  
• Groups view → rename, delete, or open group → see aggregated metrics  
• Top-bar status → initiate import → real-time progress → success/error feedback

API & state management  
Data fetching uses React Query. Queries list loads in 1 k-row chunks with virtualization; mobile switches to card pagination. Mutations (add queries to group, accept AI clusters, rename/delete group) employ optimistic updates keyed to `/groups` cache. Error & auth interceptors handle `401`, `422`, `429`, and map them to inline or toast feedback.

Responsiveness, accessibility, security  
Tailwind breakpoints ensure adaptive layout; ARIA roles and keyboard traversal make tables accessible. Dark-mode toggle leverages Tailwind’s `dark` variant. Security relies on `httpOnly` JWT cookies with refresh logic; rate-limit messaging will be designed later.

</ui_architecture_planning_summary>
</conversation_summary>
```