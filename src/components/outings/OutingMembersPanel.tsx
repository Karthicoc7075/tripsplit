import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BottomSheet } from "@/components/BottomSheet";
import { formatCurrency } from "@/lib/format";
import { getMemberPaidAndShare, isOutingCreator } from "@/lib/outing";
import { memberLabel } from "@/lib/displayNames";
import type { Outing, OutingMember, Transaction } from "@/types";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface MemberBalance {
  memberId: string;
  balance: number;
}

interface OutingMembersPanelProps {
  outing: Outing;
  members: OutingMember[];
  transactions: Transaction[];
  memberBalances: MemberBalance[];
  currentUserId: string;
}

function getMemberTransactions(memberId: string, transactions: Transaction[]): Transaction[] {
  return transactions.filter((tx) => {
    const paid =
      tx.paidById === memberId ||
      tx.payments?.some((p) => p.memberId === memberId);
    const inSplit = tx.splits.some((s) => s.memberId === memberId);
    return paid || inSplit;
  });
}

function MemberContributionDetail({
  member,
  outing,
  transactions,
  balance,
}: {
  member: OutingMember;
  outing: Outing;
  transactions: Transaction[];
  balance: number;
}) {
  const { paid, share } = getMemberPaidAndShare(member.id, transactions);
  const related = getMemberTransactions(member.id, transactions);
  const isCreator = isOutingCreator(outing, member.id);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {member.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-lg">{member.name}</p>
          {isCreator && (
            <p className="text-xs text-muted-foreground">Created this outing</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border border-border/50 text-center">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="font-semibold mt-1">{formatCurrency(paid)}</p>
        </div>
        <div className="p-3 rounded-xl border border-border/50 text-center">
          <p className="text-xs text-muted-foreground">Share</p>
          <p className="font-semibold mt-1">{formatCurrency(share)}</p>
        </div>
        <div
          className={cn(
            "p-3 rounded-xl border text-center",
            balance > 0.01 && "border-success/30 bg-success/5",
            balance < -0.01 && "border-destructive/30 bg-destructive/5",
            Math.abs(balance) < 0.01 && "border-border/50"
          )}
        >
          <p className="text-xs text-muted-foreground">
            {balance < -0.01 ? "Owes" : "Return Amount"}
          </p>
          <p
            className={cn(
              "font-semibold mt-1",
              balance > 0.01 && "text-success",
              balance < -0.01 && "text-destructive"
            )}
          >
            {balance > 0.01
              ? `+${formatCurrency(balance)}`
              : balance < -0.01
                ? `${formatCurrency(Math.abs(balance))}`
                : "Settled"}
          </p>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-sm text-foreground mb-3">
          Expenses ({related.length})
        </h4>
        {related.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No expenses yet for this member.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {related.map((tx) => {
              const memberPaid =
                tx.payments?.find((p) => p.memberId === member.id)?.amount ??
                (tx.paidById === member.id ? tx.amount : 0);
              const memberShare =
                tx.splits.find((s) => s.memberId === member.id)?.amount ?? 0;

              return (
                <div
                  key={tx.id}
                  className="flex justify-between items-start gap-3 p-3 rounded-lg border border-border/40"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{tx.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Paid {formatCurrency(memberPaid)} · Share {formatCurrency(memberShare)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function OutingMembersPanel({
  outing,
  members,
  transactions,
  memberBalances,
  currentUserId,
}: OutingMembersPanelProps) {
  const [selectedMember, setSelectedMember] = useState<OutingMember | null>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");

  const getBalance = (memberId: string) =>
    memberBalances.find((b) => b.memberId === memberId)?.balance ?? 0;

  const detailContent = selectedMember ? (
    <MemberContributionDetail
      member={selectedMember}
      outing={outing}
      transactions={transactions}
      balance={getBalance(selectedMember.id)}
    />
  ) : null;

  return (
    <>
      <div className="fintech-card p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-foreground mb-1">Group Members</h3>
          <p className="text-sm text-muted-foreground">
            Tap a member to see their contributions in this outing
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const isCurrentUser = m.id === currentUserId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMember(m)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-colors",
                  isCurrentUser
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-muted/30 hover:bg-muted/50"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] font-semibold">
                    {m.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {memberLabel(m.name, isCurrentUser)}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {members.map((m) => {
            const { paid, share } = getMemberPaidAndShare(m.id, transactions);
            const balance = getBalance(m.id);
            const isCurrentUser = m.id === currentUserId;
            const isCreator = isOutingCreator(outing, m.id);

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMember(m)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border text-left transition-colors hover:bg-muted/30",
                  isCurrentUser && "border-primary/30 bg-primary/5"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback
                      className={cn(
                        isCurrentUser && "bg-primary/15 text-primary font-semibold"
                      )}
                    >
                      {m.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className={cn("font-medium truncate", isCurrentUser && "text-primary")}>
                      {memberLabel(m.name, isCurrentUser)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Paid {formatCurrency(paid)} · {balance >= 0 ? `Return amount ${formatCurrency(balance)}` : `Owes ${formatCurrency(Math.abs(balance))}`}
                      {isCreator && " · Created outing"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    balance > 0.01 ? "default" : balance < -0.01 ? "destructive" : "secondary"
                  }
                  className="shrink-0 ml-2"
                >
                  {balance > 0.01
                    ? `+${formatCurrency(balance)}`
                    : balance < -0.01
                      ? `Owes ${formatCurrency(Math.abs(balance))}`
                      : "Settled"}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {selectedMember &&
        (isMobile ? (
          <BottomSheet
            open={!!selectedMember}
            onOpenChange={(o) => !o && setSelectedMember(null)}
            title={selectedMember.name}
            description="Contribution in this outing"
          >
            {detailContent}
          </BottomSheet>
        ) : (
          <Dialog
            open={!!selectedMember}
            onOpenChange={(o) => !o && setSelectedMember(null)}
          >
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedMember.name}</DialogTitle>
                <DialogDescription>Contribution in this outing</DialogDescription>
              </DialogHeader>
              {detailContent}
            </DialogContent>
          </Dialog>
        ))}
    </>
  );
}