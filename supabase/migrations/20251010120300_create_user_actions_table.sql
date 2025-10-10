-- migration: create user_actions table
-- purpose: tracks user actions for analytics and success metrics
-- affected tables: user_actions
-- special considerations:
--   - used to track success metrics from prd (ai adoption, user engagement)
--   - action_type examples: 'cluster_accepted', 'cluster_edited', 'cluster_discarded', 
--     'group_created', 'group_modified', 'group_deleted', 'login', 'import_completed'
--   - target_id can reference groups or other entities depending on action type
--   - metadata stores additional context (e.g., cluster size, edit details)
--   - actions are immutable (no update or delete operations)

-- create user_actions table
create table user_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  target_id uuid null,
  metadata jsonb null,
  occurred_at timestamptz not null default now()
);

-- foreign key index for user lookups
-- optimizes queries that fetch all actions for a specific user
create index idx_user_actions_user_id on user_actions(user_id);

-- index for action type analytics
-- useful for filtering and grouping actions by type for analytics reports
create index idx_user_actions_action_type on user_actions(action_type);

-- index for time-based analytics
-- optimizes queries that filter or sort by occurrence time
create index idx_user_actions_occurred_at on user_actions(occurred_at desc);

-- composite index for user action history
-- optimizes the common pattern of fetching a user's actions sorted by time
create index idx_user_actions_user_occurred on user_actions(user_id, occurred_at desc);

-- enable row level security on user_actions table
-- ensures proper access control for action logging and analytics
-- alter table user_actions enable row level security;

-- rls policy: users can insert their own actions
-- rationale: users need to log their own actions for analytics tracking
-- create policy "user_actions_insert_own" 
-- on user_actions for insert 
-- to authenticated 
-- with check (auth.uid() = user_id);

-- rls policy: only service role can read actions (for analytics)
-- rationale: analytics and reporting are done via service role queries
-- users should not be able to read action logs directly
-- create policy "user_actions_select_service_role" 
-- on user_actions for select 
-- to service_role 
-- using (true);

-- note: no update or delete policies as actions are immutable for audit trail integrity

