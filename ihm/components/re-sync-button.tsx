/** Re-sync Button Component

Shows [Re-sync] action on stories flagged stale or in conflict.
Uses the action palette for operational states (UX-DR2).
Follows deterministic sync operations (NFR1) — no LLM calls for sync or state verification.
*/

"use client";

import React, { useState, useEffect } from "react";
import { reSyncStory } from "@/services/re-sync.service";
import { ReSyncErrorHandler } from "@/components/re-sync-error-handler";

type ResyncStateSignal = "Synced" | "Drift" | "Conflict" | "Syncing-Active" | "Claimed" | "Stale";

interface ResyncButtonProps {
  storyId: string;
  stateSignal: ResyncStateSignal;
  onResyncComplete?: (storyId: string, success: boolean) => void;
}

export function ResyncButton({ storyId, stateSignal, onResyncComplete }: ResyncButtonProps) {
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncError, setResyncError] = useState<string | null>(null);

  const isActionable = stateSignal === "Stale" || stateSignal === "Drift" || stateSignal === "Conflict";

  // Track if component is mounted to prevent state updates on unmounted component
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  const handleResync = async () => {
    if (!isActionable || isResyncing) return;

    setIsResyncing(true);
    setResyncError(null);

    try {
      const success = await reSyncStory(storyId);
      if (success && isMounted) {
        if (onResyncComplete) {
          try {
            onResyncComplete(storyId, true);
          } catch {
            // onResyncComplete callback threw an error, ignore and continue
          }
        }
      } else if (!success && isMounted) {
        console.error(`Re-sync failed for story ${storyId}: reSyncStory returned false`);
        setResyncError("Re-sync failed — retry");
        if (onResyncComplete) {
          try {
            onResyncComplete(storyId, false);
          } catch {
            // onResyncComplete callback threw an error, ignore and continue
          }
        }
      } else if (isMounted) {
        // success was false but we didn't set error or callback (should not happen based on logic)
        setResyncError("Re-sync failed — retry");
        if (onResyncComplete) {
          try {
            onResyncComplete(storyId, false);
          } catch {
            // onResyncComplete callback threw an error, ignore and continue
          }
        }
      }
    } catch (error) {
      console.error(`Re-sync failed for story ${storyId}:`, error);
      // Only set error if it's not an authentication error (handled separately)
      if (error instanceof Error && error.message !== "Authentication required" && isMounted) {
        setResyncError("Re-sync failed — retry");
        if (onResyncComplete && isMounted) {
          try {
            onResyncComplete(storyId, false);
          } catch {
            // onResyncComplete callback threw an error, ignore and continue
          }
        }
      } else if (error instanceof Error && error.message === "Authentication required" && isMounted) {
        // Auth error - still report failure but with appropriate context
        setResyncError("Re-sync failed — retry");
        if (onResyncComplete && isMounted) {
          try {
            onResyncComplete(storyId, false);
          } catch {
            // onResyncComplete callback threw an error, ignore and continue
          }
        }
      }
    } finally {
      if (isMounted) {
        setIsResyncing(false);
      }
    }
  };

  if (!isActionable) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleResync}
        disabled={isResyncing}
        className="inline-flex items-center gap-1.5 rounded-md bg-info/15 text-info px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-info/25 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Re-sync story"
      >
        {isResyncing ? (
          <>
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Re-syncing...</span>
          </>
        ) : (
          <span>Re-sync</span>
        )}
      </button>

      <ReSyncErrorHandler error={resyncError} />
    </div>
  );
}
