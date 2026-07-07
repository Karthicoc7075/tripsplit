import { useState } from "react";
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
import { formatCurrency } from "@/lib/format";
import { getFirstName, possessiveLabel, memberLabel } from "@/lib/displayNames";

export default function SettleUp() {
  const { globalSettlements, currentUserId, currentUserName, dashboardStats } = useData();
  const firstName = getFirstName(currentUserName);
  const [settleId, setSettleId] = useState<string | null>(null);

  const handleSettle = () => {
    toast.success("Settlement recorded successfully!");
    setSettleId(null);
  };

  const youOweSettlements = globalSettlements.filter((s) => s.fromId === currentUserId);
  const owedToYou = globalSettlements.filter((s) => s.toId === currentUserId);

  return (
    <div className="space-y-6 sm:space-y-8 pb-6 min-w-0">
      <PageHeader
        title="Settle Up"
        description={`Review and simplify ${possessiveLabel(currentUserName).toLowerCase()} debts across all outings.`}
        actions={
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw size={16} /> Simplify Debts
          </Button>
        }
      />

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard
          title="Net Position"
          value={Math.abs(dashboardStats.totalBalance)}
          prefix={dashboardStats.totalBalance >= 0 ? "+₹" : "-₹"}
          variant={dashboardStats.totalBalance >= 0 ? "success" : "destructive"}
          subtitle="Overall balance"
        />
        <StatCard title={`${firstName} Owes`} value={dashboardStats.youOwe} prefix="₹" variant="destructive" subtitle={`${youOweSettlements.length} settlements`} />
        <StatCard title={`${firstName} is Owed`} value={dashboardStats.youAreOwed} prefix="₹" variant="success" subtitle={`${owedToYou.length} settlements`} />
      </div>

      {globalSettlements.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="All settled up!"
          description="You have no outstanding debts across your outings."
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

                    {settlement.fromId === currentUserId && (
                      <Button className="w-full gap-2" onClick={() => setSettleId(settlement.id)}>
                        <CheckCircle2 size={16} /> Mark as Settled
                      </Button>
                    )}
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
        title="Confirm settlement?"
        description="This will record that you've paid this debt. Your balances will be updated."
        confirmLabel="Confirm Settlement"
        variant="default"
        onConfirm={handleSettle}
      />
    </div>
  );
}