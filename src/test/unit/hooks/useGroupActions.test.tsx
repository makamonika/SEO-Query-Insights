import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGroupActions } from "@/hooks/useGroupActions";
import type { UseGroupActionsResult } from "@/hooks/useGroupActions";
import type { CreateGroupRequestDto, UpdateGroupRequestDto } from "@/types";

// Mock sonner toast - must be defined before vi.mock
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Import mocked toast for assertions
import { toast } from "sonner";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

interface PendingAction<T> {
  promise: Promise<T>;
}

async function startCreateAction(
  result: { current: UseGroupActionsResult },
  payload: CreateGroupRequestDto,
  queryIds: string[]
): Promise<PendingAction<boolean>> {
  let pendingPromise!: Promise<boolean>;
  await act(async () => {
    pendingPromise = result.current.handleCreate(payload, queryIds);
    await Promise.resolve();
  });
  return { promise: pendingPromise };
}

async function startRenameAction(
  result: { current: UseGroupActionsResult },
  groupId: string,
  name: string
): Promise<PendingAction<void>> {
  let pendingPromise!: Promise<void>;
  await act(async () => {
    pendingPromise = result.current.handleRename(groupId, name);
    await Promise.resolve();
  });
  return { promise: pendingPromise };
}

async function startDeleteAction(
  result: { current: UseGroupActionsResult },
  groupId: string
): Promise<PendingAction<void>> {
  let pendingPromise!: Promise<void>;
  await act(async () => {
    pendingPromise = result.current.handleDelete(groupId);
    await Promise.resolve();
  });
  return { promise: pendingPromise };
}

async function clearCreateErrorAction(result: { current: UseGroupActionsResult }) {
  await act(async () => {
    result.current.clearCreateError();
    await Promise.resolve();
  });
}

