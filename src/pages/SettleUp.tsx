import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, RefreshCw, Wallet, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useData } from "@/context/DataContext";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/fintech/PageHeader";
import { StatCard } from "@/components/fintech/StatCard";
import { formatCurrency, getCurrencySymbol } from "@/lib/format";
import { getFirstName, possessiveLabel, memberLabel } from "@/lib/displayNames";
import { DataErrorState } from "@/components/DataErrorState";

export default function SettleUp() {
  const {
    globalSettlements, currentUserId, currentUserName, dashboardStats, error, retry,
    recordSettlement, undoLastAction, loading,
  } = useData();
  const navigate = useNavigate();
  const firstName = getFirstName(currentUserName);
  const [settleId, setSettleId] = useState<string | null>(null);

  const pending = useMemo(
    () => globalSettlements.find((s) => s.id === settleId) ?? null,
    [globalSettlements, settleId]
  );

  const handleSettle = () => {
    if (!pending || !pending.outingId) {
      toast.error("Couldn't find that outing — open it and settle from there.");
      setSettleId(null);
      return;
    }

    // A debt edge points from payer to receiver. "settle" means the current
    // user paid out; "return" means they were paid back.
    const iAmPaying = pending.fromId === currentUserId;
    const friendId = iAmPaying ? pending.toId : pending.fromId;
    const friendName = iAmPaying ? pending.toName : pending.fromName;

    try {
      recordSettlement({
        outingId: pending.outingId,
        friendId,
        friendName,
        amount: pending.amount,
        type: iAmPaying ? "settle" : "return",
      });
      toast.success(
        `${formatCurrency(pending.amount)} settled with ${getFirstName(friendName)}`,
        {
          description: pending.outingName,
          action: { label: "Undo", onClick: () => undoLastAction() },
        }
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record settlement");
    } finally {
      setSettleId(null);
    }
  };

  const youOweSettlements = globalSettlements.filter((s) => s.fromId === currentUserId);
  const owedToYou = globalSettlements.filter((s) => s.toId === currentUserId);

  if (error) {
    return (
      <div className="space-y-6 pb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Settle Up
        </h1>
        <DataErrorState message={error} onRetry={retry} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-6">
        <div className="h-10 w-40 animate-pulse rounded-lg bg-muted/40" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted/30" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="fintech-card h-28 animate-pulse bg-muted/20" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="fintech-card h-40 animate-pulse bg-muted/20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-6 min-w-0">
      <PageHeader
        title="Settle Up"
        description={`Review and simplify ${possessiveLabel(currentUserName).toLowerCase()} debts across all outings.`}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs text-muted-foreground">
            <RefreshCw size={14} className="shrink-0" />
            Debts already simplified
          </span>
        }
      />

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard
          title="Net Position"
          value={Math.abs(dashboardStats.totalBalance)}
          prefix={`${dashboardStats.totalBalance >= 0 ? "+" : "-"}${getCurrencySymbol()}`}
          variant={dashboardStats.totalBalance >= 0 ? "success" : "destructive"}
          subtitle="Overall balance"
        />
        <StatCard title={`${firstName} Owes`} value={dashboardStats.youOwe} prefix={getCurrencySymbol()} variant="destructive" subtitle={`${youOweSettlements.length} settlements`} />
        <StatCard title={`${firstName} is Owed`} value={dashboardStats.youAreOwed} prefix={getCurrencySymbol()} variant="success" subtitle={`${owedToYou.length} settlements`} />
      </div>

      {globalSettlements.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="All settled up!"
          description="You have no outstanding debts across your outings."
          actionLabel="View outings"
          onAction={() => navigate("/outings")}
        />
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-foreground mb-4">Suggested Settlements</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {globalSettlements.map((settlement) => (
                <motion.div
                  key={settlement.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="fintech-card-hover p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex flex-col items-center">
                        <Avatar className="h-11 w-11 border-2 border-background shadow-fintech">
                          <AvatarFallback className="bg-muted text-sm">{settlement.fromName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium mt-2">{memberLabel(settlement.fromName, settlement.fromId === currentUserId)}</span>
                      </div>

                      <div className="flex flex-col items-center flex-1 px-4">
                        <span className="text-xl font-semibold text-foreground">{formatCurrency(settlement.amount)}</span>
                        <div className="h-px w-full bg-border relative my-2.5">
                          <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground bg-card" />
                        </div>
                        <span className="text-xs text-muted-foreground">{settlement.outingName}</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <Avatar className="h-11 w-11 border-2 border-background shadow-fintech">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">{settlement.toName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium mt-2">{memberLabel(settlement.toName, settlement.toId === currentUserId)}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full gap-2"
                      variant={settlement.fromId === currentUserId ? "default" : "outline"}
                      onClick={() => setSettleId(settlement.id)}
                    >
                      <CheckCircle2 size={16} />
                      {settlement.fromId === currentUserId
                        ? "Mark as Paid"
                        : "Mark as Received"}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!settleId}
        onOpenChange={(o) => !o && setSettleId(null)}
        title={
          pending?.fromId === currentUserId ? "Confirm payment?" : "Confirm you were paid?"
        }
        description={
          pending
            ? pending.fromId === currentUserId
              ? `Records that you paid ${getFirstName(pending.toName)} ${formatCurrency(pending.amount)} for ${pending.outingName}. Balances update for everyone in that outing.`
              : `Records that ${getFirstName(pending.fromName)} paid you ${formatCurrency(pending.amount)} for ${pending.outingName}. Balances update for everyone in that outing.`
            : ""
        }
        confirmLabel="Confirm Settlement"
        variant="default"
        onConfirm={handleSettle}
      />
    </div>
  );
}