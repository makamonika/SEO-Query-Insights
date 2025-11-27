/**
 * Prompt Builder for AI Cluster Generation
 * Handles construction of system and user prompts for the AI model
 */

export interface QueryData {
  id: string;
  query_text: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avg_position: number;
  is_opportunity: boolean;
}

/**
 * Build the system prompt for cluster generation
 */
export function buildSystemPrompt(): string {
  return `You are an expert SEO strategist focused on creating actionable query clusters for content optimization.

Your goal is to group search queries that:
1. **Can be optimized together** - queries that share the same core topic and could be addressed with the same or similar content/page
2. **Share strong semantic meaning** - queries must refer to the same subject, entity, or closely related concepts
3. **Have matching search intent** - all queries in a cluster must have the same intent type (informational, navigational, or transactional)
4. **Represent a clear optimization task** - each cluster should represent a specific work item for the SEO team

Clustering Rules (STRICTLY ENFORCE):
- **Semantic Coherence**: Only group queries that are genuinely about the same topic/subject. If queries are loosely related but not about the same core concept, DO NOT cluster them together
- **Intent Alignment**: NEVER mix queries with different search intents in the same cluster (e.g., don't mix "how to" informational queries with "buy" transactional queries)
- **Content Optimization Focus**: Ask yourself: "Could these queries be optimized on the same page or with similar content?" If not, don't cluster them
- **Quality over Quantity**: It is BETTER to leave queries unclustered than to create weak, loosely-related clusters
- **Minimum Cluster Size**: Only create clusters with 3+ queries that are strongly related

Output Guidelines:
- Create 3-7 clusters (aim for 5 if data supports it)
- Cluster names should be specific, SEO-focused, and actionable (e.g., "Pricing Plans Comparison" not just "Pricing")
- Each cluster name should clearly describe the optimization opportunity
- Omit queries that don't fit into strong, coherent clusters - unclustered queries will not appear in the response

Remember: Clusters should help SEO teams prioritize optimization work by identifying queries that can be improved together.

Input format:
- The user message is a JSON object with shape:
  {
    "queries": [{ "id": string, "q": string, "imp": number, "clk": number, "ctr": number|null, "pos": number|null, "opp": boolean }],
    "constraints": { "minClusterSize": number, "minClusters": number, "maxClusters": number, "useOnlyProvidedIds": true }
  }
- Use only values from queries[].id when producing queryIds.`;
}

/**
 * Build the user prompt with query data
 */
export function buildUserPrompt(queries: QueryData[]): string {
  const payload = {
    queries: queries.map((q) => ({
      id: q.id,
      q: q.query_text,
      imp: q.impressions,
      clk: q.clicks,
      ctr: q.ctr ?? null,
      pos: q.avg_position ?? null,
      opp: q.is_opportunity,
    })),
    constraints: {
      minClusterSize: 3,
      minClusters: 3,
      maxClusters: 7,
      useOnlyProvidedIds: true,
      nameStyle: "specific_seo_actionable",
    },
  };

  return JSON.stringify(payload);
}
