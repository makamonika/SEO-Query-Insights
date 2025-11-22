import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupById,
  DuplicateGroupNameError,
} from "@/lib/services/groups.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import {
  createSupabaseClientMock,
  createPostgrestQueryBuilderMock,
  type PostgrestQueryBuilderMock,
} from "@/test/utils/mockSupabaseClient";

// Mock dependencies
vi.mock("@/lib/services/group-items.service", () => ({
  addGroupItems: vi.fn().mockResolvedValue({ addedCount: 2 }),
}));

vi.mock("@/lib/services/group-metrics.service", () => ({
  recomputeAndPersistGroupMetrics: vi.fn().mockResolvedValue({
    metrics: { impressions: 1000, clicks: 50, ctr: 0.05, avgPosition: 5.5 },
    queryCount: 2,
  }),
  extractPersistedMetrics: vi.fn().mockReturnValue({
    metrics: { impressions: 1000, clicks: 50, ctr: 0.05, avgPosition: 5.5 },
    queryCount: 2,
  }),
}));

vi.mock("@/lib/mappers", () => ({
  mapGroupRowBase: vi.fn((row) => ({
    id: row.id,
    name: row.name,
    userId: row.user_id,
    aiGenerated: row.ai_generated,
    createdAt: row.created_at,
  })),
}));

