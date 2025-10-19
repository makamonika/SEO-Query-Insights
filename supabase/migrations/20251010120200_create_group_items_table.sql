-- migration: create group_items table
-- purpose: junction table linking groups to specific query records
-- affected tables: group_items
-- special considerations:
--   - group items reference specific query records (query_text + url + date combination)
--   - foreign key ensures referential integrity
--   - cascade delete removes group items when queries are deleted
--   - aggregated metrics computed on-the-fly by joining with queries table

-- create group_items table
create table group_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  query_id uuid not null references queries(id) on delete cascade,
  added_at timestamptz not null default now()
);

-- unique constraint to prevent duplicate queries in the same group
create unique index idx_group_items_unique_group_query on group_items(group_id, query_id);

-- foreign key index for group lookups
-- optimizes queries that fetch all items for a specific group
create index idx_group_items_group_id on group_items(group_id);

-- foreign key index for query lookups
-- optimizes queries that fetch all groups containing a specific query
create index idx_group_items_query_id on group_items(query_id);

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

