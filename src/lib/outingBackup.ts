import type { Outing, Transaction, SettlementRecord } from "@/types";

export interface OutingBackupData {
  outing: Outing;
  transactions: Transaction[];
  settlements: SettlementRecord[];
  exportedAt: string;
  exportedBy: string;
}

export function buildOutingBackup(
  outing: Outing,
  transactions: Transaction[],
  settlements: SettlementRecord[],
  exportedBy: string
): OutingBackupData {
  return {
    outing,
    transactions: transactions.filter((tx) => tx.outingId === outing.id),
    settlements: settlements.filter((r) => r.outingId === outing.id),
    exportedAt: new Date().toISOString(),
    exportedBy,
  };
}

export function exportOutingBackup(
  outing: Outing,
  transactions: Transaction[],
  settlements: SettlementRecord[],
  exportedBy: string
): void {
  const backupData = buildOutingBackup(outing, transactions, settlements, exportedBy);
  const dataStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([dataStr], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = outing.name.replace(/\s+/g, "_").replace(/[^\w-]/g, "");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `SpentX_Backup_${safeName}_${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}