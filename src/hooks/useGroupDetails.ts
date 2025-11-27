import { useCallback } from "react";
import { useGroup } from "./useGroups";
import { useGroupItems, useRemoveGroupItem, useAddGroupItems } from "./useGroupItems";
import { useGroupActions } from "./useGroupActions";

/**
 * Combined hook for group details page
 * Manages group data, members, and coordinated refetching
 */

export interface UseGroupDetailsParams {
  groupId: string;
  limit: number;
  offset: number;
}

export interface UseGroupDetailsReturn {
  // Group data
  group: ReturnType<typeof useGroup>["data"];
  isLoadingGroup: boolean;
  groupError: ReturnType<typeof useGroup>["error"];

  // Members data
  members: ReturnType<typeof useGroupItems>["data"];
  membersMeta: ReturnType<typeof useGroupItems>["meta"];
  isLoadingMembers: boolean;

  // Group actions
  isRenamingId: string | null;
  isDeletingId: string | null;
  handleRename: (groupId: string, name: string) => Promise<void>;
  handleDelete: (groupId: string) => Promise<void>;

  // Member actions
  removingQueryId: string | null;
  isAddingItems: boolean;

  // Operations
  renameGroup: (name: string) => Promise<void>;
  removeQuery: (queryId: string) => Promise<void>;
  addQueries: (queryIds: string[]) => Promise<void>;

  // Coordinated refresh
  refreshAll: () => void;
}

export function useGroupDetails({ groupId, limit, offset }: UseGroupDetailsParams): UseGroupDetailsReturn {
  // Fetch group data
  const { data: group, isLoading: isLoadingGroup, error: groupError, refetch: refetchGroup } = useGroup(groupId);

  // Fetch member queries
  const {
    data: members,
    meta: membersMeta,
    isLoading: isLoadingMembers,
    refetch: refetchMembers,
  } = useGroupItems(groupId, {
    limit,
    offset,
  });

  // Group actions (rename, delete)
  const { isRenamingId, isDeletingId, handleRename, handleDelete } = useGroupActions({
    refetch: refetchGroup,
  });

  // Remove query from group
  const { removeItem, removingQueryId } = useRemoveGroupItem();

  // Add queries to group
  const { addItems, isLoading: isAddingItems } = useAddGroupItems();

  // Coordinated refresh - refresh both group and members
  const refreshAll = useCallback(() => {
    refetchGroup();
    refetchMembers();
  }, [refetchGroup, refetchMembers]);

  // Rename group with refresh
  const renameGroup = useCallback(
    async (name: string) => {
      await handleRename(groupId, name);
      refetchGroup();
    },
    [groupId, handleRename, refetchGroup]
  );

  // Remove query with coordinated refresh
  const removeQuery = useCallback(
    async (queryId: string) => {
      await removeItem(groupId, queryId);
      refreshAll();
    },
    [groupId, removeItem, refreshAll]
  );

  // Add queries with coordinated refresh
  const addQueries = useCallback(
    async (queryIds: string[]) => {
      await addItems(groupId, queryIds);
      refreshAll();
    },
    [groupId, addItems, refreshAll]
  );

  return {
    // Group data
    group,
    isLoadingGroup,
    groupError,

    // Members data
    members,
    membersMeta,
    isLoadingMembers,

    // Group actions
    isRenamingId,
    isDeletingId,
    handleRename,
    handleDelete,

    // Member actions
    removingQueryId,
    isAddingItems,

    // Operations
    renameGroup,
    removeQuery,
    addQueries,

    // Coordinated refresh
    refreshAll,
  };
}
