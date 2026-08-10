/** Re-sync Service

Handles re-sync API calls independently per story.
When triggered, each story re-fetches its latest Git-linked state independently.
All sync operations must be 100% deterministic (scripts CLI, parsing fichiers, commandes Git).
*/

import { API_BASE_URL } from "@/lib/auth";
import { getToken } from "@/lib/auth";

export interface ResyncResponse {
  storyId: string;
  success: boolean;
  error?: string;
  gitState?: {
    technical_identifier: string;
    branch: string | null;
    ahead: number;
    behind: number;
    in_progress_action: string;
    last_updated: string;
    is_stale: boolean;
  };
}

/**
 * Re-sync a single story by fetching its latest Git-linked state independently.
 *
 * Returns true if the re-sync was successful, false otherwise.
 * If the Backend sync service is unavailable or returning errors, returns false.
 * If no token is present, throws an error for authentication required.
 */
export async function reSyncStory(storyId: string): Promise<boolean> {
  const token = getToken();
  if (!token) {
    throw new Error("Authentication required");
  }

  // Sanitize and encode storyId to prevent malformed URLs
  const encodedStoryId = encodeURIComponent(storyId);
  const url = `${API_BASE_URL}/api/stories/${encodedStoryId}/re-sync`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Backend sync service is unavailable or returning errors
      return false;
    }

    const data: ResyncResponse = await response.json();
    // Validate success field is boolean
    if (typeof data.success !== "boolean") {
      return false;
    }
    return data.success;
  } catch {
    // Network error or other failure
    return false;
  }
}

/**
 * Re-sync multiple stories independently.
 *
 * Each story re-fetches its latest Git-linked state independently.
 * If a story fails to re-sync, it shows an inline error without blocking the others that succeed.
 *
 * Returns an array of results with success/failure status for each story.
 */
export async function reSyncStories(storyIds: string[]): Promise<ResyncResponse[]> {
  const results: ResyncResponse[] = [];

  // Handle empty array case
  if (storyIds.length === 0) {
    return results;
  }

  // Process each story independently
  const promises = storyIds.map(async (storyId) => {
    try {
      const success = await reSyncStory(storyId);
      return {
        storyId,
        success,
        error: success ? undefined : "Re-sync failed — retry",
      } as ResyncResponse;
    } catch {
      return {
        storyId,
        success: false,
        error: "Re-sync failed — retry",
      } as ResyncResponse;
    }
  });

  // Wait for all promises to complete (no blocking between stories)
  const outcomes = await Promise.all(promises);

  for (const outcome of outcomes) {
    results.push(outcome);
  }

  return results;
}
