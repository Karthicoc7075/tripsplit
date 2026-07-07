import { useEffect, useRef } from "react";
import type { Friend } from "@/types";
import { getIncomingFriends } from "@/lib/notificationHistory";
import { shouldShowPushNotifications, showLocalNotification } from "@/lib/notifications";

/** Browser push when someone else adds the current user as a friend. */
export function useIncomingFriendAlerts(friends: Friend[], currentUserId: string) {
  const seenFriendIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    const incoming = getIncomingFriends(friends, currentUserId);

    if (!initializedRef.current) {
      seenFriendIdsRef.current = new Set(incoming.map((friend) => friend.id));
      initializedRef.current = true;
      return;
    }

    if (!shouldShowPushNotifications()) {
      seenFriendIdsRef.current = new Set(incoming.map((friend) => friend.id));
      return;
    }

    for (const friend of incoming) {
      if (!seenFriendIdsRef.current.has(friend.id)) {
        showLocalNotification(
          "New friend added",
          `${friend.name} added you as a friend`
        );
      }
    }

    seenFriendIdsRef.current = new Set(incoming.map((friend) => friend.id));
  }, [friends, currentUserId]);
}