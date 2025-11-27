import type { GroupDto, CreateGroupRequestDto, UpdateGroupRequestDto } from "@/types";

/**
 * Client-side service for Groups API calls
 * Handles HTTP requests to /api/groups endpoints
 */
export const GroupsClientService = {
  /**
   * Create a new group
   */
  async createGroup(
    data: CreateGroupRequestDto,
    queryIds: string[] = []
  ): Promise<{ success: boolean; data?: GroupDto; error?: string }> {
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          queryIds,
        }),
      });

      if (!response.ok) {
        return { success: false, error: response.statusText };
      }

      const createdGroup: GroupDto = await response.json();
      return { success: true, data: createdGroup };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  },

  /**
   * Update an existing group
   */
  async updateGroup(
    groupId: string,
    data: UpdateGroupRequestDto
  ): Promise<{ success: boolean; data?: GroupDto; error?: string }> {
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        return { success: false, error: response.statusText };
      }

      const updatedGroup: GroupDto = await response.json();
      return { success: true, data: updatedGroup };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  },

  /**
   * Delete a group
   */
  async deleteGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        return { success: false, error: response.statusText };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  },
};
