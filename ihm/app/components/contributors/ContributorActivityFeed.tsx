/** Contributor Activity/Event Feed Component (UX-DR9)
 *
 * Flux vertical chronologique (plus récent en premier), plafonné à 20 entrées visibles + "Charger plus".
 */

"use client";

import React from "react";

interface ActivityEvent {
  id: string;
  timestamp: string;
  action: string;
  details: string;
}

interface ContributorActivityFeedProps {
  events: ActivityEvent[];
  hasProjectAccess: boolean;
  on_loadMore?: () => void;
}

export function ContributorActivityFeed({
  events,
  hasProjectAccess,
  on_loadMore,
}: ContributorActivityFeedProps) {
  if (!hasProjectAccess) {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface px-4 py-6 text-center">
        <h3 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
          Activity Feed
        </h3>
        <p className="text-sm text-text-secondary">Requires project access</p>
      </div>
    );
  }

  // Cap at 20 entries
  const visibleEvents = events.slice(0, 20);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <h3 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
        Activity Feed
      </h3>
      <div className="flex flex-col gap-3" aria-label="Recent activity events">
        {visibleEvents.length === 0 ? (
          <p className="text-sm text-text-secondary">No recent activity</p>
        ) : (
          visibleEvents.map((event) => (
            <div
              key={event.id}
              className="flex flex-col gap-1 border-l-2 border-border pl-3 py-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{event.action}</span>
                <span className="text-xs text-text-secondary">{event.timestamp}</span>
              </div>
              <p className="text-xs text-text-secondary">{event.details}</p>
            </div>
          ))
        )}
      </div>
      {events.length > 20 && on_loadMore && (
        <button
          type="button"
          className="mt-3 inline-flex items-center justify-center rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-surface/80 transition-colors"
          onClick={on_loadMore}
        >
          Charger plus
        </button>
      )}
    </div>
  );
}
