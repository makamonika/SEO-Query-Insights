<conversation_summary>
<decisions>
1. Users will be SEO team members only (non-technical).
2. Data source is a daily JSON file (40-60MB) accessed via API endpoint with date-based naming convention.
3. Authentication will be simple login/password system for internal team use.
4. Data is business-sensitive but not PII; dataset shared for all users, but query groupings remain private.
5. Query clustering will use text embeddings (OpenAI or Sentence Transformers) with K-means algorithm.
6. Opportunity detection rules: Impressions > 1,000, CTR < 1%, Average position between 5-15.
7. Users can keep, edit, or discard AI-suggested clusters.
8. Data import happens once daily (API updates at 10AM). One user click the button and it gets updated for all users with information that data is updated for the specific day.
9. Different language queries will be treated as distinct queries.
10. Dashboard should load up to 10k queries in <2 seconds with UI actions completing in <500ms.
11. Import process should complete in <1 minute without blocking user interaction.
12. Query groups will be visualized as list/cards with cluster name, query count, and aggregated metrics.
13. MVP filtering includes search by query text, opportunity toggle, and cluster filter.
14. MVP sorting includes impressions (desc), CTR (asc), and average position (asc).
15. Group customization limited to naming, adding/removing queries, and basic management.
16. User workflow: login, sort/filter queries, create/review clusters.
17. Import failures will display error messages, allow retries, and preserve previous data.
</decisions>

<prd_planning_summary>
## Functional Requirements

### Data Import
- Single daily manual import of GSC query data via internal API
- Data stored in JSON format with URL-grouped queries
- Import process completes within 1 minute without blocking UI
- Global update when data is updated

### Query Performance View
- Display metrics: impressions, clicks, CTR, average position
- Search by query text functionality
- Filter by opportunities and clusters
- Sort by impressions, CTR, and average position

### Query Grouping
- Manual creation of query groups (private per user)
- Basic customization: naming, adding/removing queries
- List/card visualization with aggregated metrics
- Visual indicators for opportunity queries

### AI-Assisted Clustering
- K-means clustering using text embeddings
- User feedback options: approve, edit, or discard
- Automatic cluster naming based on representative queries
- Cluster performance metrics display

### Opportunity Detection
- Rule-based flagging: Impressions > 1,000, CTR < 1%, Position 5-15
- Visual indicators on dashboard

## User Stories
1. As an SEO specialist, I want to import the latest GSC data so I can analyze current query performance.
2. As an SEO specialist, I want to identify low-CTR queries with high visibility so I can prioritize content optimization.
3. As an SEO specialist, I want to create thematic query groups so I can organize related search terms.
4. As an SEO specialist, I want to review AI-suggested query clusters to discover patterns I might have missed.
5. As an SEO specialist, I want to filter queries by specific criteria so I can focus on relevant subsets of data.

## Success Criteria
- 70% of AI-suggested clusters accepted by users
- 75% of active users creating/modifying query groups

## Additional Metrics
- Number of clusters created per user (manual & AI)
- Average number of queries per cluster
- User engagement (logins, feature use)
- Time spent per session
- AI cluster acceptance trends over time

## Non-Functional Requirements
- Performance: Dashboard loads up to 10k queries in <2 seconds
- UI Response Time: Actions complete in <500ms
- Import Response Time: Complete in <2 minutes for full dataset
- Reliability: Logged actions, preserved data on failure
- Availability: 99% uptime during working hours
</prd_planning_summary>
</conversation_summary>