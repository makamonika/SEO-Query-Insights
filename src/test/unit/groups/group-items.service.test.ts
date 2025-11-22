import { describe, it, expect, vi, beforeEach } from "vitest";
import { addGroupItems, removeGroupItem, getGroupItems, GroupNotFoundError } from "@/lib/services/group-items.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import {
  createSupabaseClientMock,
  createPostgrestQueryBuilderMock,
  type PostgrestQueryBuilderMock,
} from "@/test/utils/mockSupabaseClient";

// Mock dependencies
vi.mock("@/lib/services/group-metrics.service", () => ({
  recomputeAndPersistGroupMetrics: vi.fn().mockResolvedValue({
    metrics: { impressions: 1000, clicks: 50, ctr: 0.05, avgPosition: 5.5 },
    queryCount: 2,
  }),
}));

vi.mock("@/lib/mappers", () => ({
  mapQueryRowToDto: vi.fn((row) => ({
    id: row.id,
    queryText: row.query_text,
    url: row.url,
    impressions: row.impressions,
    clicks: row.clicks,
    ctr: row.ctr,
    avgPosition: row.avg_position,
    isOpportunity: row.is_opportunity,
    date: row.date,
    createdAt: row.created_at,
  })),
}));

describe("Group Items Service", () => {
  let mockSupabase: SupabaseClient<Database>;
  let fromQueue: PostgrestQueryBuilderMock[];

  function enqueueFromBuilders(...builders: PostgrestQueryBuilderMock[]) {
    fromQueue.push(...builders);
  }

  const userId = "user-123";
  const groupId = "group-123";

  function createGroupOwnershipMock(options: { exists?: boolean; errorMessage?: string } = {}) {
    const { exists = true, errorMessage } = options;

    if (errorMessage) {
      return createPostgrestQueryBuilderMock({
        maybeSingleResponses: [{ data: null, error: { message: errorMessage } }],
      });
    }

    return createPostgrestQueryBuilderMock({
      maybeSingleResponses: [{ data: exists ? { id: groupId } : null, error: null }],
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createSupabaseClientMock();
    fromQueue = [];

    vi.mocked(mockSupabase.from).mockImplementation(() => {
      if (fromQueue.length === 0) {
        throw new Error("Unexpected supabase.from call without configured mock builder");
      }
      return fromQueue.shift() as unknown as PostgrestQueryBuilderMock;
    });
  });

  describe("GRP-03: Add new queries to an existing group", () => {
    it("should successfully add queries to a group", async () => {
      // Arrange
      const queryIds = ["query-1", "query-2"];

      const groupOwnership = createGroupOwnershipMock();
      const queryExistence = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: [{ id: "query-1" }, { id: "query-2" }], error: null }],
      });

      const existingItems = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: [], error: null }],
      });

      const insertItems = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: null }],
      });

      const userActionInsert = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: null }],
      });

      enqueueFromBuilders(groupOwnership, queryExistence, existingItems, insertItems, userActionInsert);

      // Act
      const result = await addGroupItems(mockSupabase, userId, groupId, queryIds);

      // Assert
      expect(result.addedCount).toBe(2);
      expect(insertItems.insert).toHaveBeenCalledWith([
        { group_id: groupId, query_id: "query-1" },
        { group_id: groupId, query_id: "query-2" },
      ]);
    });

    it("should deduplicate query IDs before adding", async () => {
      // Arrange
      const queryIds = ["query-1", "query-1", "query-2"];

      const groupOwnership = createGroupOwnershipMock();
      const queryExistence = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: [{ id: "query-1" }, { id: "query-2" }], error: null }],
      });

      const existingItems = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: [], error: null }],
      });

      const insertItems = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: null }],
      });

      const userActionInsert = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: null }],
      });

      enqueueFromBuilders(groupOwnership, queryExistence, existingItems, insertItems, userActionInsert);

      // Act
      const result = await addGroupItems(mockSupabase, userId, groupId, queryIds);

      // Assert
      expect(result.addedCount).toBe(2);
    });

    it("should skip queries that already exist in the group", async () => {
      // Arrange
      const queryIds = ["query-1", "query-2", "query-3"];

      const groupOwnership = createGroupOwnershipMock();
      const queryExistence = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: [{ id: "query-1" }, { id: "query-2" }, { id: "query-3" }], error: null }],
      });

      const existingItems = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: [{ query_id: "query-1" }], error: null }],
      });

      const insertItems = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: null }],
      });

      const userActionInsert = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: null }],
      });

      enqueueFromBuilders(groupOwnership, queryExistence, existingItems, insertItems, userActionInsert);

      // Act
      const result = await addGroupItems(mockSupabase, userId, groupId, queryIds);

      // Assert
      expect(result.addedCount).toBe(2);
      expect(insertItems.insert).toHaveBeenCalledWith([
        { group_id: groupId, query_id: "query-2" },
        { group_id: groupId, query_id: "query-3" },
      ]);
    });
    it("should return 0 when query IDs array is empty", async () => {
      // Arrange
      const queryIds: string[] = [];

      // Act
      const result = await addGroupItems(mockSupabase, userId, groupId, queryIds);

      // Assert
      expect(result.addedCount).toBe(0);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("should filter out empty query IDs", async () => {
      // Arrange
      const queryIds = ["query-1", "", "query-2", ""];

      const groupOwnership = createGroupOwnershipMock();
      const queryExistence = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: [{ id: "query-1" }, { id: "query-2" }], error: null }],
      });

      const existingItems = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: [], error: null }],
      });

      const insertItems = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: null }],
      });

      const userActionInsert = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: null }],
      });

      enqueueFromBuilders(groupOwnership, queryExistence, existingItems, insertItems, userActionInsert);

      // Act
      const result = await addGroupItems(mockSupabase, userId, groupId, queryIds);

      // Assert
      expect(result.addedCount).toBe(2);
    });

    it("should throw error when query IDs do not exist", async () => {
      // Arrange
      const queryIds = ["query-1", "invalid-query"];

      const groupOwnership = createGroupOwnershipMock();
      const queryExistence = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: [{ id: "query-1" }], error: null }],
      });

      enqueueFromBuilders(groupOwnership, queryExistence);

      // Act & Assert
      await expect(addGroupItems(mockSupabase, userId, groupId, queryIds)).rejects.toThrow(
        "Invalid query IDs: invalid-query"
      );
    });

    it("should throw GroupNotFoundError when group does not belong to user", async () => {
      // Arrange
      const queryIds = ["query-1"];
      const groupOwnership = createGroupOwnershipMock({ exists: false });

      enqueueFromBuilders(groupOwnership);

      // Act & Assert
      await expect(addGroupItems(mockSupabase, userId, groupId, queryIds)).rejects.toBeInstanceOf(GroupNotFoundError);
    });

    it("should surface errors when group ownership check fails", async () => {
      // Arrange
      const queryIds = ["query-1"];
      const groupOwnership = createGroupOwnershipMock({ errorMessage: "Ownership error" });

      enqueueFromBuilders(groupOwnership);

      // Act & Assert
      await expect(addGroupItems(mockSupabase, userId, groupId, queryIds)).rejects.toThrow(
        "Failed to verify group ownership: Ownership error"
      );
    });
    it("should throw error when query verification fails", async () => {
      // Arrange
      const queryIds = ["query-1", "query-2"];

      const groupOwnership = createGroupOwnershipMock();
      const queryExistence = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: null, error: { message: "Database error" } }],
      });

      enqueueFromBuilders(groupOwnership, queryExistence);

      // Act & Assert
      await expect(addGroupItems(mockSupabase, userId, groupId, queryIds)).rejects.toThrow(
        "Failed to verify queries: Database error"
      );
    });

    it("should throw error when insert operation fails", async () => {
      // Arrange
      const queryIds = ["query-1", "query-2"];

      const groupOwnership = createGroupOwnershipMock();
      const queryExistence = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: [{ id: "query-1" }, { id: "query-2" }], error: null }],
      });

      const existingItems = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: [], error: null }],
      });

      const insertItems = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: { message: "Insert failed" } }],
      });

      enqueueFromBuilders(groupOwnership, queryExistence, existingItems, insertItems);

      // Act & Assert
      await expect(addGroupItems(mockSupabase, userId, groupId, queryIds)).rejects.toThrow(
        "Failed to insert group items: Insert failed"
      );
    });
  });

  describe("GRP-04: Remove a query from a group", () => {
    it("should successfully remove a query from a group", async () => {
      // Arrange
      const queryId = "query-1";

      const groupOwnership = createGroupOwnershipMock();
      const deleteQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: null, count: 1 }],
      });

      const userActionInsert = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: null }],
      });

      enqueueFromBuilders(groupOwnership, deleteQuery, userActionInsert);

      // Act
      const result = await removeGroupItem(mockSupabase, userId, groupId, queryId);

      // Assert
      expect(result.removed).toBe(true);
      expect(mockSupabase.from).toHaveBeenNthCalledWith(1, "groups");
      expect(mockSupabase.from).toHaveBeenNthCalledWith(2, "group_items");
      expect(deleteQuery.delete).toHaveBeenCalledWith({ count: "exact" });
      expect(deleteQuery.eq).toHaveBeenCalledWith("group_id", groupId);
      expect(deleteQuery.eq).toHaveBeenCalledWith("query_id", queryId);
    });

    it("should return false when query is not in the group", async () => {
      // Arrange
      const queryId = "query-1";

      const groupOwnership = createGroupOwnershipMock();
      const deleteQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: null, count: 0 }],
      });

      enqueueFromBuilders(groupOwnership, deleteQuery);

      // Act
      const result = await removeGroupItem(mockSupabase, userId, groupId, queryId);

      // Assert
      expect(result.removed).toBe(false);
    });

    it("should throw error when query ID is empty", async () => {
      // Arrange
      const queryId = "";

      // Act & Assert
      await expect(removeGroupItem(mockSupabase, userId, groupId, queryId)).rejects.toThrow("Query ID cannot be empty");
    });

    it("should throw error when query ID is whitespace only", async () => {
      // Arrange
      const queryId = "   ";

      // Act & Assert
      await expect(removeGroupItem(mockSupabase, userId, groupId, queryId)).rejects.toThrow("Query ID cannot be empty");
    });

    it("should throw error when delete operation fails", async () => {
      // Arrange
      const queryId = "query-1";

      const groupOwnership = createGroupOwnershipMock();
      const deleteQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: { message: "Database error" }, count: null }],
      });

      enqueueFromBuilders(groupOwnership, deleteQuery);

      // Act & Assert
      await expect(removeGroupItem(mockSupabase, userId, groupId, queryId)).rejects.toThrow(
        "Failed to remove group item: Database error"
      );
    });

    it("should throw GroupNotFoundError when group does not belong to user", async () => {
      // Arrange
      const queryId = "query-1";
      const groupOwnership = createGroupOwnershipMock({ exists: false });

      enqueueFromBuilders(groupOwnership);

      // Act & Assert
      await expect(removeGroupItem(mockSupabase, userId, groupId, queryId)).rejects.toBeInstanceOf(GroupNotFoundError);
    });

    it("should surface errors when group ownership check fails", async () => {
      // Arrange
      const queryId = "query-1";
      const groupOwnership = createGroupOwnershipMock({ errorMessage: "Ownership error" });

      enqueueFromBuilders(groupOwnership);

      // Act & Assert
      await expect(removeGroupItem(mockSupabase, userId, groupId, queryId)).rejects.toThrow(
        "Failed to verify group ownership: Ownership error"
      );
    });
    it("should handle null count from delete operation", async () => {
      // Arrange
      const queryId = "query-1";

      const groupOwnership = createGroupOwnershipMock();
      const deleteQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: null, count: null }],
      });

      enqueueFromBuilders(groupOwnership, deleteQuery);

      // Act
      const result = await removeGroupItem(mockSupabase, userId, groupId, queryId);

      // Assert
      expect(result.removed).toBe(false);
    });
  });

  describe("getGroupItems", () => {
    it("should retrieve all queries in a group", async () => {
      // Arrange
      const mockData = [
        {
          query_id: "query-1",
          queries: {
            id: "query-1",
            query_text: "test query 1",
            url: "https://example.com",
            impressions: 1000,
            clicks: 50,
            ctr: 0.05,
            avg_position: 5.5,
            is_opportunity: false,
            date: "2024-01-01",
            created_at: "2024-01-01T00:00:00Z",
          },
        },
        {
          query_id: "query-2",
          queries: {
            id: "query-2",
            query_text: "test query 2",
            url: "https://example.com",
            impressions: 2000,
            clicks: 100,
            ctr: 0.05,
            avg_position: 3.5,
            is_opportunity: true,
            date: "2024-01-01",
            created_at: "2024-01-01T00:00:00Z",
          },
        },
      ];

      const groupOwnership = createGroupOwnershipMock();
      const selectQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: mockData, error: null, count: 2 }],
      });

      enqueueFromBuilders(groupOwnership, selectQuery);

      // Act
      const result = await getGroupItems(mockSupabase, userId, groupId);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      // Should be sorted by impressions descending
      expect(result.data[0].impressions).toBe(2000);
      expect(result.data[1].impressions).toBe(1000);
    });

    it("should return empty array when group has no items", async () => {
      // Arrange
      const groupOwnership = createGroupOwnershipMock();
      const selectQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: [], error: null, count: 0 }],
      });

      enqueueFromBuilders(groupOwnership, selectQuery);

      // Act
      const result = await getGroupItems(mockSupabase, userId, groupId);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should throw error when query fails", async () => {
      // Arrange
      const groupOwnership = createGroupOwnershipMock();
      const selectQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: null, error: { message: "Database error" }, count: null }],
      });

      enqueueFromBuilders(groupOwnership, selectQuery);

      // Act & Assert
      await expect(getGroupItems(mockSupabase, userId, groupId)).rejects.toThrow(
        "Failed to fetch group items: Database error"
      );
    });

    it("should apply pagination when provided", async () => {
      // Arrange
      const mockData = [
        {
          query_id: "query-1",
          queries: {
            id: "query-1",
            query_text: "test query 1",
            url: "https://example.com",
            impressions: 3000,
            clicks: 150,
            ctr: 0.05,
            avg_position: 2.5,
            is_opportunity: false,
            date: "2024-01-01",
            created_at: "2024-01-01T00:00:00Z",
          },
        },
        {
          query_id: "query-2",
          queries: {
            id: "query-2",
            query_text: "test query 2",
            url: "https://example.com",
            impressions: 2000,
            clicks: 100,
            ctr: 0.05,
            avg_position: 3.5,
            is_opportunity: true,
            date: "2024-01-01",
            created_at: "2024-01-01T00:00:00Z",
          },
        },
        {
          query_id: "query-3",
          queries: {
            id: "query-3",
            query_text: "test query 3",
            url: "https://example.com",
            impressions: 1000,
            clicks: 50,
            ctr: 0.05,
            avg_position: 5.5,
            is_opportunity: false,
            date: "2024-01-01",
            created_at: "2024-01-01T00:00:00Z",
          },
        },
      ];

      const groupOwnership = createGroupOwnershipMock();
      const selectQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ data: mockData, error: null, count: 3 }],
      });

      enqueueFromBuilders(groupOwnership, selectQuery);

      // Act - Get second page with limit 2
      const result = await getGroupItems(mockSupabase, userId, groupId, {
        limit: 2,
        offset: 1,
      });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.data[0].id).toBe("query-2");
      expect(result.data[1].id).toBe("query-3");
    });

    it("should throw GroupNotFoundError when group does not belong to user", async () => {
      // Arrange
      const groupOwnership = createGroupOwnershipMock({ exists: false });

      enqueueFromBuilders(groupOwnership);

      // Act & Assert
      await expect(getGroupItems(mockSupabase, userId, groupId)).rejects.toBeInstanceOf(GroupNotFoundError);
    });

    it("should surface errors when group ownership check fails", async () => {
      // Arrange
      const groupOwnership = createGroupOwnershipMock({ errorMessage: "Ownership error" });

      enqueueFromBuilders(groupOwnership);

      // Act & Assert
      await expect(getGroupItems(mockSupabase, userId, groupId)).rejects.toThrow(
        "Failed to verify group ownership: Ownership error"
      );
    });
  });
});
