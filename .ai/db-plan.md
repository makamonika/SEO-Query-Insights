# Database Schema - SEO Query Insights Dashboard

## 1. Tables

### 1.1 users (Supabase Auth)

Managed by Supabase Auth system in the `auth` schema.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Unique user identifier |
| email | text | UNIQUE NOT NULL | User's email address |
| encrypted_password | text | NOT NULL | Encrypted password (managed by Supabase) |
| email_confirmed_at | timestamptz | NULL | Timestamp when email was confirmed |
| created_at | timestamptz | NOT NULL DEFAULT now() | Account creation timestamp |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last update timestamp |
| last_sign_in_at | timestamptz | NULL | Last successful login timestamp |

**Notes:**
- This table is automatically created and managed by Supabase Auth
- Located in the `auth` schema (referenced as `auth.users`)
- Additional auth-related columns exist but are not listed here (see Supabase Auth documentation)
- Referenced by foreign keys in `groups` and `user_actions` tables
- No custom RLS policies needed - managed by Supabase Auth
- User registration and authentication handled by Supabase Auth API

---

### 1.2 queries

Stores daily Google Search Console query performance data at the URL level.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Unique identifier |
| date | date | NOT NULL | Date of the query data |
| query_text | text | NOT NULL | The search query text |
| url | text | NOT NULL | The URL associated with this query |
| impressions | bigint | NOT NULL CHECK (impressions >= 0) | Number of impressions |
| clicks | bigint | NOT NULL CHECK (clicks >= 0 AND clicks <= impressions) | Number of clicks |
| ctr | numeric(6,4) | NOT NULL CHECK (ctr BETWEEN 0 AND 1) | Click-through rate (0-1) |
| avg_position | numeric(5,2) | NOT NULL CHECK (avg_position >= 0) | Average position in search results |
| is_opportunity | boolean | NOT NULL DEFAULT false | Flag indicating if query meets opportunity criteria |
| created_at | timestamptz | NOT NULL DEFAULT now() | Record creation timestamp |

**Constraints:**
- UNIQUE (date, lower(query_text), url)

**Notes:**
- `is_opportunity` is computed at import time based on PRD criteria: impressions > 1000, ctr < 0.01, avg_position BETWEEN 5 AND 15
- Query text normalization uses `lower()` for case-insensitive uniqueness
- Historical data is retained by date; dashboard typically shows latest date only

---

### 1.3 groups

Stores user-created query groups (both manual and AI-generated).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Unique identifier |
| user_id | uuid | NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE | Owner of the group |
| name | text | NOT NULL CHECK (length(trim(name)) > 0) | Group name |
| ai_generated | boolean | NOT NULL DEFAULT false | True if created by AI clustering |
| created_at | timestamptz | NOT NULL DEFAULT now() | Group creation timestamp |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last update timestamp |

**Notes:**
- Unified table for both manual and AI-generated groups
- Groups are private to each user
- `ai_generated` flag distinguishes AI clusters from manual groups for analytics purposes
- Users create groups with `ai_generated = true` when they accept AI clustering suggestions

---

### 1.4 group_items

Junction table linking groups to query texts (normalized).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Unique identifier |
| group_id | uuid | NOT NULL REFERENCES groups(id) ON DELETE CASCADE | Reference to parent group |
| query_text | text | NOT NULL | Normalized query text (lowercase) |
| added_at | timestamptz | NOT NULL DEFAULT now() | Timestamp when query was added to group |

**Constraints:**
- UNIQUE (group_id, lower(query_text))

**Notes:**
- `query_text` should be stored in lowercase for consistency
- Groups attach to query text only, not specific URLs
- Aggregated metrics computed on-the-fly by joining with `queries` table

---

### 1.5 user_actions