async function finishAsyncAction<T>(promise: Promise<T>) {
  await promise;
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useGroupActions Hook", () => {
  const mockRefetch = vi.fn();
  const mockSetEditingId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("GRP-01: Create a new group from selected queries", () => {
    it("should successfully create a group with queries", async () => {
      // Arrange
      const mockResponse = {
        id: "group-123",
        name: "Test Group",
        userId: "user-123",
        aiGenerated: false,
        createdAt: "2024-01-01T00:00:00Z",
        queryCount: 2,
        metrics: { impressions: 1000, clicks: 50, ctr: 0.05, avgPosition: 5.5 },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      const payload: CreateGroupRequestDto = {
        name: "Test Group",
        aiGenerated: false,
      };
      const queryIds = ["query-1", "query-2"];

      // Act
      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.handleCreate(payload, queryIds);
      });

      // Assert
      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, queryIds }),
      });
      expect(toast.success).toHaveBeenCalledWith("Group created", {
        description: 'Group "Test Group" created with 2 queries',
      });
      expect(mockRefetch).toHaveBeenCalled();
    });

    it("should set isCreatingGroup to true during creation", async () => {
      // Arrange
      const deferred = createDeferred<Response>();
      vi.mocked(global.fetch).mockReturnValueOnce(deferred.promise);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      const payload: CreateGroupRequestDto = { name: "Test Group" };

      // Act
      const { promise: createPromise } = await startCreateAction(result, payload, ["query-1"]);

      // Assert - should be loading
      expect(result.current.isCreatingGroup).toBe(true);

      await act(async () => {
        deferred.resolve({
          ok: true,
          json: async () => ({ name: "Test Group" }),
        } as Response);
        await Promise.resolve();
      });

      await finishAsyncAction(createPromise);

      // Assert - should no longer be loading
      expect(result.current.isCreatingGroup).toBe(false);
    });

    it("should show success notification after creating group", async () => {
      // Arrange
      const mockResponse = {
        name: "SEO Keywords",
        queryCount: 5,
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      await act(async () => {
        await result.current.handleCreate({ name: "SEO Keywords" }, ["q1", "q2", "q3", "q4", "q5"]);
      });

      // Assert
      expect(toast.success).toHaveBeenCalledWith("Group created", {
        description: 'Group "SEO Keywords" created with 5 queries',
      });
    });
  });

  describe("GRP-02: Attempt to create a group with a duplicate name", () => {
    it("should set error when creating group with duplicate name", async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: { code: "conflict", message: "Duplicate name" },
        }),
      } as Response);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      const { promise: createPromise } = await startCreateAction(result, { name: "Existing Group" }, ["query-1"]);
      const success = await createPromise;

      // Assert
      expect(success).toBe(false);
      expect(result.current.createGroupError).toBe("A group with this name already exists");
      expect(toast.success).not.toHaveBeenCalled();
      expect(mockRefetch).not.toHaveBeenCalled();
    });

    it("should display error message for duplicate name", async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 409,
      } as Response);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      const { promise: createPromise } = await startCreateAction(result, { name: "Duplicate" }, ["query-1"]);
      await createPromise;

      // Assert
      expect(result.current.createGroupError).toBe("A group with this name already exists");
    });

    it("should clear create error when clearCreateError is called", async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 409,
      } as Response);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      const { promise: createPromise } = await startCreateAction(result, { name: "Duplicate" }, ["query-1"]);
      await createPromise;

      // Act
      await clearCreateErrorAction(result);

      // Assert
      expect(result.current.createGroupError).toBeUndefined();
    });
  });

  describe("GRP-05: Rename an existing group", () => {
    it("should successfully rename a group", async () => {
      // Arrange
      const groupId = "group-123";
      const newName = "Updated Group Name";

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: newName }),
      } as Response);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
          setEditingId: mockSetEditingId,
        })
      );

      // Act
      await act(async () => {
        await result.current.handleRename(groupId, newName);
      });

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName } as UpdateGroupRequestDto),
      });
      expect(toast.success).toHaveBeenCalledWith("Group renamed", {
        description: `Group renamed to "${newName}"`,
      });
      expect(mockSetEditingId).toHaveBeenCalledWith(null);
      expect(mockRefetch).toHaveBeenCalled();
    });

    it("should trim whitespace before renaming", async () => {
      // Arrange
      const groupId = "group-123";
      const nameWithWhitespace = "  Trimmed Name  ";
      const trimmedName = "Trimmed Name";

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: trimmedName }),
      } as Response);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      await act(async () => {
        await result.current.handleRename(groupId, nameWithWhitespace);
      });

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
    });

    it("should show error when renaming to empty string", async () => {
      // Arrange
      const groupId = "group-123";
      const emptyName = "   ";

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      await act(async () => {
        await result.current.handleRename(groupId, emptyName);
      });

      // Assert
      expect(toast.error).toHaveBeenCalledWith("Invalid name", {
        description: "Group name cannot be empty",
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle 404 error when group not found", async () => {
      // Arrange
      const groupId = "non-existent-group";

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: { code: "not_found", message: "Group not found" },
        }),
      } as Response);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      await act(async () => {
        await result.current.handleRename(groupId, "New Name");
      });

      // Assert
      expect(toast.error).toHaveBeenCalledWith("Group not found", {
        description: "This group may have been deleted",
      });
      expect(mockRefetch).toHaveBeenCalled();
    });

    it("should handle 409 error when renaming to duplicate name", async () => {
      // Arrange
      const groupId = "group-123";

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: { code: "conflict", message: "Duplicate name" },
        }),
      } as Response);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      await act(async () => {
        await result.current.handleRename(groupId, "Existing Name");
      });

      // Assert
      expect(toast.error).toHaveBeenCalledWith("Name already exists", {
        description: "A group with this name already exists",
      });
      expect(mockRefetch).not.toHaveBeenCalled();
    });

    it("should set isRenamingId during rename operation", async () => {
      // Arrange
      const groupId = "group-123";

      const deferred = createDeferred<Response>();
      vi.mocked(global.fetch).mockReturnValueOnce(deferred.promise);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      const { promise: renamePromise } = await startRenameAction(result, groupId, "New Name");

      // Assert - should be renaming
      expect(result.current.isRenamingId).toBe(groupId);

      await act(async () => {
        deferred.resolve({
          ok: true,
          json: async () => ({ name: "New Name" }),
        } as Response);
        await Promise.resolve();
      });

      await finishAsyncAction(renamePromise);

      // Assert - should no longer be renaming
      expect(result.current.isRenamingId).toBeNull();
    });
  });

  describe("GRP-06: Delete an entire group", () => {
    it("should successfully delete a group", async () => {
      // Arrange
      const groupId = "group-123";

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      await act(async () => {
        await result.current.handleDelete(groupId);
      });

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(`/api/groups/${groupId}`, {
        method: "DELETE",
      });
      expect(toast.success).toHaveBeenCalledWith("Group deleted", {
        description: "Group deleted successfully",
      });
      expect(mockRefetch).toHaveBeenCalled();
    });

    it("should handle 404 error when deleting non-existent group", async () => {
      // Arrange
      const groupId = "non-existent-group";

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: { code: "not_found", message: "Group not found" },
        }),
      } as Response);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      await act(async () => {
        await result.current.handleDelete(groupId);
      });

      // Assert
      expect(toast.error).toHaveBeenCalledWith("Group not found", {
        description: "This group may have been already deleted",
      });
      expect(mockRefetch).toHaveBeenCalled();
    });

    it("should set isDeletingId during delete operation", async () => {
      // Arrange
      const groupId = "group-123";

      const deferred = createDeferred<Response>();
      vi.mocked(global.fetch).mockReturnValueOnce(deferred.promise);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      const { promise: deletePromise } = await startDeleteAction(result, groupId);

      // Assert - should be deleting
      expect(result.current.isDeletingId).toBe(groupId);

      await act(async () => {
        deferred.resolve({
          ok: true,
          json: async () => ({}),
        } as Response);
        await Promise.resolve();
      });

      await finishAsyncAction(deletePromise);

      // Assert - should no longer be deleting
      expect(result.current.isDeletingId).toBeNull();
    });

    it("should show error toast when delete fails", async () => {
      // Arrange
      const groupId = "group-123";

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: { code: "internal", message: "Server error" },
        }),
      } as Response);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      await act(async () => {
        await result.current.handleDelete(groupId);
      });

      // Assert
      expect(toast.error).toHaveBeenCalledWith("Failed to delete group", {
        description: "Server error",
      });
    });
  });

  describe("handleView", () => {
    it("should navigate to group details page", () => {
      // Arrange
      const groupId = "group-123";
      const originalHref = window.location.href;

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      result.current.handleView(groupId);

      // Assert
      expect(window.location.pathname).toBe(`/groups/${groupId}`);

      // Cleanup
      window.location.href = originalHref;
    });
  });

  describe("Error Handling", () => {
    it("should handle 400 validation error", async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { code: "validation_error", message: "Invalid group data" },
        }),
      } as Response);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      const { promise: createPromise } = await startCreateAction(result, { name: "" }, ["query-1"]);
      const success = await createPromise;

      // Assert
      expect(success).toBe(false);
      expect(result.current.createGroupError).toBe("Invalid group data");
    });

    it("should handle 401 authentication error", async () => {
      vi.useFakeTimers();
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: { code: "unauthorized", message: "Not authenticated" },
        }),
      } as Response);

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      const { promise: createPromise } = await startCreateAction(result, { name: "Test" }, ["query-1"]);
      const success = await createPromise;

      // Assert
      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith("Authentication required", {
        description: "Redirecting to login...",
      });

      // Fast-forward timers to trigger redirect
      vi.advanceTimersByTime(1000);

      // Note: In a real test, we'd check window.location.href, but it's complex in jsdom
    });

    it("should handle network error", async () => {
      // Arrange
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useGroupActions({
          refetch: mockRefetch,
        })
      );

      // Act
      const { promise: createPromise } = await startCreateAction(result, { name: "Test" }, ["query-1"]);
      const success = await createPromise;

      // Assert
      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith("Failed to create group", {
        description: "Network error",
      });
    });
  });
});
