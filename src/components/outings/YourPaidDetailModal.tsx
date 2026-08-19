import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Receipt, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import type { Transaction, OutingMember } from "@/types";
import { memberLabel } from "@/lib/displayNames";
import { cn } from "@/lib/utils";
import { TransactionFlowMap } from "./TransactionFlowMap";

interface YourPaidDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  members: OutingMember[];
  currentUserId: string;
  totalPaid: number;
}

export function YourPaidDetailModal({
  isOpen,
  onClose,
  transactions,
  members,
  currentUserId,
  totalPaid,
}: YourPaidDetailModalProps) {
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTxId(expandedTxId === id ? null : id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto flex flex-col p-0 border-border/80 bg-card">
        <DialogHeader className="p-6 pb-4 border-b border-border/40">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Wallet className="h-5 w-5 text-primary" /> Your Payments Breakdown
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            View all expenses you paid and see exactly how they were shared.
          </DialogDescription>
        </DialogHeader>

        {/* Total Summary Header */}
        <div className="px-6 py-4 bg-muted/30 border-b border-border/40 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total Paid by You</span>
          <span className="text-2xl font-bold text-primary tabular-nums">
            {formatCurrency(totalPaid)}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center py-10">
              <Receipt className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No payments recorded by you</p>
              <p className="text-xs text-muted-foreground mt-1">
                Expenses you pay for in this outing will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const isExpanded = expandedTxId === tx.id;
                const formattedDate = new Date(tx.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <div
                    key={tx.id}
                    className={cn(
                      "rounded-xl border transition-all duration-300 overflow-hidden",
                      isExpanded 
                        ? "border-primary bg-primary/[0.02] shadow-sm" 
                        : "border-border bg-card hover:border-border/80"
                    )}
                  >
                    {/* Accordion Trigger Header */}
                    <button
                      onClick={() => toggleExpand(tx.id)}
                      className="w-full flex items-center justify-between gap-4 p-4 text-left focus:outline-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Receipt className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate max-w-[200px] sm:max-w-[260px]">
                            {tx.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formattedDate} · {tx.category ?? "Other"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold text-foreground tabular-nums">
                          {formatCurrency(tx.amount)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Accordion Expandable Panel */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="border-t border-border/40"
                        >
                          <div className="p-4 bg-background/50">
                            {/* Inner Flow map */}
                            <TransactionFlowMap
                              uniqueId={tx.id}
                              payerName="You"
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
                              delay={0.3}
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
