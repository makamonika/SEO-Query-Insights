-- migration: create group_items table
-- purpose: junction table linking groups to query texts (normalized)
-- affected tables: group_items
-- special considerations:
--   - query_text stored in lowercase for consistency
--   - groups attach to query text only, not specific urls
--   - aggregated metrics computed on-the-fly by joining with queries table
--   - no foreign key constraint to queries table (soft relationship via text matching)

-- create group_items table
create table group_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  query_text text not null,
  added_at timestamptz not null default now()
);

-- unique constraint for group and query text (case-insensitive)
-- prevents duplicate query texts within the same group
create unique index idx_group_items_unique_group_query on group_items(group_id, lower(query_text));

-- foreign key index for group lookups
-- optimizes queries that fetch all items for a specific group
create index idx_group_items_group_id on group_items(group_id);

-- index for query text lookups (joining with queries table)
-- optimizes joins between group_items and queries table for metric aggregation
create index idx_group_items_query_text on group_items(lower(query_text));

-- enable row level security on group_items table
-- ensures users can only access items in their own groups
-- alter table group_items enable row level security;

-- rls policy: users can view items in their own groups (both manual and ai-generated)
-- rationale: access to group_items is controlled through group ownership
-- create policy "group_items_select_own" 
-- on group_items for select 
-- to authenticated 
-- using (
--   exists (
--     select 1 from groups 
--     where groups.id = group_items.group_id 
--     and groups.user_id = auth.uid()
--   )
-- );

-- rls policy: users can add items to their own groups (both manual and ai-generated)
-- rationale: users can add queries to groups they own, including when accepting ai suggestions
-- create policy "group_items_insert_own" 
-- on group_items for insert 
-- to authenticated 
-- with check (
--   exists (
--     select 1 from groups 
--     where groups.id = group_items.group_id 
--     and groups.user_id = auth.uid()
--   )
-- );

-- rls policy: users can delete items from their own groups (both manual and ai-generated)
-- rationale: users can remove queries from groups they own
-- create policy "group_items_delete_own" 
-- on group_items for delete 
-- to authenticated 
-- using (
--   exists (
--     select 1 from groups 
--     where groups.id = group_items.group_id 
--     and groups.user_id = auth.uid()
--   )
-- );

-- note: no update policy as items are added/removed, not modified

