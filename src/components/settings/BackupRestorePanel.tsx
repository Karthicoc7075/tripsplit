import { useCallback, useEffect, useState } from "react";
import { Cloud, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatRelativeTime } from "@/lib/format";
import {
  getOutingBackupRecord,
  listOutingBackupSummaries,
  type OutingBackupSummary,
} from "@/lib/firestore";
import { useData } from "@/context/DataContext";
import { toast } from "sonner";

export function BackupRestorePanel() {
  const { currentUserId, restoreOutingFromBackup } = useData();
  const [summaries, setSummaries] = useState<OutingBackupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<{
    outingId: string;
    outingName: string;
    message: string;
  } | null>(null);

  const loadSummaries = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const list = await listOutingBackupSummaries(currentUserId);
      setSummaries(list);
    } catch (err) {
      console.error(err);
      toast.error("Could not load cloud backups");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  const handleRestoreClick = async (summary: OutingBackupSummary) => {
    if (!currentUserId) return;
    const record = await getOutingBackupRecord(currentUserId, summary.outingId);
    if (!record) {
      toast.error("Backup not found");
      return;
    }

    const conflict = await restoreOutingFromBackup(summary.outingId, { dryRun: true });
    if (conflict === "conflict") {
      setConfirmRestore({
        outingId: summary.outingId,
        outingName: summary.outingName,
        message:
          "Your current outing data is newer than this cloud backup. Restoring will overwrite your local changes. Continue anyway?",
      });
      return;
    }

    setConfirmRestore({
      outingId: summary.outingId,
      outingName: summary.outingName,
      message: `Restore "${summary.outingName}" from backup saved ${formatRelativeTime(summary.lastBackedUp)}?`,
    });
  };

  const handleConfirmRestore = async () => {
    if (!confirmRestore) return;
    setRestoringId(confirmRestore.outingId);
    try {
      const result = await restoreOutingFromBackup(confirmRestore.outingId, { force: true });
      if (result === "restored") {
        toast.success(`"${confirmRestore.outingName}" restored from backup`);
        await loadSummaries();
      } else {
        toast.error("Restore failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not restore backup");
    } finally {
      setRestoringId(null);
      setConfirmRestore(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading cloud backups…
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-6 text-center space-y-2">
        <Cloud className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">
          No cloud backups yet. Backups are created automatically when you create or
          update outings and expenses.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {summaries.map((summary) => (
          <div
            key={summary.outingId}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/50"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{summary.outingName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {summary.transactionCount} transaction
                {summary.transactionCount === 1 ? "" : "s"} · Last backed up{" "}
                {formatRelativeTime(summary.lastBackedUp)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              disabled={restoringId === summary.outingId}
              onClick={() => void handleRestoreClick(summary)}
            >
              {restoringId === summary.outingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Restore
            </Button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmRestore}
        onOpenChange={(open) => !open && setConfirmRestore(null)}
        title={`Restore ${confirmRestore?.outingName ?? "outing"}?`}
        description={confirmRestore?.message ?? ""}
        confirmLabel="Restore backup"
        onConfirm={() => void handleConfirmRestore()}
        variant="destructive"
      />
    </>
  );
}