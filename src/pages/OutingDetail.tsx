import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Pencil, Receipt, Users, Plus,
  MapPin, Calendar, Trash2, PieChart, Download, Cloud, Wallet, ArrowDownLeft,
  AlertTriangle, RotateCcw, CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { PremiumTabs, PremiumTabsContent, PremiumTabsList, PremiumTabsTrigger } from "@/components/fintech/PremiumTabs";
import { StatCard } from "@/components/fintech/StatCard";
import {
  formatCurrency,
  formatRelativeTime,
  getCurrencySymbol,
  toDisplayDate,
} from "@/lib/format";
import { formatOutingDates, getMemberCashFlow, hasOutingEnded, isOutingCreator } from "@/lib/outing";
import { isPrematurelySettled } from "@/lib/dashboardContext";
import { compareTransactionsByDateDesc } from "@/lib/dashboard";
import { getOutingMembers } from "@/lib/members";
import { memberLabel } from "@/lib/displayNames";
import { getOutingMemberIds } from "@/lib/members";
import { getCategoryColor } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useData, computeMemberBalances, simplifyDebts } from "@/context/DataContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TransactionSuccess } from "@/components/TransactionSuccess";
import { BottomSheet } from "@/components/BottomSheet";
import { TransactionRowSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/EmptyState";
import { AddTransactionForm, type TransactionFormValues } from "@/components/outings/AddTransactionForm";
import { EditOutingModal, type EditOutingSaveData } from "@/components/outings/EditOutingModal";
import { NetBalanceCard } from "@/components/outings/NetBalanceCard";
import { BudgetCard } from "@/components/outings/BudgetCard";
import { BudgetExceededModal } from "@/components/outings/BudgetExceededModal";
import { OutingAnalysisTab } from "@/components/outings/OutingAnalysisTab";
import { OutingStatusToggle } from "@/components/outings/OutingStatusToggle";
import { OutingCompleteCard } from "@/components/outings/OutingCompleteCard";
import { TransactionList } from "@/components/outings/TransactionList";
import { OutingMembersPanel } from "@/components/outings/OutingMembersPanel";

import { TransactionDetailPanel } from "@/components/outings/TransactionDetailPanel";
import { SettlementHistory } from "@/components/outings/SettlementHistory";
import { YourPaidDetailModal } from "@/components/outings/YourPaidDetailModal";
import {
  getPersonalSpendingAnalysis,
  getOutingPersonalStats,
  getCategoryBreakdown,
  getMemberSpendingData,
} from "@/lib/outingAnalysis";
import { canUserEditTransaction, canUserDeleteTransaction } from "@/lib/permissions";
import { exportOutingBackup } from "@/lib/outingBackup";
import { computeSplits } from "@/lib/balances";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useOutingBackupMeta } from "@/hooks/useOutingBackupMeta";
import { cn } from "@/lib/utils";

/**
 * Remembers that an outing's dates already closed it once.
 *
 * Set both when the auto-complete fires and when someone reopens by hand, so a
 * deliberate "Active" is never undone by the same past end date.
 */
const autoCompleteKey = (outingId: string) => `tripsplit-auto-complete-${outingId}`;

