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
  /** Any member may edit; only the author or the outing owner may delete. */
  canEdit?: boolean;
  canDelete?: boolean;
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
  canEdit = true,
  canDelete = true,
}: TransactionDetailPanelProps) {
  /** Resolved from the live member list, so a renamed member shows correctly. */
  const memberName = (id: string, fallback = "Member") =>
    memberLabel(members.find((m) => m.id === id)?.name ?? fallback, id === currentUserId);

  const yourSplit = tx.splits.find((s) => s.memberId === currentUserId)?.amount ?? 0;

  // A multi-payer transaction stores paidByName as "Karthi, Arun". Passing that
  // whole string to memberLabel() ran getFirstName() over it, which splits on
  // whitespace — so it rendered "Karthi," and dropped everyone else. Build the
  // list from the payments instead.
  const payers = tx.payments?.length
    ? tx.payments
    : [{ memberId: tx.paidById, paidByName: tx.paidByName, amount: tx.amount }];

  const payerNames = payers.map((p) => memberName(p.memberId, p.paidByName));
  const paidByLabel =
    payerNames.length === 1
      ? payerNames[0]
      : payerNames.length === 2
        ? `${payerNames[0]} and ${payerNames[1]}`
        : `${payerNames.slice(0, -1).join(", ")}, and ${payerNames[payerNames.length - 1]}`;

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
        <DetailRow
          label={payers.length > 1 ? `Paid by (${payers.length})` : "Paid by"}
          value={paidByLabel}
        />
        {payers.length > 1 && (
          <DetailRow
            label="Split of payment"
            value={
              <div className="space-y-1">
                {payers.map((p) => (
                  <div key={p.memberId} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {memberName(p.memberId, p.paidByName)}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatCurrency(p.amount)}
                    </span>
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

      {(canEdit || canDelete) && (
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" className="flex-1 gap-2" onClick={onEdit}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" className="flex-1 gap-2" onClick={onDelete}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}