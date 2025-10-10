-- migration: create groups table
-- purpose: stores user-created query groups (both manual and ai-generated)
-- affected tables: groups
-- special considerations:
--   - unified table for both manual and ai-generated groups
--   - groups are private to each user
--   - ai_generated flag distinguishes ai clusters from manual groups for analytics
--   - users create groups with ai_generated = true when accepting ai clustering suggestions

-- create groups table
create table groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- foreign key index for user lookups
-- optimizes queries that fetch all groups for a specific user
create index idx_groups_user_id on groups(user_id);

-- index for filtering ai-generated groups
-- useful for analytics to distinguish between manual and ai-generated groups
create index idx_groups_ai_generated on groups(ai_generated);

-- composite index for user's groups ordered by creation
-- optimizes the common pattern of fetching a user's groups sorted by creation date
create index idx_groups_user_created on groups(user_id, created_at desc);

-- enable row level security on groups table
-- ensures users can only access their own groups
-- alter table groups enable row level security;

-- rls policy: users can view only their own groups (both manual and ai-generated)
-- rationale: groups are private to each user
-- create policy "groups_select_own" 
-- on groups for select 
-- to authenticated 
-- using (auth.uid() = user_id);

-- rls policy: users can create their own groups (both manual and ai-generated)
-- rationale: users need to create groups manually or when accepting ai suggestions
-- create policy "groups_insert_own" 
-- on groups for insert 
-- to authenticated 
-- with check (auth.uid() = user_id);

-- rls policy: users can update their own groups (both manual and ai-generated)
-- rationale: users can rename or modify their groups
-- create policy "groups_update_own" 
-- on groups for update 
-- to authenticated 
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);

-- rls policy: users can delete their own groups (both manual and ai-generated)
-- rationale: users can remove groups they no longer need
-- create policy "groups_delete_own" 
-- on groups for delete 
-- to authenticated 
-- using (auth.uid() = user_id);

