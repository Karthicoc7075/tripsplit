import { Pencil, Trash2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, formatRelativeTime } from "@/lib/format";
import type { Transaction, OutingMember } from "@/types";
import { possessiveLabel, memberLabel } from "@/lib/displayNames";
import { cn } from "@/lib/utils";
import { TransactionFlowMap } from "./TransactionFlowMap";

interface TransactionDetailPanelProps {
  tx: Transaction;
  members: OutingMember[];
  currentUserId: string;
  currentUserName: string;
  onEdit: () => void;
  onDelete: () => void;
  canManage?: boolean;
}

function DetailRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex justify-between items-start gap-4 py-3 border-b border-border/40 last:border-0", className)}>
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

export function TransactionDetailPanel({
  tx,
  members,
  currentUserId,
  currentUserName,
  onEdit,
  onDelete,
  canManage = true,
}: TransactionDetailPanelProps) {
  const memberName = (id: string) => {
    const name = members.find((m) => m.id === id)?.name ?? "Member";
    return memberLabel(name, id === currentUserId);
  };
  const yourSplit = tx.splits.find((s) => s.memberId === currentUserId)?.amount ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Receipt className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-lg text-foreground">{tx.title}</h3>
          {tx.description && (
            <p className="text-sm text-muted-foreground mt-1">{tx.description}</p>
          )}
          <p className="text-2xl font-bold text-primary mt-2">{formatCurrency(tx.amount)}</p>
        </div>
      </div>

      <div className="fintech-card px-4 py-1">
        <DetailRow label="Category" value={tx.category ?? "Other"} />
        <DetailRow label="Expense date" value={tx.date} />
        <DetailRow label="Paid by" value={memberLabel(tx.paidByName, tx.paidById === currentUserId)} />
        {tx.payments && tx.payments.length > 1 && (
          <DetailRow
            label="Payments"
            value={
              <div className="space-y-1">
                {tx.payments.map((p) => (
                  <div key={p.memberId}>
                    {memberLabel(p.paidByName, p.memberId === currentUserId)}: {formatCurrency(p.amount)}
                  </div>
                ))}
              </div>
            }
          />
        )}
        <DetailRow
          label={`${possessiveLabel(currentUserName)} share`}
          value={formatCurrency(yourSplit)}
        />
        <DetailRow label="Split mode" value={tx.splitMode === "equally" ? "Equal" : tx.splitMode} />
        <DetailRow
          label="Added by"
          value={memberLabel(tx.createdById === currentUserId ? currentUserName : tx.createdByName, tx.createdById === currentUserId)}
        />
        <DetailRow
          label="Added at"
          value={
            <span>
              {formatRelativeTime(tx.createdAt)}
              <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                {formatDateTime(tx.createdAt)}
              </span>
            </span>
          }
        />
      </div>

      {/* Visual Flow Map */}
      <div className="fintech-card p-4 overflow-hidden bg-card border-border/60">
        <TransactionFlowMap
          uniqueId={tx.id}
          payerName={tx.paidByName}
          payerId={tx.paidById}
          totalAmount={tx.amount}
          splits={tx.splits.map((s) => {
            const mName = members.find((m) => m.id === s.memberId)?.name ?? "Member";
            return {
              memberId: s.memberId,
              name: memberLabel(mName, s.memberId === currentUserId),
              amount: s.amount,
            };
          })}
          currentUserId={currentUserId}
          delay={0.15}
          payments={tx.payments?.map((p) => {
            const mName = members.find((m) => m.id === p.memberId)?.name ?? p.paidByName;
            return {
              memberId: p.memberId,
              name: memberLabel(mName, p.memberId === currentUserId),
              amount: p.amount,
            };
          })}
        />
      </div>

      {canManage && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={onEdit}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" className="flex-1 gap-2" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}