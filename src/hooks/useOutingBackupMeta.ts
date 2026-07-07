import { useEffect, useState } from "react";
import { subscribeOutingBackupMeta } from "@/lib/firestore";

export function useOutingBackupMeta(userId: string, outingId: string | undefined) {
  const [lastBackedUp, setLastBackedUp] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !outingId) {
      setLastBackedUp(null);
      return;
    }
    return subscribeOutingBackupMeta(userId, outingId, setLastBackedUp);
  }, [userId, outingId]);

  return lastBackedUp;
}