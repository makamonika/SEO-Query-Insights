/**
 * Data Transfer Objects (DTOs) and Command Models
 * 
 * This file contains type definitions for API requests and responses.
 * All DTOs are derived from database entity types to ensure type safety.
 */

import type { Tables, TablesInsert, TablesUpdate } from './db/database.types';

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Converts snake_case database fields to camelCase for API responses
 */
type SnakeToCamel<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamel<U>>}`
  : S;

type CamelCaseKeys<T> = {
  [K in keyof T as SnakeToCamel<string & K>]: T[K];
};

/**
 * Pagination metadata for list responses
 */
export type PaginationMeta = {
  total: number;
  limit: number;
  offset: number;
};

/**
 * Standard error response structure
 */
export type ErrorResponse = {
  error: {
    code: 'validation_error' | 'not_found' | 'unauthorized' | 'forbidden' | 'rate_limited' | 'conflict' | 'internal';
    message: string;
    details?: Record<string, unknown>;
  };
};

// ============================================================================
// 1. Authentication DTOs
// ============================================================================

export type LoginRequestDto = {
  email: string;
  password: string;
};

export type UserDto = {
  id: string;
  email: string;
  createdAt: string;
};

export type LoginResponseDto = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: UserDto;
};

export type RefreshTokenRequestDto = {
  refreshToken: string;
};

export type RefreshTokenResponseDto = LoginResponseDto;

// ============================================================================
// 2. Query DTOs
// ============================================================================

/**
 * Public representation of a query with camelCase fields
 * Derived from database 'queries' table
 */
export type QueryDto = CamelCaseKeys<Tables<'queries'>>;

export type GetQueriesRequestDto = {
  search?: string;
  isOpportunity?: boolean;
  sortBy?: 'impressions' | 'clicks' | 'ctr' | 'avgPosition';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

export type GetQueriesResponseDto = QueryDto[];

// ============================================================================
// 3. Import DTOs
// ============================================================================

export type CreateImportRequestDto = {
  sourceUrl: string;
};

export type CreateImportResponseDto = {
  importId: string;
  status: ImportStatus;
};

// ============================================================================
// 4. Group DTOs
// ============================================================================

/**
 * Public representation of a group with camelCase fields
 * Derived from database 'groups' table
 */
export type GroupDto = CamelCaseKeys<Tables<'groups'>>;

/**
 * Command model for creating a new group
 * Derived from database insert type
 */
export type CreateGroupRequestDto = {
  name: string;
  aiGenerated?: boolean;
};

/**
 * Command model for updating a group
 * Derived from database update type, all fields optional
 */
export type UpdateGroupRequestDto = {
  name?: string;
  aiGenerated?: boolean;
};

/**
 * Aggregated metrics for a group
 */
export type GroupMetricsDto = {
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
};

/**
 * Group with computed metrics and query count
 */
export type GroupWithMetricsDto = GroupDto & {
  queryCount: number;
  metrics: GroupMetricsDto;
};

export type GetGroupsResponseDto = {
  data: GroupWithMetricsDto[];
};

export type GetGroupByIdResponseDto = GroupWithMetricsDto;

// ============================================================================
// 5. Group Item DTOs
// ============================================================================

/**
 * Public representation of a group item with camelCase fields
 * Derived from database 'group_items' table
 */
export type GroupItemDto = CamelCaseKeys<Tables<'group_items'>>;

/**
 * Command model for adding queries to a group
 */
export type AddGroupItemsRequestDto = {
  queryTexts: string[];
};

// ============================================================================
// 6. AI Cluster DTOs
// ============================================================================

/**
 * AI-generated cluster suggestion (ephemeral, not persisted)
 * These are only returned from the generate endpoint and live in client memory.
 * Users can edit them client-side before accepting.
 */
export type AiClusterSuggestionDto = {
  suggestId: string;
  name: string;
  queryTexts: string[];
  queryCount: number;
  metrics: GroupMetricsDto;
};

/**
 * Response from generating AI clusters
 * Contains ephemeral suggestions that exist only in this response
 */
export type GenerateAiClustersResponseDto = {
  suggestions: AiClusterSuggestionDto[];
  generatedAt: string;
};

/**
 * Accept a cluster suggestion and save it as a real group
 * The client sends the potentially-edited cluster data (name and queryTexts)
 * This creates a new group with ai_generated = true
 */
export type AcceptAiClusterRequestDto = {
  name: string;
  queryTexts: string[];
};

/**
 * Response after accepting a cluster
 * Returns the newly created group (now persisted in database)
 */
export type AcceptAiClusterResponseDto = {
  group: GroupWithMetricsDto;
};

// ============================================================================
// 7. User Action DTOs
// ============================================================================

/**
 * Public representation of a user action with camelCase fields
 * Derived from database 'user_actions' table
 */
export type UserActionDto = CamelCaseKeys<Tables<'user_actions'>>;

export type GetUserActionsRequestDto = {
  actionType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export type GetUserActionsResponseDto = {
  data: UserActionDto[];
  meta: PaginationMeta;
};

/**
 * Command model for creating a user action
 * Derived from database insert type
 */
export type CreateUserActionDto = Omit<TablesInsert<'user_actions'>, 'id' | 'occurred_at'>;

// ============================================================================
// 8. Database Entity Insert/Update Types (for internal use)
// ============================================================================

/**
 * Insert types for creating new database records
 */
export type QueryInsert = TablesInsert<'queries'>;
export type GroupInsert = TablesInsert<'groups'>;
export type GroupItemInsert = TablesInsert<'group_items'>;
export type UserActionInsert = TablesInsert<'user_actions'>;

/**
 * Update types for modifying existing database records
 */
export type QueryUpdate = TablesUpdate<'queries'>;
export type GroupUpdate = TablesUpdate<'groups'>;
export type GroupItemUpdate = TablesUpdate<'group_items'>;
export type UserActionUpdate = TablesUpdate<'user_actions'>;

// ============================================================================
// 9. Domain-specific type guards and validators
// ============================================================================

/**
 * Valid sort fields for queries
 */
export const QUERY_SORT_FIELDS = ['impressions', 'clicks','ctr', 'avgPosition'] as const;
export type QuerySortField = typeof QUERY_SORT_FIELDS[number];

/**
 * Valid sort orders
 */
export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = typeof SORT_ORDERS[number];

/**
 * Valid action types for user actions tracking
 */
export const USER_ACTION_TYPES = [
  'login',
  'logout',
  'import_initiated',
  'import_completed',
  'group_created',
  'group_updated',
  'group_deleted',
  'group_item_added',
  'group_item_removed',
  'cluster_generated',
  'cluster_accepted',
  'cluster_rejected',
] as const;
export type UserActionType = typeof USER_ACTION_TYPES[number];

/**
 * Import status values
 */
export const IMPORT_STATUSES = ['processing', 'completed', 'failed'] as const;
export type ImportStatus = typeof IMPORT_STATUSES[number];

