import { useEffect, useRef } from "react";
import type { Outing } from "@/types";
import { getInvitedOutings } from "@/lib/notificationHistory";
import { getOutingStatusLabel } from "@/lib/outing";
import { shouldShowPushNotifications, showLocalNotification } from "@/lib/notifications";

/** Browser push when someone adds the current user to an outing. */
export function useIncomingOutingAlerts(outings: Outing[], currentUserId: string) {
  const seenOutingIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    const invited = getInvitedOutings(outings, currentUserId);

    if (!initializedRef.current) {
      seenOutingIdsRef.current = new Set(invited.map((outing) => outing.id));
      initializedRef.current = true;
      return;
    }

    if (!shouldShowPushNotifications()) {
      seenOutingIdsRef.current = new Set(invited.map((outing) => outing.id));
      return;
    }

    for (const outing of invited) {
      if (!seenOutingIdsRef.current.has(outing.id)) {
        const creatorName = outing.createdByName ?? outing.members[0]?.name ?? "Someone";
        showLocalNotification(
          getOutingStatusLabel(outing.status),
          `${creatorName} added you to '${outing.name}'`
        );
      }
    }

    seenOutingIdsRef.current = new Set(invited.map((outing) => outing.id));
  }, [outings, currentUserId]);
}