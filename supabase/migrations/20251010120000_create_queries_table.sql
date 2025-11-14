-- migration: create queries table
-- purpose: stores daily google search console query performance data at the url level
-- affected tables: queries
-- special considerations: 
--   - is_opportunity flag computed at import time based on prd criteria
--   - query text normalization uses lower() for case-insensitive uniqueness
--   - historical data retained by date; dashboard typically shows latest date only

-- enable pg_trgm extension for trigram-based text search
create extension if not exists pg_trgm;

-- create queries table
create table queries (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  query_text text not null,
  url text not null,
  impressions bigint not null check (impressions >= 0),
  clicks bigint not null check (clicks >= 0 and clicks <= impressions),
  ctr numeric(6,4) not null check (ctr between 0 and 1),
  avg_position numeric(7,2) not null check (avg_position >= 0),
  is_opportunity boolean not null default false,
  created_at timestamptz not null default now()
);

-- add unique constraint for date, query_text (case-insensitive), and url
-- this prevents duplicate entries for the same query on the same date and url
create unique index idx_queries_unique_date_query_url on queries(date, lower(query_text), url);

-- performance index for date filtering and sorting (descending for latest first)
create index idx_queries_date on queries(date desc);

-- partial index for opportunity filtering (only indexes rows where is_opportunity = true)
-- this optimizes queries that filter for opportunities without indexing all rows
create index idx_queries_is_opportunity on queries(is_opportunity) where is_opportunity = true;

-- performance indexes for sorting by metrics (descending for impressions, ascending for ctr and position)
create index idx_queries_impressions on queries(impressions desc);
create index idx_queries_ctr on queries(ctr asc);
create index idx_queries_avg_position on queries(avg_position asc);

-- full-text search index for query text using trigram similarity
-- enables fast partial text search and fuzzy matching
create index idx_queries_query_text_trgm on queries using gin(lower(query_text) gin_trgm_ops);

-- optional index for url filtering if filtering by url is common
create index idx_queries_url on queries(url);

-- enable row level security on queries table
-- this ensures all access is controlled by rls policies
alter table queries enable row level security;

-- rls policy: authenticated users can view all queries (shared dataset)
-- rationale: query data is shared across the team, all authenticated users need read access
create policy "queries_select_authenticated" 
on queries for select 
to authenticated 
using (true);

-- rls policy: authenticated users can import queries (manual import)
-- rationale: all authenticated users can import query data via manual import process
create policy "queries_insert_authenticated" 
on queries for insert 
to authenticated 
with check (true);

-- note: no update or delete policies for regular users to ensure data immutability