describe("Group Service", () => {
  let mockSupabase: SupabaseClient<Database>;
  let fromQueue: PostgrestQueryBuilderMock[];

  function enqueueFromBuilders(...builders: PostgrestQueryBuilderMock[]) {
    fromQueue.push(...builders);
  }

  const userId = "user-123";

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

  describe("GRP-01: Create a new group from selected queries", () => {
    it("should create a group with valid name and selected queries", async () => {
      // Arrange
      const groupName = "SEO Keywords";
      const queryIds = ["query-1", "query-2"];

      // Mock duplicate name check (no duplicates)
      const duplicateCheckQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ count: 0, error: null }],
      });

      // Mock group creation
      const mockGroupData = {
        id: "group-123",
        name: groupName,
        user_id: userId,
        ai_generated: false,
        created_at: "2024-01-01T00:00:00Z",
      };

      const insertQuery = createPostgrestQueryBuilderMock({
        singleResponses: [{ data: mockGroupData, error: null }],
      });

      enqueueFromBuilders(duplicateCheckQuery, insertQuery);

      // Act
      const result = await createGroup(mockSupabase, userId, {
        name: groupName,
        queryIds,
      });

      // Assert
      expect(result).toMatchObject({
        id: "group-123",
        name: groupName,
        queryCount: 2,
        metricsImpressions: 1000,
        metricsClicks: 50,
        metricsCtr: 0.05,
        metricsAvgPosition: 5.5,
      });
    });

    it("should create a group without queries", async () => {
      // Arrange
      const groupName = "Empty Group";

      const duplicateCheckQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ count: 0, error: null }],
      });

      // Mock group creation
      const mockGroupData = {
        id: "group-456",
        name: groupName,
        user_id: userId,
        ai_generated: false,
        created_at: "2024-01-01T00:00:00Z",
      };

      const insertQuery = createPostgrestQueryBuilderMock({
        singleResponses: [{ data: mockGroupData, error: null }],
      });

      enqueueFromBuilders(duplicateCheckQuery, insertQuery);

      // Act
      const result = await createGroup(mockSupabase, userId, {
        name: groupName,
      });

      // Assert
      expect(result).toMatchObject({
        id: "group-456",
        name: groupName,
        queryCount: 0,
        metricsImpressions: 0,
        metricsClicks: 0,
        metricsCtr: 0,
        metricsAvgPosition: 0,
      });
    });

    it("should trim whitespace from group name", async () => {
      // Arrange
      const groupName = "  Trimmed Name  ";
      const expectedName = "Trimmed Name";

      const duplicateCheckQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ count: 0, error: null }],
      });

      // Mock group creation
      const mockGroupData = {
        id: "group-789",
        name: expectedName,
        user_id: userId,
        ai_generated: false,
        created_at: "2024-01-01T00:00:00Z",
      };

      const insertQuery = createPostgrestQueryBuilderMock({
        singleResponses: [{ data: mockGroupData, error: null }],
      });

      enqueueFromBuilders(duplicateCheckQuery, insertQuery);

      // Act
      const result = await createGroup(mockSupabase, userId, {
        name: groupName,
      });

      // Assert
      expect(result.name).toBe(expectedName);
    });

    it("should throw error when group name is empty", async () => {
      // Arrange
      const groupName = "   ";

      // Act & Assert
      await expect(createGroup(mockSupabase, userId, { name: groupName })).rejects.toThrow(
        "Group name cannot be empty"
      );
    });

    it("should throw error when database insert fails", async () => {
      // Arrange
      const groupName = "Test Group";

      const duplicateCheckQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ count: 0, error: null }],
      });

      // Mock failed insert
      const insertQuery = createPostgrestQueryBuilderMock({
        singleResponses: [{ data: null, error: { message: "Database error" } }],
      });

      enqueueFromBuilders(duplicateCheckQuery, insertQuery);

      // Act & Assert
      await expect(createGroup(mockSupabase, userId, { name: groupName })).rejects.toThrow(
        "Failed to create group: Database error"
      );
    });
  });

  describe("GRP-02: Attempt to create a group with a duplicate name", () => {
    it("should throw DuplicateGroupNameError when name already exists", async () => {
      // Arrange
      const groupName = "Existing Group";

      const duplicateCheckQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ count: 1, error: null }],
      });

      const duplicateCheckQuerySecond = createPostgrestQueryBuilderMock({
        thenResponses: [{ count: 1, error: null }],
      });

      enqueueFromBuilders(duplicateCheckQuery, duplicateCheckQuerySecond);

      // Act & Assert
      await expect(createGroup(mockSupabase, userId, { name: groupName })).rejects.toThrow(DuplicateGroupNameError);

      await expect(createGroup(mockSupabase, userId, { name: groupName })).rejects.toThrow(
        "A group with this name already exists"
      );
    });

    it("should perform case-insensitive duplicate check", async () => {
      // Arrange
      const groupName = "Test Group";

      const duplicateCheckQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ count: 1, error: null }],
      });

      enqueueFromBuilders(duplicateCheckQuery);

      // Act & Assert
      await expect(createGroup(mockSupabase, userId, { name: groupName })).rejects.toThrow(DuplicateGroupNameError);
    });
  });

  describe("GRP-05: Rename an existing group", () => {
    it("should successfully rename a group", async () => {
      // Arrange
      const groupId = "group-123";
      const newName = "Updated Group Name";

      const duplicateCheckQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ count: 0, error: null }],
      });

      // Mock update operation
      const mockUpdatedGroup = {
        id: groupId,
        name: newName,
        user_id: userId,
        ai_generated: false,
        created_at: "2024-01-01T00:00:00Z",
      };

      const updateQuery = createPostgrestQueryBuilderMock({
        maybeSingleResponses: [{ data: mockUpdatedGroup, error: null }],
      });

      enqueueFromBuilders(duplicateCheckQuery, updateQuery);

      // Act
      const result = await updateGroup(mockSupabase, userId, groupId, {
        name: newName,
      });

      // Assert
      expect(result).not.toBeNull();
      expect(result?.name).toBe(newName);
    });

    it("should throw DuplicateGroupNameError when renaming to existing name", async () => {
      // Arrange
      const groupId = "group-123";
      const newName = "Existing Name";

      const duplicateCheckQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ count: 1, error: null }],
      });

      enqueueFromBuilders(duplicateCheckQuery);

      // Act & Assert
      await expect(updateGroup(mockSupabase, userId, groupId, { name: newName })).rejects.toThrow(
        DuplicateGroupNameError
      );
    });

    it("should return null when group not found", async () => {
      // Arrange
      const groupId = "non-existent-group";
      const newName = "New Name";

      const duplicateCheckQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ count: 0, error: null }],
      });

      const updateQuery = createPostgrestQueryBuilderMock({
        maybeSingleResponses: [{ data: null, error: null }],
      });

      enqueueFromBuilders(duplicateCheckQuery, updateQuery);

      // Act
      const result = await updateGroup(mockSupabase, userId, groupId, {
        name: newName,
      });

      // Assert
      expect(result).toBeNull();
    });

    it("should trim whitespace when renaming", async () => {
      // Arrange
      const groupId = "group-123";
      const newName = "  Trimmed Name  ";
      const expectedName = "Trimmed Name";

      const duplicateCheckQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ count: 0, error: null }],
      });

      const mockUpdatedGroup = {
        id: groupId,
        name: expectedName,
        user_id: userId,
        ai_generated: false,
        created_at: "2024-01-01T00:00:00Z",
      };

      const updateQuery = createPostgrestQueryBuilderMock({
        maybeSingleResponses: [{ data: mockUpdatedGroup, error: null }],
      });

      enqueueFromBuilders(duplicateCheckQuery, updateQuery);

      // Act
      const result = await updateGroup(mockSupabase, userId, groupId, {
        name: newName,
      });

      // Assert
      expect(result?.name).toBe(expectedName);
    });
  });

  describe("GRP-06: Delete an entire group", () => {
    it("should successfully delete a group", async () => {
      // Arrange
      const groupId = "group-123";

      const deleteQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: null, count: 1 }],
      });

      enqueueFromBuilders(deleteQuery);

      // Act
      const result = await deleteGroup(mockSupabase, userId, groupId);

      // Assert
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("groups");
      expect(deleteQuery.delete).toHaveBeenCalledWith({ count: "exact" });
    });

    it("should return false when group not found", async () => {
      // Arrange
      const groupId = "non-existent-group";

      const deleteQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: null, count: 0 }],
      });

      enqueueFromBuilders(deleteQuery);

      // Act
      const result = await deleteGroup(mockSupabase, userId, groupId);

      // Assert
      expect(result).toBe(false);
    });

    it("should throw error when delete operation fails", async () => {
      // Arrange
      const groupId = "group-123";

      const deleteQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: { message: "Database error" }, count: null }],
      });

      enqueueFromBuilders(deleteQuery);

      // Act & Assert
      await expect(deleteGroup(mockSupabase, userId, groupId)).rejects.toThrow(
        "Failed to delete group: Database error"
      );
    });

    it("should handle null count from delete operation", async () => {
      // Arrange
      const groupId = "group-123";

      const deleteQuery = createPostgrestQueryBuilderMock({
        thenResponses: [{ error: null, count: null }],
      });

      enqueueFromBuilders(deleteQuery);

      // Act
      const result = await deleteGroup(mockSupabase, userId, groupId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("getGroupById", () => {
    it("should retrieve a group by ID", async () => {
      // Arrange
      const groupId = "group-123";
      const mockGroupData = {
        id: groupId,
        name: "Test Group",
        user_id: userId,
        ai_generated: false,
        created_at: "2024-01-01T00:00:00Z",
      };

      const selectQuery = createPostgrestQueryBuilderMock({
        maybeSingleResponses: [{ data: mockGroupData, error: null }],
      });

      enqueueFromBuilders(selectQuery);

      // Act
      const result = await getGroupById(mockSupabase, userId, groupId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(groupId);
      expect(result?.name).toBe("Test Group");
    });

    it("should return null when group not found", async () => {
      // Arrange
      const groupId = "non-existent-group";

      const selectQuery = createPostgrestQueryBuilderMock({
        maybeSingleResponses: [{ data: null, error: null }],
      });

      enqueueFromBuilders(selectQuery);

      // Act
      const result = await getGroupById(mockSupabase, userId, groupId);

      // Assert
      expect(result).toBeNull();
    });

    it("should throw error when query fails", async () => {
      // Arrange
      const groupId = "group-123";

      const selectQuery = createPostgrestQueryBuilderMock({
        maybeSingleResponses: [{ data: null, error: { message: "Database error" } }],
      });

      enqueueFromBuilders(selectQuery);

      // Act & Assert
      await expect(getGroupById(mockSupabase, userId, groupId)).rejects.toThrow(
        "Failed to fetch group: Database error"
      );
    });
  });
});
