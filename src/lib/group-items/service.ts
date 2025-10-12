/**
 * Group Items Service
 * 
 * Handles adding and removing query texts from groups.
 * Enforces ownership validation and tracks user actions.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';

export type AddGroupItemsResult = {
  addedCount: number;
};

export type RemoveGroupItemResult = {
  removed: boolean;
};

/**
 * Custom error for group not found or unauthorized access
 */
export class GroupNotFoundError extends Error {
  constructor(message = 'Group not found or access denied') {
    super(message);
    this.name = 'GroupNotFoundError';
  }
}

/**
 * Verify that a group exists and belongs to the specified user
 * @throws GroupNotFoundError if group doesn't exist or user doesn't own it
 */
async function verifyGroupOwnership(
  supabase: SupabaseClient<Database>,
  userId: string,
  groupId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify group ownership: ${error.message}`);
  }

  if (!data) {
    throw new GroupNotFoundError();
  }
}

/**
 * Add multiple query texts to a group
 * - Normalizes query texts to lowercase
 * - Deduplicates input
 * - Checks for existing items to avoid duplicates
 * - Tracks action in user_actions table
 */
export async function addGroupItems(
  supabase: SupabaseClient<Database>,
  userId: string,
  groupId: string,
  queryTexts: string[]
): Promise<AddGroupItemsResult> {
  // Step 1: Verify group exists and belongs to user
  await verifyGroupOwnership(supabase, userId, groupId);

  // Step 2: Normalize and deduplicate query texts
  const normalizedTexts = [...new Set(
    queryTexts.map(text => text.trim().toLowerCase()).filter(text => text.length > 0)
  )];

  if (normalizedTexts.length === 0) {
    return { addedCount: 0 };
  }

  // Step 3: Check which items already exist
  const { data: existingItems, error: checkError } = await supabase
    .from('group_items')
    .select('query_text')
    .eq('group_id', groupId)
    .in('query_text', normalizedTexts);

  if (checkError) {
    throw new Error(`Failed to check existing items: ${checkError.message}`);
  }

  const existingTexts = new Set(existingItems?.map(item => item.query_text.toLowerCase()) ?? []);
  const newTexts = normalizedTexts.filter(text => !existingTexts.has(text));

  if (newTexts.length === 0) {
    return { addedCount: 0 };
  }

  // Step 4: Insert new items
  const itemsToInsert = newTexts.map(queryText => ({
    group_id: groupId,
    query_text: queryText,
  }));

  const { error: insertError } = await supabase
    .from('group_items')
    .insert(itemsToInsert);

  if (insertError) {
    throw new Error(`Failed to insert group items: ${insertError.message}`);
  }

  const addedCount = newTexts.length;

  // Step 5: Track user action
  if (addedCount > 0) {
    await supabase.from('user_actions').insert({
      user_id: userId,
      action_type: 'group_item_added',
      target_id: groupId,
      metadata: { count: addedCount, queryTexts: newTexts },
    });
  }

  return { addedCount };
}

/**
 * Remove a single query text from a group
 * - Normalizes query text to lowercase
 * - Tracks action in user_actions table
 */
export async function removeGroupItem(
  supabase: SupabaseClient<Database>,
  userId: string,
  groupId: string,
  queryText: string
): Promise<RemoveGroupItemResult> {
  // Step 1: Verify group exists and belongs to user
  await verifyGroupOwnership(supabase, userId, groupId);

  // Step 2: Normalize query text
  const normalizedText = queryText.trim().toLowerCase();

  if (normalizedText.length === 0) {
    throw new Error('Query text cannot be empty');
  }

  // Step 3: Delete the item
  const { error, count } = await supabase
    .from('group_items')
    .delete({ count: 'exact' })
    .eq('group_id', groupId)
    .eq('query_text', normalizedText);

  if (error) {
    throw new Error(`Failed to remove group item: ${error.message}`);
  }

  const removed = (count ?? 0) > 0;

  // Step 4: Track user action if item was removed
  if (removed) {
    await supabase.from('user_actions').insert({
      user_id: userId,
      action_type: 'group_item_removed',
      target_id: groupId,
      metadata: { queryText: normalizedText },
    });
  }

  return { removed };
}

