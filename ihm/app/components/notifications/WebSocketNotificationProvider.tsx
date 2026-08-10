/** WebSocket Notification Provider Component (Story 3.7)
 *
 * Integrates the WebSocket client with the toast provider to display
 * non-intrusive toast notifications for claim, sync, and conflict events.
 */

import React, { useEffect, useRef } from "react";
import { RealtimeConnection, ConnectionStatus, NotificationEvent } from "../../../lib/websocket";
import { useToast } from "../ui/toast-provider";

interface WebSocketNotificationProviderProps {
  children: React.ReactNode;
}

export function WebSocketNotificationProvider({ children }: WebSocketNotificationProviderProps) {
  const { addToast } = useToast();
  const connectionRef = useRef<RealtimeConnection | null>(null);

  useEffect(() => {
    if (!connectionRef.current) {
      connectionRef.current = new RealtimeConnection(
        (status: ConnectionStatus) => {
          // Status changes are handled by the RealTimeStatusBar component
        },
        (event: NotificationEvent) => {
          // Handle notification events and display toast notifications
          switch (event.type) {
            case "claim_event":
              if (event.action === "claimed") {
                addToast({
                  variant: "success",
                  title: "Story Claimed",
                  message: `Story ${event.storyId} claimed by user ${event.userId}`,
                });
              } else {
                addToast({
                  variant: "info",
                  title: "Story Released",
                  message: `Story ${event.storyId} release by user ${event.userId}`,
                });
              }
              break;
            case "claim_conflict":
              addToast({
                variant: "warning",
                title: "Claim Conflict Detected",
                message: `Conflict detected on story ${event.storyId}. Re-sync required.`,
              });
              break;
            case "sync_complete":
              const syncTarget = event.storyId || event.repository || "repository";
              addToast({
                variant: "success",
                title: "Sync Completed",
                message: `Sync completed for ${syncTarget}`,
              });
              break;
            default:
              // Exhaustive check - all NotificationEvent types should be handled
              const _exhaustiveCheck: never = event;
              console.warn("Unknown notification event type:", _exhaustiveCheck);
          }
        },
      );

      connectionRef.current.connect();
    }

    return () => {
      if (connectionRef.current) {
        connectionRef.current.close();
        connectionRef.current = null;
      }
    };
  }, [addToast]);

  return <>{children}</>;
}
