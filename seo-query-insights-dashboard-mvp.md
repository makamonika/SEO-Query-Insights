# Application -- SEO Query Insights Dashboard (MVP)

## 1. Main Problem

The SEO team relies on Google Search Console (GSC) data to understand
website performance, but current reporting focuses mainly on URL-level
metrics.\
Valuable query-level insights --- such as how users search, which topics
perform well, or which queries underperform --- are not being used
effectively.\
This limits the team's ability to identify new keyword opportunities,
optimize existing content, and improve organic visibility.

The application addresses this by providing a shared, centralized
dashboard that allows SEO specialists to explore, organize, and
interpret GSC query data more effectively --- with AI-assisted
clustering helping to uncover meaningful groups of related search
queries.

## 2. Minimum Set of Features (MVP)

The MVP focuses on delivering core business value with minimal
complexity:

### Manual Data Import (Shared Dataset)

A single daily import of GSC query data (via existing internal API) that
updates the dataset for all users. Once one user imports, the data
becomes visible to the whole team.

### Query Performance View

A dashboard displaying key query metrics --- impressions, clicks, CTR,
and average position --- enabling quick filtering and sorting.

### Manual Grouping

Users can create and manage their own query groups (private per user),
organize queries by topic, and edit or remove these groups.

### AI-Assisted Clustering

The system can suggest query clusters based on semantic similarity,
helping users quickly identify intent-based or thematic patterns in
large datasets.

### Opportunity Detection

A simple rule-based filter highlights queries with high impressions but
low CTR or suboptimal ranking, guiding attention to potential
optimization areas.

## 3. Out of Scope for MVP

To keep the MVP simple and focused, the following features are excluded
from this stage:

-   Automatic daily imports or scheduled background jobs\
-   Historical trend analysis or time-based visualizations\
-   Team-level collaboration or shared groupings\
-   Detailed AI-generated content optimization suggestions\
-   Notifications, reporting exports, or performance alerts\
-   Role-based access control (only basic login is included)

## 4. Success Criteria

The MVP will be considered successful when it meets the following
measurable outcomes:

### AI Adoption & Quality

At least **70% of AI-suggested clusters** are accepted (kept or slightly
edited) by users.

### User Engagement

At least **75% of active users** create or modify their own query groups
based on imported data.

<!-- ### Insight Generation

Users report discovering **at least 3 new SEO optimization ideas per
month** using the tool. -->