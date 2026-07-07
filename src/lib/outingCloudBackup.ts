import type { AppData } from "@/lib/firestore";
import { buildOutingBackup, type OutingBackupData } from "@/lib/outingBackup";
import { saveOutingBackupToCloud } from "@/lib/firestore";

const DEBOUNCE_MS = 1500;
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function getOutingLatestChangeAt(
  outingId: string,
  data: Pick<AppData, "outings" | "transactions" | "settlementRecords">
): string | null {
  const outing = data.outings.find((o) => o.id === outingId);
  if (!outing) return null;

  const timestamps = [
    outing.createdAt,
    ...data.transactions
      .filter((t) => t.outingId === outingId)
      .map((t) => t.createdAt),
    ...data.settlementRecords
      .filter((r) => r.outingId === outingId)
      .map((r) => r.createdAt),
  ].filter(Boolean);

  if (timestamps.length === 0) return outing.createdAt;
  return timestamps.sort().pop() ?? outing.createdAt;
}

export function buildBackupPayload(
  outingId: string,
  data: Pick<AppData, "outings" | "transactions" | "settlementRecords">,
  exportedBy: string
): OutingBackupData | null {
  const outing = data.outings.find((o) => o.id === outingId);
  if (!outing) return null;

  return buildOutingBackup(
    outing,
    data.transactions,
    data.settlementRecords,
    exportedBy
  );
}

/** Silent debounced backup — runs in background after data mutations. */
export function scheduleAutoBackupOuting(
  userIds: string | string[],
  outingId: string,
  getData: () => Pick<AppData, "outings" | "transactions" | "settlementRecords">,
  exportedBy: string
): void {
  if (!userIds || !outingId) return;

  const ids = Array.isArray(userIds) ? userIds : [userIds];

  for (const userId of ids) {
    if (!userId) continue;
    const key = `${userId}:${outingId}`;
    const existing = pendingTimers.get(key);
    if (existing) clearTimeout(existing);

    pendingTimers.set(
      key,
      setTimeout(() => {
        pendingTimers.delete(key);
        void forceBackupOuting(userId, outingId, getData, exportedBy);
      }, DEBOUNCE_MS)
    );
  }
}

/** Immediate cloud backup (manual or post-create). */
export async function forceBackupOuting(
  userId: string,
  outingId: string,
  getData: () => Pick<AppData, "outings" | "transactions" | "settlementRecords">,
  exportedBy: string,
  payloadOverride?: OutingBackupData
): Promise<string | null> {
  const payload = payloadOverride ?? buildBackupPayload(outingId, getData(), exportedBy);
  if (!payload) return null;

  const lastBackedUp = await saveOutingBackupToCloud(userId, outingId, payload);
  return lastBackedUp;
}

/** Backup every outing the user is part of (e.g. on logout). */
export async function backupAllOutings(
  userId: string,
  getData: () => Pick<AppData, "outings" | "transactions" | "settlementRecords">,
  exportedBy: string
): Promise<void> {
  const outingIds = getData().outings.map((o) => o.id);
  await Promise.all(
    outingIds.map((id) => forceBackupOuting(userId, id, getData, exportedBy))
  );
}