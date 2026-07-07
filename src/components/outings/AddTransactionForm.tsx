import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getOutingMembers } from "@/lib/members";
import { TRANSACTION_CATEGORIES, type Outing, type Transaction, type TransactionPayment } from "@/types";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export interface TransactionFormValues {
  title: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  payerMode: "alone" | "multiple";
  paidById: string;
  payments: TransactionPayment[];
  splitMode: "equally";
  customSplits: { memberId: string; amount: number }[];
}

interface AddTransactionFormProps {
  outing: Outing;
  currentUserId: string;
  editingTx?: Transaction | null;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  onCancel: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddTransactionForm({
  outing,
  currentUserId,
  editingTx,
  onSubmit,
  onCancel,
}: AddTransactionFormProps) {
  const [title, setTitle] = useState(editingTx?.title ?? "");
  const [description, setDescription] = useState(editingTx?.description ?? "");
  const [amount, setAmount] = useState(editingTx ? String(editingTx.amount) : "");
  const [category, setCategory] = useState(editingTx?.category ?? "Food");
  const [date, setDate] = useState(
    editingTx?.date
      ? new Date(editingTx.createdAt).toISOString().slice(0, 10)
      : todayIso()
  );
  const [payerMode, setPayerMode] = useState<"alone" | "multiple">(
    editingTx?.payments && editingTx.payments.length > 1 ? "multiple" : "alone"
  );
  const [paidById, setPaidById] = useState(editingTx?.paidById ?? currentUserId);
  const [selectedPayers, setSelectedPayers] = useState<string[]>(() => {
    if (editingTx?.payments?.length) return editingTx.payments.map((p) => p.memberId);
    return [editingTx?.paidById ?? currentUserId];
  });
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (editingTx?.payments?.length) {
      editingTx.payments.forEach((p) => { map[p.memberId] = String(p.amount); });
    }
    return map;
  });
  const [submitting, setSubmitting] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const { updateOuting } = useData();

  const availableCategories = useMemo(() => {
    return [...TRANSACTION_CATEGORIES, ...(outing.customCategories || [])];
  }, [outing.customCategories]);

  const handleAddCustomCategory = async () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) return;

    if (availableCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Category already exists");
      return;
    }

    setIsAdding(true);
    try {
      const currentCustom = outing.customCategories || [];
      const newCustom = [...currentCustom, trimmed];
      await updateOuting(outing.id, { customCategories: newCustom });
      setCategory(trimmed);
      setShowAddCategory(false);
      setCustomCategoryInput("");
      toast.success("Category added successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add category");
    } finally {
      setIsAdding(false);
    }
  };

  const members = getOutingMembers(outing);
  const totalAmount = Number(amount) || 0;
  const equalShare = members.length > 0 ? totalAmount / members.length : 0;

  const paymentsSum = useMemo(() => {
    if (payerMode !== "multiple") return totalAmount;
    return selectedPayers.reduce((sum, id) => sum + (Number(payerAmounts[id]) || 0), 0);
  }, [payerMode, selectedPayers, payerAmounts, totalAmount]);

  const paymentRemaining = totalAmount - paymentsSum;

  const paymentsMismatch =
    payerMode === "multiple" &&
    totalAmount > 0 &&
    Math.abs(paymentRemaining) > 0.01;

  const togglePayer = (memberId: string) => {
    setSelectedPayers((prev) => {
      if (prev.includes(memberId)) {
        if (prev.length === 1) return prev;
        const next = prev.filter((id) => id !== memberId);
        const copy = { ...payerAmounts };
        delete copy[memberId];
        setPayerAmounts(copy);
        return next;
      }
      return [...prev, memberId];
    });
  };

  const buildPayments = (): TransactionPayment[] => {
    if (payerMode === "alone") {
      const member = members.find((m) => m.id === paidById);
      return [{ memberId: paidById, paidByName: member?.name ?? "Unknown", amount: totalAmount }];
    }
    return selectedPayers.map((id) => {
      const member = members.find((m) => m.id === id);
      return {
        memberId: id,
        paidByName: member?.name ?? "Unknown",
        amount: Number(payerAmounts[id]) || 0,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !totalAmount || paymentsMismatch) return;

    setSubmitting(true);
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      amount: totalAmount,
      category,
      date,
      payerMode,
      paidById: payerMode === "alone" ? paidById : selectedPayers[0],
      payments: buildPayments(),
      splitMode: "equally",
      customSplits: [],
    });
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>Title <span className="text-destructive">*</span></Label>
        <Input
          placeholder="e.g., Dinner, Cab fare..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          placeholder="Optional notes"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Amount (₹) <span className="text-destructive">*</span></Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <div className="flex flex-wrap items-center gap-2">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                category === cat
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}

          {showAddCategory ? (
            <div className="flex items-center gap-1.5 w-full sm:w-auto sm:max-w-xs mt-1 sm:mt-0">
              <Input
                placeholder="New category"
                value={customCategoryInput}
                onChange={(e) => setCustomCategoryInput(e.target.value)}
                className="h-8 text-xs px-2.5 py-1 w-32 sm:w-36"
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold"
                onClick={handleAddCustomCategory}
                disabled={isAdding || !customCategoryInput.trim()}
              >
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setShowAddCategory(false);
                  setCustomCategoryInput("");
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddCategory(true)}
              className="px-3 py-1 rounded-full text-xs font-semibold border border-dashed border-primary text-primary hover:bg-primary/5 transition-all flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add New
            </button>
          )}
        </div>
      </div>

      {/* Who paid */}
      <div className="space-y-3 pt-2 border-t border-border/50">
        <Label className="text-sm font-semibold">Who Paid?</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["alone", "multiple"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPayerMode(mode)}
              className={cn(
                "p-3 rounded-lg border text-sm font-medium transition-all text-left",
                payerMode === mode
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/60 hover:bg-muted/40"
              )}
            >
              {mode === "alone" ? "Alone" : "Multiple"}
              <p className="text-[11px] font-normal text-muted-foreground mt-0.5">
                {mode === "alone" ? "One person paid full amount" : "Several people contributed"}
              </p>
            </button>
          ))}
        </div>

        {payerMode === "alone" ? (
          <div className="grid gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaidById(m.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  paidById === m.id ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{m.id === currentUserId ? "Y" : m.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{m.id === currentUserId ? "You" : m.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const selected = selectedPayers.includes(m.id);
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    selected ? "border-primary/40 bg-primary/5" : "border-border/60"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => togglePayer(m.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{m.id === currentUserId ? "Y" : m.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{m.id === currentUserId ? "You" : m.name}</span>
                  </button>
                  {selected && (
                    <Input
                      type="number"
                      min="0"
                      className="h-9 w-28 text-right"
                      placeholder="₹0"
                      value={payerAmounts[m.id] ?? ""}
                      onChange={(e) =>
                        setPayerAmounts({ ...payerAmounts, [m.id]: e.target.value })
                      }
                    />
                  )}
                </div>
              );
            })}
            {paymentsMismatch && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Paid amounts must equal total transaction amount.</p>
                  <p className="text-xs mt-1 opacity-90">
                    Current total: ₹{paymentsSum.toLocaleString("en-IN")} · Expected: ₹{totalAmount.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs mt-0.5 font-semibold">
                    {paymentRemaining > 0
                      ? `Remaining to add: ₹${paymentRemaining.toLocaleString("en-IN")}`
                      : `Over by: ₹${Math.abs(paymentRemaining).toLocaleString("en-IN")}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Always split equally — read-only preview */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Split equally</p>
            <p className="text-xs text-muted-foreground">
              Always divided among all {members.length} members in this outing
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">{m.id === currentUserId ? "Y" : m.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground">{m.id === currentUserId ? "You" : m.name}</span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {totalAmount ? `₹${equalShare.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2 sticky bottom-0 bg-background">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <motion.div className="flex-1" whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            className="w-full"
            disabled={!title.trim() || !totalAmount || paymentsMismatch || submitting}
          >
            {submitting ? "Saving..." : editingTx ? "Update Transaction" : "Save Transaction"}
          </Button>
        </motion.div>
      </div>
    </form>
  );
}