import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Trash2, Users, Wallet, ArrowDownLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { useData } from "@/context/DataContext";
import {
  getActiveOutingCountWithFriend,
  getCommonOutings,
  getFriendOutingSummaries,
  getLastOutingWithFriend,
} from "@/lib/friends";
import type { SettlementStatementType } from "@/types";
import { formatCurrency } from "@/lib/format";
import { getFirstName, formatPayTo, formatReturnFrom } from "@/lib/displayNames";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BottomSheet } from "@/components/BottomSheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface PendingSettle {
  outingId: string;
  outingName: string;
  amount: number;
  type: SettlementStatementType;
}

function formatJoinDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function KpiCard({
  label,
  value,
  variant,
  hint,
  className,
}: {
  label: string;
  value: string;
  variant: "success" | "destructive" | "default";
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fintech-card p-3 sm:p-4 text-center",
        variant === "success" && "border-success/30 bg-success/5",
        variant === "destructive" && "border-destructive/30 bg-destructive/5",
        className
      )}
    >
      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 leading-tight">{label}</p>
      <p
        className={cn(
          "text-base sm:text-xl font-bold tracking-tight",
          variant === "success" && "text-success",
          variant === "destructive" && "text-destructive",
          variant === "default" && "text-foreground"
        )}
      >
        {value}
      </p>
      {hint && (
        <p
          className={cn(
            "text-[10px] sm:text-xs mt-1 leading-tight",
            variant === "success" && "text-success/80",
            variant === "destructive" && "text-destructive/80",
            variant === "default" && "text-muted-foreground"
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export default function FriendDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    friends,
    friendBalances,
    outings,
    transactions,
    settlementRecords,
    currentUserId,
    removeFriend,
    recordSettlement,
  } = useData();

  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pendingSettle, setPendingSettle] = useState<PendingSettle | null>(null);
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [settleAmountInput, setSettleAmountInput] = useState<string>("");
  const isMobile = useMediaQuery("(max-width: 768px)");

  const friend = friends.find((f) => f.id === id);
  const balance = friend ? friendBalances.get(friend.id) ?? 0 : 0;

  const outingSummaries = useMemo(
    () =>
      friend
        ? getFriendOutingSummaries(
            friend,
            outings,
            transactions,
            currentUserId,
            settlementRecords
          )
        : [],
    [friend, outings, transactions, currentUserId, settlementRecords]
  );

  if (!friend) {
    return (
      <div className="space-y-6 pb-6">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" asChild>
          <Link to="/friends">
            <ArrowLeft className="h-4 w-4" />
            Back to Friends
          </Link>
        </Button>
        <EmptyState
          icon={Users}
          title="Friend not found"
          description="This friend may have been removed or the link is invalid."
          actionLabel="Go to Friends"
          onAction={() => navigate("/friends")}
        />
      </div>
    );
  }

  const outingCount = getCommonOutings(friend, outings, currentUserId).length;
  const lastOuting = getLastOutingWithFriend(friend, outings, currentUserId);
  const activeOutingCount = getActiveOutingCountWithFriend(friend, outings, currentUserId);

  // One two-directional number, so it carries the neutral name and states the
  // direction underneath — same rule as the Dashboard and Outing Detail cards.
  // The old pair of cards left one of them stuck at ₹0 at all times.
  const isNetPositive = balance > 0.01;
  const isNetNegative = balance < -0.01;
  const friendFirstName = getFirstName(friend.name);

  const handleRemove = () => {
    removeFriend(friend.id);
    toast.success("Friend removed");
    navigate("/friends");
  };

  const handleConfirmSettle = () => {
    if (!pendingSettle) return;
    const finalAmount = Number(settleAmountInput) || pendingSettle.amount;

    recordSettlement({
      outingId: pendingSettle.outingId,
      friendId: friend.id,
      friendName: friend.name,
      amount: finalAmount,
      type: pendingSettle.type,
    });

    toast.success(
      pendingSettle.type === "settle"
        ? `Settle of ${formatCurrency(finalAmount)} with ${friend.name} recorded!`
        : `Return of ${formatCurrency(finalAmount)} with ${friend.name} recorded!`
    );
    setPendingSettle(null);
    setIsCustomAmount(false);
    setSettleAmountInput("");
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" asChild>
          <Link to="/friends">
            <ArrowLeft className="h-4 w-4" />
            Back to Friends
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
          onClick={() => setConfirmRemove(true)}
        >
          <Trash2 className="h-4 w-4" />
          Remove Friend
        </Button>
      </div>

      <div className="flex items-start gap-3">
        <Avatar className="h-14 w-14 border border-border/60 shrink-0">
          <AvatarFallback seed={friend.id} className="bg-primary/10 text-primary text-lg font-medium">{friend.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {friend.name}
          </h1>
          <p className="text-sm text-muted-foreground truncate">{friend.email}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Added {formatJoinDate(friend.addedAt)}
          </p>
          {lastOuting && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last outing: {lastOuting.name} · {lastOuting.date}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <KpiCard
          className="col-span-2"
          label="Net Balance"
          value={
            isNetNegative
              ? `-${formatCurrency(Math.abs(balance))}`
              : formatCurrency(Math.abs(balance))
          }
          variant={isNetNegative ? "destructive" : isNetPositive ? "success" : "default"}
          hint={
            isNetNegative
              ? formatPayTo(Math.abs(balance), friendFirstName)
              : isNetPositive
                ? formatReturnFrom(balance, friendFirstName)
                : "All settled"
          }
        />
        <KpiCard label="Outing Count" value={String(outingCount)} variant="default" />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          Outings Together
        </h2>
        {outingSummaries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No shared outings yet.
          </p>
        ) : (
          <div className="space-y-2">
            {outingSummaries.map(({ outing, yourBalance, totalSpent }) => {
              const settled = Math.abs(yourBalance) < 0.01;
              const positive = yourBalance > 0;
              const unsettledAmount = Math.abs(yourBalance);
              const statementType: SettlementStatementType = positive ? "return" : "settle";

              return (
                <div key={outing.id} className="fintech-card p-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/outings/${outing.id}`)}
                    className="w-full text-left space-y-2 hover:opacity-80 transition-opacity"
                  >
                    <p className="font-medium text-foreground">{outing.name}</p>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Net Balance:</span>
                      <span
                        className={cn(
                          "font-semibold",
                          settled && "text-muted-foreground",
                          positive && !settled && "text-success",
                          !positive && !settled && "text-destructive"
                        )}
                      >
                        {settled
                          ? "Settled"
                          : positive
                            ? formatCurrency(yourBalance)
                            : `-${formatCurrency(unsettledAmount)}`}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total Spent: {formatCurrency(totalSpent)}
                    </p>
                    <p className="text-xs text-muted-foreground">{outing.date}</p>
                  </button>

                  {!settled && (
                    <Button
                      size="sm"
                      className={cn(
                        "w-full gap-2",
                        positive && "bg-success hover:bg-success/90 text-white"
                      )}
                      variant={positive ? "default" : "default"}
                      onClick={() => {
                        setPendingSettle({
                          outingId: outing.id,
                          outingName: outing.name,
                          amount: unsettledAmount,
                          type: statementType,
                        });
                        setSettleAmountInput(unsettledAmount.toString());
                        setIsCustomAmount(false);
                      }}
                    >
                      {positive ? (
                        <>
                          <ArrowDownLeft className="h-4 w-4" />
                          Return {formatCurrency(unsettledAmount)}
                        </>
                      ) : (
                        <>
                          <Wallet className="h-4 w-4" />
                          Settle {formatCurrency(unsettledAmount)}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Remove ${friend.name}?`}
        description={
          activeOutingCount > 0
            ? `${friend.name} is in ${activeOutingCount} active ${activeOutingCount === 1 ? "outing" : "outings"}. Removing them won't delete outing data.`
            : "They will be removed from your friends list. Existing outing data will not be affected."
        }
        confirmLabel="Remove Friend"
        onConfirm={handleRemove}
      />

      {pendingSettle && (
        isMobile ? (
          <BottomSheet
            open={!!pendingSettle}
            onOpenChange={(o) => {
              if (!o) {
                setPendingSettle(null);
                setIsCustomAmount(false);
                setSettleAmountInput("");
              }
            }}
            title={pendingSettle.type === "settle" ? "Record Settle Payment" : "Record Return Payment"}
            description={
              pendingSettle.type === "settle"
                ? `Pay money to ${friend.name}`
                : `Receive money from ${friend.name}`
            }
          >
            <div className="space-y-4 py-3">
              {isCustomAmount ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Amount (₹)</label>
                  <Input
                    type="number"
            inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    className="text-lg font-semibold bg-surface-input"
                    value={settleAmountInput}
                    onChange={(e) => setSettleAmountInput(e.target.value)}
                  />
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-muted/45 border border-border text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total to settle</p>
                  <p className="text-3xl font-bold text-foreground">
                    {formatCurrency(pendingSettle.amount)}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleConfirmSettle}
                  className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/95"
                  disabled={isCustomAmount && (!settleAmountInput || Number(settleAmountInput) <= 0)}
                >
                  {pendingSettle.type === "settle" ? <Wallet className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                  {isCustomAmount
                    ? `${pendingSettle.type === "settle" ? "Settle" : "Return"} ${formatCurrency(Number(settleAmountInput) || 0)}`
                    : `${pendingSettle.type === "settle" ? "Settle" : "Return"} Full Amount`}
                </Button>

                {!isCustomAmount ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsCustomAmount(true)}
                    className="w-full border-border bg-card hover:bg-muted"
                  >
                    Enter Custom Amount
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCustomAmount(false);
                      setSettleAmountInput(pendingSettle.amount.toString());
                    }}
                    className="w-full border-border bg-card hover:bg-muted"
                  >
                    Use Full Amount
                  </Button>
                )}

                <Button
                  variant="ghost"
                  onClick={() => {
                    setPendingSettle(null);
                    setIsCustomAmount(false);
                    setSettleAmountInput("");
                  }}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </BottomSheet>
        ) : (
          <Dialog
            open={!!pendingSettle}
            onOpenChange={(open) => {
              if (!open) {
                setPendingSettle(null);
                setIsCustomAmount(false);
                setSettleAmountInput("");
              }
            }}
          >
            <DialogContent className="sm:max-w-md bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {pendingSettle.type === "settle" ? "Record Settle Payment" : "Record Return Payment"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {pendingSettle.type === "settle"
                    ? `Record that you paid money to ${friend.name} for "${pendingSettle.outingName}".`
                    : `Record that you received money from ${friend.name} for "${pendingSettle.outingName}".`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                {isCustomAmount ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Amount (₹)</label>
                    <Input
                      type="number"
            inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      className="text-lg font-semibold bg-surface-input"
                      value={settleAmountInput}
                      onChange={(e) => setSettleAmountInput(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-muted/45 border border-border text-center">
                    <p className="text-sm text-muted-foreground mb-1">Total to settle</p>
                    <p className="text-3xl font-bold text-foreground">
                      {formatCurrency(pendingSettle.amount)}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleConfirmSettle}
                    className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/95"
                    disabled={isCustomAmount && (!settleAmountInput || Number(settleAmountInput) <= 0)}
                  >
                    {pendingSettle.type === "settle" ? <Wallet className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                    {isCustomAmount
                      ? `${pendingSettle.type === "settle" ? "Settle" : "Return"} ${formatCurrency(Number(settleAmountInput) || 0)}`
                      : `${pendingSettle.type === "settle" ? "Settle" : "Return"} Full Amount`}
                  </Button>

                  {!isCustomAmount ? (
                    <Button
                      variant="outline"
                      onClick={() => setIsCustomAmount(true)}
                      className="w-full border-border bg-card hover:bg-muted"
                    >
                      Enter Custom Amount
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCustomAmount(false);
                        setSettleAmountInput(pendingSettle.amount.toString());
                      }}
                      className="w-full border-border bg-card hover:bg-muted"
                    >
                      Use Full Amount
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setPendingSettle(null);
                      setIsCustomAmount(false);
                      setSettleAmountInput("");
                    }}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      )}
    </div>
  );
}