Tracks user actions for analytics and success metrics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Unique identifier |
| user_id | uuid | NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE | User who performed the action |
| action_type | text | NOT NULL | Type of action (e.g., 'cluster_accepted', 'cluster_edited', 'cluster_discarded', 'group_created', 'group_modified', 'login') |
| target_id | uuid | NULL | Optional reference to related entity (e.g., group_id) |
| metadata | jsonb | NULL | Optional additional action metadata |
| occurred_at | timestamptz | NOT NULL DEFAULT now() | Timestamp of the action |

**Notes:**
- Used to track success metrics from PRD (AI adoption, user engagement)
- `action_type` examples: 'cluster_accepted', 'cluster_edited', 'cluster_discarded', 'group_created', 'group_modified', 'group_deleted', 'login', 'import_completed'
- `target_id` can reference groups or other entities depending on action type
- `metadata` can store additional context (e.g., cluster size, edit details)

---

## 2. Relationships

### 2.1 One-to-Many Relationships

**auth.users → groups**
- Cardinality: One user can have many groups
- Foreign Key: `groups.user_id` → `auth.users.id`
- On Delete: CASCADE (delete user's groups when user is deleted)

**auth.users → user_actions**
- Cardinality: One user can have many actions
- Foreign Key: `user_actions.user_id` → `auth.users.id`
- On Delete: CASCADE (delete user's actions when user is deleted)

**groups → group_items**
- Cardinality: One group can contain many query texts
- Foreign Key: `group_items.group_id` → `groups.id`
- On Delete: CASCADE (delete group items when group is deleted)

### 2.2 Implicit Relationships

**group_items ⟷ queries**
- Relationship: Group items reference query texts that exist in queries table
- Join condition: `lower(group_items.query_text) = lower(queries.query_text)`
- Note: No foreign key constraint; soft relationship via query text matching
- Aggregations computed by joining on latest date: `queries.date = (SELECT MAX(date) FROM queries)`

---

## 3. Indexes

### 3.1 users table

No custom indexes needed - managed by Supabase Auth with built-in indexes on `id` and `email`.

### 3.2 queries table

```sql
-- Primary key index (automatic)
CREATE INDEX idx_queries_pkey ON queries(id);

-- Unique constraint index (automatic)
CREATE UNIQUE INDEX idx_queries_unique_date_query_url ON queries(date, lower(query_text), url);

-- Performance indexes for filtering and sorting
CREATE INDEX idx_queries_date ON queries(date DESC);
CREATE INDEX idx_queries_is_opportunity ON queries(is_opportunity) WHERE is_opportunity = true;
CREATE INDEX idx_queries_impressions ON queries(impressions DESC);
CREATE INDEX idx_queries_ctr ON queries(ctr ASC);
CREATE INDEX idx_queries_avg_position ON queries(avg_position ASC);

-- Full-text search index for query text
CREATE INDEX idx_queries_query_text_trgm ON queries USING gin(lower(query_text) gin_trgm_ops);

-- Optional: URL index if filtering by URL is common
CREATE INDEX idx_queries_url ON queries(url);
```

**Notes:**
- Trigram GIN index enables fast partial text search (requires `pg_trgm` extension)
- Partial index on `is_opportunity` optimizes opportunity filtering
- DESC/ASC specified based on common sort directions from PRD

### 3.3 groups table

```sql
-- Primary key index (automatic)
CREATE INDEX idx_groups_pkey ON groups(id);

-- Foreign key index for user lookups
CREATE INDEX idx_groups_user_id ON groups(user_id);

-- Index for filtering AI-generated groups
CREATE INDEX idx_groups_ai_generated ON groups(ai_generated);

-- Composite index for user's groups ordered by creation
CREATE INDEX idx_groups_user_created ON groups(user_id, created_at DESC);
```

### 3.4 group_items table

```sql
-- Primary key index (automatic)
CREATE INDEX idx_group_items_pkey ON group_items(id);

-- Unique constraint index (automatic)
CREATE UNIQUE INDEX idx_group_items_unique_group_query ON group_items(group_id, lower(query_text));

-- Foreign key index for group lookups
CREATE INDEX idx_group_items_group_id ON group_items(group_id);

-- Index for query text lookups (joining with queries)
CREATE INDEX idx_group_items_query_text ON group_items(lower(query_text));
```

### 3.5 user_actions table

```sql
-- Primary key index (automatic)
CREATE INDEX idx_user_actions_pkey ON user_actions(id);

-- Foreign key index for user lookups
CREATE INDEX idx_user_actions_user_id ON user_actions(user_id);

-- Index for action type analytics
CREATE INDEX idx_user_actions_action_type ON user_actions(action_type);

-- Composite index for time-based analytics
CREATE INDEX idx_user_actions_occurred_at ON user_actions(occurred_at DESC);

-- Composite index for user action history
CREATE INDEX idx_user_actions_user_occurred ON user_actions(user_id, occurred_at DESC);
```

---

## 4. PostgreSQL Row-Level Security (RLS) Policies

### 4.1 Enable RLS on tables

```sql
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
```

**Notes:**
- The `auth.users` table does not require RLS policies as it is fully managed by Supabase Auth
- RLS is automatically handled by Supabase Auth for authentication and authorization

### 4.2 queries table policies

```sql
-- Authenticated users can view all queries (shared dataset)
CREATE POLICY "queries_select_authenticated" 
ON queries FOR SELECT 
TO authenticated 
USING (true);

-- Authenticated users can import queries (manual import)
CREATE POLICY "queries_insert_authenticated" 
ON queries FOR INSERT 
TO authenticated 
WITH CHECK (true);
```

**Notes:**
- All authenticated users can read query data (shared across team)
- All authenticated users can import queries via manual import process
- No UPDATE or DELETE operations allowed for regular users (data immutability)

### 4.3 groups table policies

```sql
-- Users can view only their own groups (both manual and AI-generated)
CREATE POLICY "groups_select_own" 
ON groups FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Users can create their own groups (both manual and AI-generated)
CREATE POLICY "groups_insert_own" 
ON groups FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own groups (both manual and AI-generated)
CREATE POLICY "groups_update_own" 
ON groups FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own groups (both manual and AI-generated)
CREATE POLICY "groups_delete_own" 
ON groups FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
```

**Notes:**
- Users have full CRUD access to their own groups (both manual and AI-generated)
- When users accept AI clustering suggestions, they create the group with `ai_generated = true`
- The `ai_generated` flag is used for analytics tracking, not access control
- No service role policies needed for groups - all operations are user-driven

### 4.4 group_items table policies

```sql
-- Users can view items in their own groups (both manual and AI-generated)
CREATE POLICY "group_items_select_own" 
ON group_items FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM groups 
    WHERE groups.id = group_items.group_id 
    AND groups.user_id = auth.uid()
  )
);

-- Users can add items to their own groups (both manual and AI-generated)
CREATE POLICY "group_items_insert_own" 
ON group_items FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM groups 
    WHERE groups.id = group_items.group_id 
    AND groups.user_id = auth.uid()
  )
);

-- Users can delete items from their own groups (both manual and AI-generated)
CREATE POLICY "group_items_delete_own" 
ON group_items FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM groups 
    WHERE groups.id = group_items.group_id 
    AND groups.user_id = auth.uid()
  )
);

```

**Notes:**
- Access to group_items is controlled through group ownership
- Users can add/remove items from both manual and AI-generated groups that belong to them
- No UPDATE policy (items are added/removed, not modified)
- When accepting AI suggestions, users create both the group and its items

### 4.5 user_actions table policies

```sql
-- Users can insert their own actions
CREATE POLICY "user_actions_insert_own" 
ON user_actions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Only service role can read actions (for analytics)
CREATE POLICY "user_actions_select_service_role" 
ON user_actions FOR SELECT 
TO service_role 
USING (true);
```

**Notes:**
- Users can log their own actions but cannot read them
- Analytics/reporting done via service role queries
- No UPDATE or DELETE policies (actions are immutable)

---

