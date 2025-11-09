/**
 * Data Transfer Objects (DTOs) and Command Models
 *
 * This file contains type definitions for API requests and responses.
 * All DTOs are derived from database entity types to ensure type safety.
 */

import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Converts snake_case database fields to camelCase for API responses
 */
type SnakeToCamel<S extends string> = S extends `${infer T}_${infer U}` ? `${T}${Capitalize<SnakeToCamel<U>>}` : S;

type CamelCaseKeys<T> = {
  [K in keyof T as SnakeToCamel<string & K>]: T[K];
};

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

/**
 * Pagination parameters for list requests
 * Subset of PaginationMeta (without total, which is only known after query)
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: {
    code: "validation_error" | "not_found" | "unauthorized" | "forbidden" | "rate_limited" | "conflict" | "internal";
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// 1. Authentication DTOs
// ============================================================================

/**
 * Login request body
 */
export interface LoginRequestDto {
  email: string;
  password: string;
}

/**
 * Register request body
 */
export interface RegisterRequestDto {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * User data transfer object
 */
export interface UserDto {
  id: string;
  email: string;
  createdAt: string;
}

/**
 * Login response (user data only, auth cookies are set via Set-Cookie header)
 */
export interface LoginResponseDto {
  user: UserDto;
}

/**
 * Register response (user data only, auth cookies are set via Set-Cookie header)
 */
export interface RegisterResponseDto {
  user: UserDto;
  requiresEmailConfirmation: boolean;
}

/**
 * Forgot password request body
 */
export interface ForgotPasswordRequestDto {
  email: string;
}

/**
 * Forgot password response
 */
export interface ForgotPasswordResponseDto {
  message: string;
}

/**
 * Reset password request body
 */
export interface ResetPasswordRequestDto {
  password: string;
  confirmPassword: string;
}

/**
 * Reset password response
 */
export interface ResetPasswordResponseDto {
  message: string;
}

/**
 * Current user response (from /api/auth/me)
 */
export interface GetCurrentUserResponseDto {
  user: UserDto;
}

/**
 * Auth error response with specific auth error codes
 */
export interface AuthErrorResponse extends ErrorResponse {
  error: {
    code: "validation_error" | "unauthorized" | "conflict" | "rate_limited" | "internal";
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// 2. Query DTOs
// ============================================================================

/**
 * Public representation of a query with camelCase fields
 * Derived from database 'queries' table
 */
export type QueryDto = CamelCaseKeys<Tables<"queries">>;

export type GetQueriesRequestDto = PaginationParams & {
  search?: string;
  isOpportunity?: boolean;
  sortBy?: "impressions" | "clicks" | "ctr" | "avgPosition";
  order?: "asc" | "desc";
};

/**
 * Response for queries list with pagination metadata
 */
export interface GetQueriesResponseDto {
  data: QueryDto[];
  meta: PaginationMeta;
}

// ============================================================================
// 3. Import DTOs
// ============================================================================

export interface CreateImportRequestDto {
  sourceUrl: string;
}

export interface CreateImportResponseDto {
  importId: string;
  status: ImportStatus;
}

/**
 * Result of a synchronous import run (MVP)
 */
export interface ImportRunResultDto {
  status: "completed" | "failed";
  rowCount: number;
  durationMs: number;
  completedAt?: string;
  error?: {
    message: string;
  };
}

// ============================================================================
// 4. Group DTOs
// ============================================================================

/**
 * Public representation of a group with camelCase fields
 * Derived from database 'groups' table
 */
export type GroupDto = CamelCaseKeys<Tables<"groups">>;

/**
 * Command model for creating a new group
 * Derived from database insert type
 */
export interface CreateGroupRequestDto {
  name: string;
  aiGenerated?: boolean;
}

/**
 * Command model for updating a group
 * Derived from database update type, all fields optional
 */
export interface UpdateGroupRequestDto {
  name?: string;
  aiGenerated?: boolean;
}

export interface GetGroupsResponseDto {
  data: GroupDto[];
  meta: PaginationMeta;
}

export type GetGroupByIdResponseDto = GroupDto;

// ============================================================================
// 5. Group Item DTOs
// ============================================================================

/**
 * Public representation of a group item with camelCase fields
 * Derived from database 'group_items' table
 */
export type GroupItemDto = CamelCaseKeys<Tables<"group_items">>;

/**
 * Command model for adding queries to a group
 */
export interface AddGroupItemsRequestDto {
  queryIds: string[];
}

/**
 * Response for group items list with pagination metadata
 */
export interface GetGroupItemsResponseDto {
  data: QueryDto[];
  meta: PaginationMeta;
}

// ============================================================================
// 6. AI Cluster DTOs
// ============================================================================

/**
 * AI-generated cluster suggestion (ephemeral, not persisted)
 * These are only returned from the generate endpoint and live in client memory.
 * Users can edit them client-side before accepting.
 */
export interface AiClusterSuggestionDto {
  name: string;
  queries: QueryDto[];
  queryCount: number;
  metricsImpressions: number;
  metricsClicks: number;
  metricsCtr: number;
  metricsAvgPosition: number;
}

/**
 * Single cluster to accept (subset of the original suggestion)
 * The client can edit name and filter queryIds before accepting
 */
export interface AcceptClusterDto {
  name: string;
  queryIds: string[];
}

/**
 * Request to accept one or more clusters from a suggestion
 * The client sends potentially-edited cluster data
 */
export interface AcceptClustersRequestDto {
  clusters: AcceptClusterDto[];
}

/**
 * Response after accepting clusters
 * Returns the newly created groups (now persisted in database)
 */
export interface AcceptClustersResponseDto {
  groups: GroupDto[];
}

export interface AggregatedMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
}

export interface RecomputeResult {
  queryCount: number;
  metrics: AggregatedMetrics;
}

// ============================================================================
// 7. User Action DTOs
// ============================================================================

/**
 * Public representation of a user action with camelCase fields
 * Derived from database 'user_actions' table
 */
export type UserActionDto = CamelCaseKeys<Tables<"user_actions">>;

export type GetUserActionsRequestDto = PaginationParams & {
  actionType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
};

export interface GetUserActionsResponseDto {
  data: UserActionDto[];
  meta: PaginationMeta;
}

/**
 * Command model for creating a user action
 * Derived from database insert type
 */
export type CreateUserActionDto = Omit<TablesInsert<"user_actions">, "id" | "occurred_at">;

// ============================================================================
// 8. Database Entity Insert/Update Types (for internal use)
// ============================================================================

/**
 * Insert types for creating new database records
 */
export type QueryInsert = TablesInsert<"queries">;
export type GroupInsert = TablesInsert<"groups">;
export type GroupItemInsert = TablesInsert<"group_items">;
export type UserActionInsert = TablesInsert<"user_actions">;

/**
 * Update types for modifying existing database records
 */
export type QueryUpdate = TablesUpdate<"queries">;
export type GroupUpdate = TablesUpdate<"groups">;
export type GroupItemUpdate = TablesUpdate<"group_items">;
export type UserActionUpdate = TablesUpdate<"user_actions">;

// ============================================================================
// 9. Domain-specific type guards and validators
// ============================================================================

/**
 * Valid sort fields for queries
 */
export const QUERY_SORT_FIELDS = ["impressions", "clicks", "ctr", "avgPosition"] as const;
export type QuerySortField = (typeof QUERY_SORT_FIELDS)[number];

/**
 * Valid sort orders
 */
export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/**
 * Valid action types for user actions tracking
 */
export const USER_ACTION_TYPES = [
  "login",
  "logout",
  "import_initiated",
  "import_completed",
  "group_created",
  "group_updated",
  "group_deleted",
  "group_item_added",
  "group_item_removed",
  "cluster_generated",
  "cluster_accepted",
  "cluster_rejected",
] as const;
export type UserActionType = (typeof USER_ACTION_TYPES)[number];

/**
 * Import status values
 */
export const IMPORT_STATUSES = ["processing", "completed", "failed"] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];