export default function OutingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    transactions: allTransactions,
    getOuting,
    getOutingTotalSpent,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateOuting,
    updateOutingMembers,
    deleteOuting,
    friends,
    undoLastAction,
    isOnline,
    currentUserId,
    currentUserName,
    loading,
    getOutingSettlementRecords,
    forceBackupOuting,
    recordSettlement,
  } = useData();

  const lastBackedUp = useOutingBackupMeta(currentUserId, id);
  const [backingUp, setBackingUp] = useState(false);

  const isMobile = useMediaQuery("(max-width: 767px)");
  const outing = getOuting(id ?? "");
  const transactions = useMemo(
    () =>
      allTransactions
        .filter((t) => t.outingId === (id ?? ""))
        .sort(compareTransactionsByDateDesc),
    [allTransactions, id]
  );

  const transactionsPaidByYou = useMemo(() => {
    return transactions.filter((tx) => tx.paidById === currentUserId);
  }, [transactions, currentUserId]);

  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isEditOutingOpen, setIsEditOutingOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<import("@/types").Transaction | null>(null);
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isYourPaidModalOpen, setIsYourPaidModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetModalAllowContinue, setBudgetModalAllowContinue] = useState(false);
  const [selectedTx, setSelectedTx] = useState<import("@/types").Transaction | null>(null);
  const [deleteOutingOpen, setDeleteOutingOpen] = useState(false);
  const [pendingSettle, setPendingSettle] = useState<{
    memberId: string;
    memberName: string;
    amount: number;
    type: "settle" | "return";
  } | null>(null);
  const [settleAmountInput, setSettleAmountInput] = useState<string>("");
  const [isCustomAmount, setIsCustomAmount] = useState<boolean>(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const txIdParam = searchParams.get("tx");
  const addParam = searchParams.get("add");
  // Guards against re-opening while the param is momentarily still in the URL.
  const addHandledRef = useRef(false);

  useEffect(() => {
    if (txIdParam && transactions.length > 0) {
      const match = transactions.find((t) => t.id === txIdParam);
      if (match) {
        setSelectedTx(match);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("tx");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [txIdParam, transactions, searchParams, setSearchParams]);



  const totalSpent = useMemo(
    () => getOutingTotalSpent(id ?? ""),
    [id, allTransactions, getOutingTotalSpent]
  );
  const hasBudget = (outing?.budget ?? 0) > 0;
  const isBudgetExceeded = hasBudget && outing != null && totalSpent > outing.budget!;
  const budgetRemaining = hasBudget && outing ? Math.max(outing.budget! - totalSpent, 0) : 0;

  const settlementRecords = useMemo(
    () => getOutingSettlementRecords(id ?? ""),
    [getOutingSettlementRecords, id]
  );

  const memberBalances = useMemo(
    () =>
      outing ? computeMemberBalances(outing.members, transactions, settlementRecords) : [],
    [outing, transactions, settlementRecords]
  );

  const debtEdges = useMemo(() => simplifyDebts(memberBalances), [memberBalances]);

  const individualReturns = useMemo(() => {
    return debtEdges
      .filter((e) => e.fromId === currentUserId || e.toId === currentUserId)
      .map((e) => {
        if (e.toId === currentUserId) {
          return { memberId: e.fromId, name: e.fromName, amount: e.amount, youAreOwed: true };
        }
        return { memberId: e.toId, name: e.toName, amount: e.amount, youAreOwed: false };
      });
  }, [debtEdges, currentUserId]);

  const personalAnalysis = useMemo(
    () => getPersonalSpendingAnalysis(currentUserId, transactions, outing, settlementRecords),
    [currentUserId, transactions, outing, settlementRecords]
  );




  const personalStats = useMemo(
    () => getOutingPersonalStats(id ?? "", currentUserId, transactions),
    [id, currentUserId, transactions]
  );
  /** Raw money fronted — what the payments breakdown modal itemises. */
  const yourPaid = personalStats.yourPaid;
  const yourShare = personalStats.yourShare;

  /**
   * Money actually gone from this account for this outing:
   *   paid + settlements sent out − settlements received back.
   * Converges to `yourShare` once the outing is fully settled.
   */
  const outingCashFlow = useMemo(
    () => getMemberCashFlow(currentUserId, transactions, settlementRecords),
    [currentUserId, transactions, settlementRecords]
  );

  const youSpentSubtitle = useMemo(() => {
    const parts = [`Paid ${formatCurrency(outingCashFlow.paid)}`];
    if (outingCashFlow.settledIn > 0) parts.push(`back ${formatCurrency(outingCashFlow.settledIn)}`);
    if (outingCashFlow.settledOut > 0) parts.push(`settled ${formatCurrency(outingCashFlow.settledOut)}`);
    return parts.length > 1 ? parts.join(" · ") : "Tap for payment breakdown";
  }, [outingCashFlow]);


  const categoryData = useMemo(() => getCategoryBreakdown(transactions), [transactions]);
  const memberSpendingData = useMemo(
    () =>
      outing
        ? getMemberSpendingData(outing.members, transactions, currentUserId, settlementRecords)
        : [],
    [outing, transactions, currentUserId, settlementRecords]
  );

  useEffect(() => {
    if (!outing || loading || !isBudgetExceeded) return;
    const key = `tripsplit-budget-alert-${outing.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setBudgetModalOpen(true);
  }, [outing?.id, isBudgetExceeded, loading]);

  const resetTxModal = () => {
    setEditingTx(null);
    setIsAddTxOpen(false);
  };

  const openAddTransaction = (skipBudgetWarning = false) => {
    if (!skipBudgetWarning && isBudgetExceeded) {
      setBudgetModalAllowContinue(true);
      setBudgetModalOpen(true);
      return;
    }
    setEditingTx(null);
    setIsAddTxOpen(true);
  };

  /**
   * `?add=1` opens the add-expense sheet straight away, so every "Add expense"
   * button in the app lands on the form instead of dumping the user on this
   * page to hunt for it. Waits for `outing` — on a cold load the form would
   * otherwise render with no members.
   */
  useEffect(() => {
    if (addParam !== "1") {
      addHandledRef.current = false;
      return;
    }
    if (addHandledRef.current || loading || !outing) return;
    addHandledRef.current = true;

    const next = new URLSearchParams(searchParams);
    next.delete("add");
    setSearchParams(next, { replace: true });

    // Routed through the same helper as the in-page button, so a blown budget
    // still warns first.
    openAddTransaction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addParam, loading, outing?.id]);

  const openEditTx = (tx: import("@/types").Transaction) => {
    if (!outing || !canUserEditTransaction(tx, currentUserId, outing)) {
      toast.error("Only members of this outing can edit its expenses");
      return;
    }
    setEditingTx(tx);
    setIsAddTxOpen(true);
  };

  const handleSaveTransaction = async (values: TransactionFormValues) => {
    if (!outing) return;

    const splits =
      values.splitMode === "equally"
        ? computeSplits(values.amount, outing.members, "equally")
        : values.customSplits;

    if (editingTx) {
      if (!canUserEditTransaction(editingTx, currentUserId, outing)) {
        toast.error("Only members of this outing can edit its expenses");
        return;
      }
      updateTransaction(editingTx.id, {
        title: values.title,
        description: values.description || undefined,
        amount: values.amount,
        paidById: values.paidById,
        payments: values.payments,
        splitMode: values.splitMode,
        splits,
        category: values.category,
        date: toDisplayDate(values.date),
        // Written even when blank: an empty string clears a time the user
        // removed, where `undefined` would be stripped and leave the old one.
        time: values.time,
      });
      toast.success("Transaction updated", offlineNote());
      resetTxModal();
      return;
    }

    setShowSuccess(true);
    await new Promise((r) => setTimeout(r, 800));

    addTransaction({
      outingId: outing.id,
      title: values.title,
      description: values.description || undefined,
      amount: values.amount,
      paidById: values.paidById,
      payments: values.payments.length > 1 ? values.payments : undefined,
      splitMode: values.splitMode,
      customSplits: splits,
      category: values.category,
      date: values.date,
      time: values.time,
    });

    setShowSuccess(false);
    resetTxModal();

    const newTotal = totalSpent + values.amount;
    if (hasBudget && newTotal > outing.budget!) {
      setBudgetModalOpen(true);
      toast.warning("Transaction added but trip budget is now exceeded", offlineNote());
    } else {
      toast.success(isOnline ? "Transaction added" : "Saved on this device", {
        ...offlineNote(),
        action: { label: "Undo", onClick: () => { undoLastAction(); toast.info("Undone"); } },
      });
    }
  };

  /** Reassures the user their expense is safe locally and will sync later. */
  const offlineNote = () =>
    isOnline ? {} : { description: "Will sync when you're back online" };

  const handleDeleteTx = () => {
    if (!deleteTxId || !outing) return;
    const tx = transactions.find((t) => t.id === deleteTxId);
    if (!tx || !canUserDeleteTransaction(tx, currentUserId, outing)) {
      toast.error("Only the person who added this, or the outing owner, can delete it");
      setDeleteTxId(null);
      return;
    }
    deleteTransaction(deleteTxId);
    toast.success(`"${tx.title}" deleted`, {
      description: `${formatCurrency(tx.amount)} removed from ${outing.name}`,
      action: { label: "Undo", onClick: () => undoLastAction() },
    });
    setDeleteTxId(null);
  };

  /**
   * "Balances will be recalculated" tells the user nothing. This says exactly
   * whose balance moves and by how much, before they commit.
   */
  const deleteImpact = useMemo(() => {
    if (!deleteTxId || !outing) return null;
    const tx = transactions.find((t) => t.id === deleteTxId);
    if (!tx) return null;

    const members = getOutingMembers(outing);
    const before = computeMemberBalances(members, transactions, settlementRecords);
    const after = computeMemberBalances(
      members,
      transactions.filter((t) => t.id !== tx.id),
      settlementRecords
    );

    const changes = members
      .map((m) => {
        const from = before.find((b) => b.memberId === m.id)?.balance ?? 0;
        const to = after.find((b) => b.memberId === m.id)?.balance ?? 0;
        return { id: m.id, name: m.name, delta: Math.round((to - from) * 100) / 100 };
      })
      .filter((c) => Math.abs(c.delta) > 0.01)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return { tx, changes };
  }, [deleteTxId, outing, transactions, settlementRecords]);

  const handleStatusChange = (status: "ongoing" | "settled") => {
    if (!outing) return;
    // Reopening by hand outranks the date: without this the auto-complete
    // effect below would close the outing again on the next render.
    if (status === "ongoing") localStorage.setItem(autoCompleteKey(outing.id), "1");
    updateOuting(outing.id, { status });
    toast.success(status === "settled" ? "Marked as done" : "Marked as active");
  };

  const isCreator = outing ? isOutingCreator(outing, currentUserId) : false;
  const isMember = outing ? getOutingMemberIds(outing).includes(currentUserId) : false;
  const canEditOuting = isCreator || isMember;

  /** The trip's last day is behind us — planned/ongoing no longer describes it. */
  const outingEnded = outing ? hasOutingEnded(outing) : false;
  const isComplete = outingEnded || outing?.status === "settled";

  /**
   * Close the outing on its own once the end date passes.
   *
   * Only the creator writes it — every member opening the page would otherwise
   * race on the same update — and only once per outing: the flag survives a
   * manual reopen so the user's choice sticks. Money is untouched either way;
   * a closed outing with an outstanding balance still counts towards balances
   * (see countsTowardLiveBalances in lib/balances).
   */
  useEffect(() => {
    if (!outing || loading || !outingEnded) return;
    if (outing.status === "settled" || !isCreator) return;
    const key = autoCompleteKey(outing.id);
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    updateOuting(outing.id, { status: "settled" });
    toast.success("Outing complete", { description: "Its dates have passed, so it's marked done." });
  }, [outing, outingEnded, isCreator, loading, updateOuting]);

  const canEditSelectedTx = selectedTx && outing
    ? canUserEditTransaction(selectedTx, currentUserId, outing)
    : false;

  const canDeleteSelectedTx = selectedTx && outing
    ? canUserDeleteTransaction(selectedTx, currentUserId, outing)
    : false;

  const handleExportBackup = () => {
    if (!outing) return;
    exportOutingBackup(
      outing,
      transactions,
      settlementRecords,
      currentUserName
    );
    toast.success("Backup file downloaded");
  };

  const handleCloudBackup = async () => {
    if (!outing || backingUp) return;
    setBackingUp(true);
    try {
      await forceBackupOuting(outing.id);
      toast.success("Cloud backup saved");
    } catch {
      toast.error("Cloud backup failed");
    } finally {
      setBackingUp(false);
    }
  };

  const handleConfirmSettle = () => {
    if (!pendingSettle || !outing) return;
    const finalAmount = Number(settleAmountInput) || pendingSettle.amount;
    recordSettlement({
      outingId: outing.id,
      friendId: pendingSettle.memberId,
      friendName: pendingSettle.memberName,
      amount: finalAmount,
      type: pendingSettle.type,
    });
    toast.success(
      `${pendingSettle.type === "settle" ? "Settle" : "Return"} of ${formatCurrency(finalAmount)} with ${pendingSettle.memberName} recorded`
    );
    setPendingSettle(null);
    setIsCustomAmount(false);
    setSettleAmountInput("");
  };

  const handleDeleteOuting = () => {
    if (!outing) return;
    const result = deleteOuting(outing.id);
    if (result === "deleted") {
      toast.success("Outing deleted for everyone");
    } else if (result === "left") {
      toast.success("Removed from your outings");
    }
    setDeleteOutingOpen(false);
    navigate("/outings");
  };

  const handleEditFromDetail = () => {
    if (!selectedTx || !outing) return;
    if (!canUserEditTransaction(selectedTx, currentUserId, outing)) {
      toast.error("Only members of this outing can edit its expenses");
      return;
    }
    openEditTx(selectedTx);
    setSelectedTx(null);
  };

  const handleDeleteFromDetail = () => {
    if (!selectedTx || !outing) return;
    if (!canUserDeleteTransaction(selectedTx, currentUserId, outing)) {
      toast.error("Only the person who added this, or the outing owner, can delete it");
      return;
    }
    setDeleteTxId(selectedTx.id);
    setSelectedTx(null);
  };

  const handleEditOutingSave = (data: EditOutingSaveData) => {
    if (!outing) return;

    updateOuting(outing.id, {
      name: data.name,
      category: data.category,
      location: data.location,
      budget: data.budget,
      startDate: data.startDate,
      endDate: data.endDate,
      note: data.note,
      tags: data.tags,
      archived: data.archived,
      ...(data.membersChanged ? { members: data.members } : {}),
    });

    if (!data.membersChanged) {
      toast.success("Outing updated", { description: data.name });
    }

    if (data.membersChanged) {
      const { recalculatedCount, needsReviewCount } = updateOutingMembers(
        outing.id,
        data.members
      );

      if (needsReviewCount > 0) {
        toast.warning(`${needsReviewCount} transaction(s) need editing`, {
          description:
            "Removed members paid for some expenses. Open those transactions and update who paid.",
        });
      } else if (recalculatedCount > 0) {
        toast.success(
          `Members updated. ${recalculatedCount} transaction${recalculatedCount === 1 ? "" : "s"} recalculated equally.`
        );
      } else {
        toast.success(
          "Members updated. New friends can see this outing. New expenses will split among everyone."
        );
      }
    } else {
      toast.success("Outing updated");
    }
  };

  if (!outing && !loading) {
    return (
      <EmptyState
        icon={Receipt}
        title="Outing not found"
        description="This outing may have been deleted or doesn't exist."
        actionLabel="Back to Outings"
        onAction={() => navigate("/outings")}
      />
    );
  }

  const dates = outing ? formatOutingDates(outing) : "";
  const accent = outing ? getCategoryColor(outing.category) : "";

  const txModalContent = outing ? (
    <div className="relative">
      <TransactionSuccess show={showSuccess} />
      <AddTransactionForm
        outing={outing}
        currentUserId={currentUserId}
        editingTx={editingTx}
        onSubmit={handleSaveTransaction}
        onCancel={resetTxModal}
      />
    </div>
  ) : null;

  const settleModalContent = pendingSettle ? (
    <div className="space-y-4 py-3">
      {isCustomAmount ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Amount (₹)</label>
          <Input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            className="text-lg font-semibold"
            value={settleAmountInput}
            onChange={(e) => setSettleAmountInput(e.target.value)}
          />
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-muted/40 border border-border text-center">
          <p className="text-sm text-muted-foreground mb-1">Total to settle</p>
          <p className="text-3xl font-bold text-foreground">
            {formatCurrency(pendingSettle.amount)}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          onClick={handleConfirmSettle}
          className="w-full gap-2"
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
            className="w-full"
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
            className="w-full"
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
  ) : null;


  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild className="shrink-0 mt-0.5">
              <Link to="/outings"><ArrowLeft size={20} /></Link>
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl capitalize sm:text-2xl font-semibold tracking-tight break-words">
                  {outing?.name}
                </h1>
                {outing && (
                  <Badge
                    className="text-[10px] border-0 shrink-0"
                    style={{ backgroundColor: accent }}
                  >
                    {outing.category}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {dates && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 shrink-0" /> {dates}
                  </span>
                )}
                {outing?.location && (
                  <span className="flex items-center gap-1 break-words">
                    <MapPin className="h-3.5 w-3.5 shrink-0" /> {outing.location}
                  </span>
                )}
                {lastBackedUp && (
                  <span className="flex items-center gap-1 text-xs">
                    <Cloud className="h-3.5 w-3.5 shrink-0" />
                    Last backed up {formatRelativeTime(lastBackedUp)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pl-11 sm:pl-0">
            {outing && outing.status === "planned" ? (
              <Badge variant="secondary" className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold">
                Planning
              </Badge>
            ) : outing && isCreator ? (
              <OutingStatusToggle
                status={outing.status}
                onChange={handleStatusChange}
              />
            ) : outing && outing.status === "settled" ? (
              <Badge variant="secondary" className="px-3 py-1.5 rounded-lg text-xs font-semibold gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Completed
              </Badge>
            ) : null}
            <div className="flex items-center gap-2 ml-auto">
              {canEditOuting && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9"
                  onClick={() => void handleCloudBackup()}
                  disabled={backingUp}
                >
                  <Cloud size={15} />
                  <span className="hidden sm:inline">
                    {backingUp ? "Saving…" : "Backup"}
                  </span>
                </Button>
              )}
              {isCreator && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9"
                  onClick={handleExportBackup}
                  title="Download JSON file"
                >
                  <Download size={15} />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              )}
              {canEditOuting && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9"
                  onClick={() => setIsEditOutingOpen(true)}
                >
                  <Pencil size={15} />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}
              {isCreator && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => setDeleteOutingOpen(true)}
                >
                  <Trash2 size={15} />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}
              {!isCreator && isMember && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => setDeleteOutingOpen(true)}
                >
                  <Trash2 size={15} />
                  <span className="hidden sm:inline">Leave</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* The trip is over — how it landed, and what the budget did */}
      {outing && isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="w-full"
        >
          <OutingCompleteCard
            outing={outing}
            totalSpent={totalSpent}
            myReturns={individualReturns}
          />
        </motion.div>
      )}

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          title="Total Spent"
          value={totalSpent}
          prefix={getCurrencySymbol()}
          variant="primary"
          subtitle={hasBudget && outing ? `Budget: ${formatCurrency(outing.budget!)}` : undefined}
        />
        <StatCard
          title="You Spent"
          value={outingCashFlow.cashOut}
          prefix={getCurrencySymbol()}
          variant="primary"
          subtitle={youSpentSubtitle}
          onClick={() => setIsYourPaidModalOpen(true)}
        />
        <StatCard
          title="Your Share"
          value={yourShare}
          prefix={getCurrencySymbol()}
          variant="default"
        />
        <div className="col-span-2 lg:col-span-1 min-w-0">
          <NetBalanceCard analysis={personalAnalysis} />
        </div>
      </motion.div>

      {outing && hasBudget && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="w-full"
        >
          <BudgetCard budget={outing.budget!} totalSpent={totalSpent} />
        </motion.div>
      )}

      {/* Add transaction modals */}
      {isMobile ? (
        <BottomSheet
          open={isAddTxOpen}
          onOpenChange={(o) => { if (!o) resetTxModal(); else setIsAddTxOpen(true); }}
          title={editingTx ? "Edit Transaction" : "Add Transaction"}
          description={outing?.name}
        >
          {txModalContent}
        </BottomSheet>
      ) : (
        <Dialog open={isAddTxOpen} onOpenChange={(o) => { if (!o) resetTxModal(); else setIsAddTxOpen(true); }}>
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTx ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
              <DialogDescription>Record an expense for {outing?.name}</DialogDescription>
            </DialogHeader>
            {txModalContent}
          </DialogContent>
        </Dialog>
      )}

      {/* Settled with the trip still ahead — almost always a mis-tap, and it
          hides the outing from the dashboard and from balances. */}
      {outing && isPrematurelySettled(outing) && (
        <div className="fintech-card border-destructive/40 bg-destructive/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Marked settled, but this outing hasn&apos;t finished
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  It won&apos;t appear on your dashboard and won&apos;t count towards
                  your balances until you reopen it.
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              className="h-10 shrink-0 gap-2"
              onClick={() => {
                updateOuting(outing.id, { status: "ongoing" });
                toast.success("Outing reopened");
              }}
            >
              <RotateCcw size={16} /> Reopen
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <PremiumTabs defaultValue="activity" className="w-full">
        <PremiumTabsList>
          <PremiumTabsTrigger value="activity" className="gap-2">
            <Receipt size={16} />
            <span>Activity</span>
          </PremiumTabsTrigger>
          <PremiumTabsTrigger value="members" className="gap-2">
            <Users size={16} />
            <span>Members</span>
          </PremiumTabsTrigger>
          <PremiumTabsTrigger value="analysis" className="gap-2">
            <PieChart size={16} />
            <span>Analysis</span>
          </PremiumTabsTrigger>
        </PremiumTabsList>

        {/* Activity — expenses, balances & settlements */}
        <PremiumTabsContent value="activity" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h3 className="font-semibold text-foreground">Activity</h3>
              <p className="text-sm text-muted-foreground">Balances, settlements, and expenses</p>
            </div>
            <Button
              className="gap-2 shadow-md shadow-primary/15 w-full sm:w-auto shrink-0"
              variant={isBudgetExceeded ? "destructive" : "default"}
              onClick={() => openAddTransaction()}
            >
              <Plus size={16} /> {isBudgetExceeded ? "Add (over budget)" : "Add Transaction"}
            </Button>
          </div>

          <div className="fintech-card p-6">
            <h3 className="font-semibold text-foreground mb-1">Individual Returns</h3>
            <p className="text-sm text-muted-foreground mb-5">Who owes whom in this outing</p>
            {individualReturns.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">All balances are settled!</p>
            ) : (
              <div className="space-y-3">
                {individualReturns.map((item) => (
                  <div
                    key={item.memberId}
                    className={cn(
                      "p-3 rounded-xl border",
                      item.youAreOwed ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback seed={item.memberId}>{item.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm sm:text-base leading-tight">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {item.youAreOwed
                              ? `${item.name} owes you`
                              : `You owe ${item.name}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={cn(
                            "font-bold text-sm sm:text-base tabular-nums leading-none",
                            item.youAreOwed ? "text-success" : "text-destructive"
                          )}
                        >
                          {formatCurrency(item.amount)}
                        </span>

                        {item.youAreOwed ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-3 text-[11px] font-bold text-success border-success/30 hover:bg-success/5 hover:text-success gap-1 rounded-md"
                            onClick={() => {
                              setPendingSettle({
                                memberId: item.memberId,
                                memberName: item.name,
                                amount: item.amount,
                                type: "return",
                              });
                              setSettleAmountInput(item.amount.toString());
                              setIsCustomAmount(false);
                            }}
                          >
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                            Return
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 px-3 text-[11px] font-bold gap-1 rounded-md"
                            onClick={() => {
                              setPendingSettle({
                                memberId: item.memberId,
                                memberName: item.name,
                                amount: item.amount,
                                type: "settle",
                              });
                              setSettleAmountInput(item.amount.toString());
                              setIsCustomAmount(false);
                            }}
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            Settle
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="fintech-card p-6">
            <h3 className="font-semibold text-foreground mb-1">Return & Settle Statement</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Your payment history with friends in this outing
            </p>
            <SettlementHistory
              records={settlementRecords}
              currentUserId={currentUserId}
            />
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">All Transactions</h3>
            <div className="fintech-card overflow-hidden">
              {loading ? (
                <div className="divide-y divide-border/50">
                  {[1, 2, 3].map((i) => (
                    <TransactionRowSkeleton key={i} />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No transactions yet"
                  description="Add your first expense to start tracking who paid what."
                  actionLabel="Add Transaction"
                  onAction={openAddTransaction}
                />
              ) : (
                <TransactionList
                  transactions={transactions}
                  currentUserId={currentUserId}
                  onSelect={setSelectedTx}
                />
              )}
            </div>
          </div>
        </PremiumTabsContent>

        {/* Members tab */}
        <PremiumTabsContent value="members">
          {outing && (
            <OutingMembersPanel
              outing={outing}
              members={outing.members}
              transactions={transactions}
              settlementRecords={settlementRecords}
              memberBalances={memberBalances}
              currentUserId={currentUserId}
            />
          )}
        </PremiumTabsContent>

        <PremiumTabsContent value="analysis">
          {outing && (
            <OutingAnalysisTab
              outing={outing}
              categoryData={categoryData}
              memberData={memberSpendingData}
              personal={personalAnalysis}
              totalSpent={totalSpent}
              hasBudget={hasBudget}
              budgetRemaining={budgetRemaining}
              userName={currentUserName}
            />
          )}
        </PremiumTabsContent>
      </PremiumTabs>

      {outing && (
        <EditOutingModal
          open={isEditOutingOpen}
          onOpenChange={setIsEditOutingOpen}
          outing={outing}
          friends={friends}
          transactions={transactions}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onSave={handleEditOutingSave}
        />
      )}

      {selectedTx && outing && (
        isMobile ? (
          <BottomSheet
            open={!!selectedTx}
            onOpenChange={(o) => !o && setSelectedTx(null)}
            title="Transaction details"
          >
            <TransactionDetailPanel
              tx={selectedTx}
              members={outing.members}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              canEdit={canEditSelectedTx}
                canDelete={canDeleteSelectedTx}
              onEdit={handleEditFromDetail}
              onDelete={handleDeleteFromDetail}
            />
          </BottomSheet>
        ) : (
          <Dialog open={!!selectedTx} onOpenChange={(o) => !o && setSelectedTx(null)}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Transaction details</DialogTitle>
                <DialogDescription>Full information for this expense</DialogDescription>
              </DialogHeader>
              <TransactionDetailPanel
                tx={selectedTx}
                members={outing.members}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                canEdit={canEditSelectedTx}
                canDelete={canDeleteSelectedTx}
                onEdit={handleEditFromDetail}
                onDelete={handleDeleteFromDetail}
              />
            </DialogContent>
          </Dialog>
        )
      )}

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
                ? `Pay money to ${pendingSettle.memberName}`
                : `Receive money from ${pendingSettle.memberName}`
            }
          >
            {settleModalContent}
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
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {pendingSettle.type === "settle" ? "Record Settle Payment" : "Record Return Payment"}
                </DialogTitle>
                <DialogDescription>
                  {pendingSettle.type === "settle"
                    ? `Record that you paid money to ${pendingSettle.memberName} for "${outing?.name}".`
                    : `Record that you received money from ${pendingSettle.memberName} for "${outing?.name}".`}
                </DialogDescription>
              </DialogHeader>
              {settleModalContent}
            </DialogContent>
          </Dialog>
        )
      )}

      <ConfirmDialog
        open={deleteOutingOpen}
        onOpenChange={setDeleteOutingOpen}
        title={isCreator ? "Delete this outing?" : "Leave this outing?"}
        description={
          isCreator
            ? "This will permanently delete the outing, all transactions, and balances for everyone. Only you can do this because you created this outing."
            : "This only removes the outing from your account. The creator's outing, transactions, and expenses will not be affected."
        }
        confirmLabel={isCreator ? "Delete outing" : "Leave outing"}
        onConfirm={handleDeleteOuting}
        variant="destructive"
      />

      {outing && hasBudget && (
        <BudgetExceededModal
          open={budgetModalOpen}
          onOpenChange={(open) => {
            setBudgetModalOpen(open);
            if (!open) setBudgetModalAllowContinue(false);
          }}
          outingName={outing.name}
          budget={outing.budget!}
          totalSpent={totalSpent}
          allowContinue={budgetModalAllowContinue}
          onContinue={() => openAddTransaction(true)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTxId}
        onOpenChange={(o) => !o && setDeleteTxId(null)}
        title={
          deleteImpact ? `Delete "${deleteImpact.tx.title}"?` : "Delete this transaction?"
        }
        description={
          deleteImpact
            ? `${formatCurrency(deleteImpact.tx.amount)} will be removed permanently. ${
                deleteImpact.changes.length === 0
                  ? "No balances change."
                  : `Balances change for ${deleteImpact.changes.length} ${
                      deleteImpact.changes.length === 1 ? "member" : "members"
                    }: ${deleteImpact.changes
                      .slice(0, 3)
                      .map(
                        (c) =>
                          `${memberLabel(c.name, c.id === currentUserId)} ${
                            c.delta > 0 ? "+" : "-"
                          }${formatCurrency(Math.abs(c.delta))}`
                      )
                      .join(", ")}${deleteImpact.changes.length > 3 ? "…" : ""}.`
              } You can undo this.`
            : "This expense will be permanently removed."
        }
        confirmLabel="Delete transaction"
        onConfirm={handleDeleteTx}
        variant="destructive"
      />

      {outing && (
        <YourPaidDetailModal
          isOpen={isYourPaidModalOpen}
          onClose={() => setIsYourPaidModalOpen(false)}
          transactions={transactionsPaidByYou}
          members={outing.members}
          currentUserId={currentUserId}
          totalPaid={yourPaid}
        />
      )}
    </div>
  );
}