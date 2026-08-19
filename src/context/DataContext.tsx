import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import type {
  Friend,
  Outing,
  OutingMember,
  Transaction,
  SplitMode,
  DashboardStats,
  Settlement,
  SettlementRecord,
  SettlementStatementType,
  CreateOutingInput,
  TransactionPayment,
} from "@/types";
import { getTransactionsForOutings } from "@/lib/dashboard";
import { deriveOutingStatus, formatOutingDates, getMyOutings } from "@/lib/outing";
import { canUserEditTransaction, canUserDeleteTransaction } from "@/lib/permissions";
import { getOutingMemberIds, getOutingMembers, getRemovedMemberIds } from "@/lib/members";
import {
  computeSplits,
  computeDashboardStats,
  computeGlobalSettlements,
  computeFriendBalances,
  getOutingTotalSpent,
  getMemberBalance,
} from "@/lib/balances";
import {
  subscribeToUserData,
  ensureUserProfile,
  saveOuting,
  updateOutingDoc,
  deleteOutingDoc,
  createFriendship,
  deleteFriendship,
  saveTransaction,
  updateTransactionDoc,
  deleteTransactionDoc,
  saveSettlementRecord,
  deleteTransactionsForOuting,
  deleteSettlementsForOuting,
  replaceAllUserData,
  getOutingBackupRecord,
  restoreOutingFromBackupRecord,
  type AppData,
} from "@/lib/firestore";
import {
  scheduleAutoBackupOuting,
  forceBackupOuting,
  backupAllOutings,
  getOutingLatestChangeAt,
} from "@/lib/outingCloudBackup";
import { buildOutingBackup } from "@/lib/outingBackup";
import { setActiveUserNames } from "@/lib/displayNames";

interface DataContextType {
  outings: Outing[];
  friends: Friend[];
  transactions: Transaction[];
  loading: boolean;
  /** Non-null when the Firestore subscription failed; pages show a retry state. */
  error: string | null;
  retry: () => void;
  /** False while the browser reports no connection; writes are queued locally. */
  isOnline: boolean;
  /** Document ids written locally but not yet acknowledged by the server. */
  pendingIds: Set<string>;
  pendingCount: number;
  /** ISO timestamp of the last successful snapshot — the sync dot's tooltip. */
  lastSyncedAt: string | null;
  currentUserId: string;
  currentUserName: string;
  dashboardStats: DashboardStats;
  globalSettlements: Settlement[];
  settlementRecords: SettlementRecord[];
  friendBalances: Map<string, number>;
  getOuting: (id: string) => Outing | undefined;
  getOutingSettlementRecords: (outingId: string) => SettlementRecord[];
  getOutingTransactions: (outingId: string) => Transaction[];
  getOutingTotalSpent: (outingId: string) => number;
  getOutingYourShare: (outingId: string) => number;
  createOuting: (input: CreateOutingInput) => Outing;
  updateOuting: (id: string, updates: Partial<Pick<Outing, "name" | "category" | "date" | "description" | "status" | "location" | "budget" | "startDate" | "endDate" | "members" | "customCategories" | "pinned" | "note" | "tags" | "archived">>) => void;
  updateOutingMembers: (outingId: string, members: OutingMember[]) => { recalculatedCount: number; needsReviewCount: number };
  /** Creator: full delete. Member: leave outing from own account only. */
  deleteOuting: (id: string) => "deleted" | "left" | null;
  addFriend: (friendId: string, email: string, name: string, phone?: string) => Promise<boolean>;
  removeFriend: (id: string) => void;
  recordSettlement: (data: {
    outingId: string;
    friendId: string;
    friendName: string;
    amount: number;
    type: SettlementStatementType;
  }) => SettlementRecord;
  addTransaction: (data: {
    outingId: string;
    title: string;
    description?: string;
    amount: number;
    paidById: string;
    payments?: TransactionPayment[];
    splitMode: SplitMode;
    customSplits?: { memberId: string; amount: number }[];
    receiptUrl?: string;
    category?: string;
    date?: string;
  }) => Transaction;
  updateTransaction: (id: string, updates: Partial<Pick<Transaction, "title" | "description" | "amount" | "paidById" | "payments" | "splitMode" | "splits" | "receiptUrl" | "category" | "date">>) => void;
  deleteTransaction: (id: string) => void;
  undoLastAction: () => void;
  forceBackupOuting: (outingId: string) => Promise<string | null>;
  backupAllOutings: () => Promise<void>;
  restoreOutingFromBackup: (
    outingId: string,
    options?: { force?: boolean; dryRun?: boolean }
  ) => Promise<"restored" | "conflict" | "missing">;
}

const DataContext = createContext<DataContextType | null>(null);

const EMPTY_DATA: AppData = {
  outings: [],
  friends: [],
  transactions: [],
  settlementRecords: [],
};

function normalizeTransactions(
  transactions: Transaction[],
  userId: string,
  userName: string
): Transaction[] {
  return transactions.map((t) => ({
    ...t,
    createdById: t.createdById ?? userId,
    createdByName: t.createdByName ?? userName,
  }));
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = user?.uid ?? "";
  const currentUserName =
    user?.displayName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "Guest";

  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  // Offline writes are queued by Firestore's persistent cache, so the UI needs
  // to say "queued", not "saved", while the connection is down.
  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);
  // Bumping this re-runs the subscription effect, which is the retry.
  const [retryToken, setRetryToken] = useState(0);
  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setRetryToken((t) => t + 1);
  }, []);
  const [, setUndoStack] = useState<AppData[]>([]);
  const dataRef = useRef(data);
  dataRef.current = data;

  const getBackupData = useCallback(
    () => ({
      outings: dataRef.current.outings,
      transactions: dataRef.current.transactions,
      settlementRecords: dataRef.current.settlementRecords,
    }),
    []
  );

  const scheduleBackup = useCallback(
    (outingId: string) => {
      if (!currentUserId) return;
      const outing = data.outings.find((o) => o.id === outingId);
      const memberIds = outing ? getOutingMemberIds(outing) : [currentUserId];
      scheduleAutoBackupOuting(
        memberIds,
        outingId,
        getBackupData,
        currentUserName
      );
    },
    [currentUserId, currentUserName, getBackupData, data.outings]
  );

  useEffect(() => {
    if (user) {
      setActiveUserNames([
        user.displayName ?? "",
        currentUserName,
        user.email?.split("@")[0] ?? "",
      ]);
    } else {
      setActiveUserNames([]);
    }
  }, [user, currentUserName]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setData(EMPTY_DATA);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    ensureUserProfile(user.uid, {
      name: user.displayName ?? user.email?.split("@")[0] ?? "User",
      email: user.email ?? "",
    }).catch(console.error);

    const unsubscribe = subscribeToUserData(
      user.uid,
      (firestoreData, meta) => {
        setPendingIds(meta.pendingIds);
        setData({
          ...firestoreData,
          transactions: normalizeTransactions(
            firestoreData.transactions,
            user.uid,
            currentUserName
          ),
        });
        setLoading(false);
        setError(null);
        setLastSyncedAt(new Date().toISOString());
      },
      (err) => {
        console.error("Firestore subscription error:", err);
        setError(
          err.message ||
            "Could not reach the server. Check your connection and try again."
        );
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, authLoading, currentUserName, retryToken]);

  const pushUndo = useCallback((prev: AppData) => {
    setUndoStack((s) => [...s.slice(-4), prev]);
  }, []);

  const undoLastAction = useCallback(() => {
    if (!currentUserId) return;

    setUndoStack((s) => {
      const prev = s[s.length - 1];
      if (prev) {
        setData(prev);
        replaceAllUserData(currentUserId, prev).catch(console.error);
        return s.slice(0, -1);
      }
      return s;
    });
  }, [currentUserId]);

  const myOutings = useMemo(
    () => {
      const list = getMyOutings(data.outings, currentUserId);
      return list.map((o) => {
        if (o.status !== "settled") {
          const derived = deriveOutingStatus(o.startDate, o.endDate);
          if (derived !== o.status) {
            return { ...o, status: derived };
          }
        }
        return o;
      });
    },
    [data.outings, currentUserId]
  );

  const getOuting = useCallback(
    (id: string) => myOutings.find((o) => o.id === id),
    [myOutings]
  );

  const getOutingTransactions = useCallback(
    (outingId: string) => data.transactions.filter((t) => t.outingId === outingId),
    [data.transactions]
  );

  const getOutingSettlementRecords = useCallback(
    (outingId: string) =>
      data.settlementRecords
        .filter((r) => r.outingId === outingId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [data.settlementRecords]
  );

  const createOuting = useCallback(
    (input: CreateOutingInput) => {
      if (!currentUserId) throw new Error("Not authenticated");

      const selectedFriends = (input.friendIds ?? [])
        .map((fid) => data.friends.find((f) => f.id === fid))
        .filter(Boolean) as Friend[];

      const members = [
        { id: currentUserId, name: currentUserName },
        ...selectedFriends.map((f) => ({ id: f.id, name: f.name })),
      ];

      const status = deriveOutingStatus(input.startDate, input.endDate);
      const draft: Outing = {
        id: crypto.randomUUID(),
        name: input.name,
        category: input.category,
        date: "",
        status,
        members,
        createdById: currentUserId,
        createdByName: currentUserName,
        location: input.location,
        budget: input.budget,
        startDate: input.startDate,
        endDate: input.endDate,
        createdAt: new Date().toISOString(),
      };
      draft.date = formatOutingDates(draft) || "Just created";

      pushUndo(data);
      // Single write — no sync needed
      saveOuting(draft).catch(console.error);
      // Only this user's backup. Each member's snapshot lives under their own
      // uid and only they may write it, so the previous fan-out across every
      // member was rejected by the rules and silently swallowed.
      forceBackupOuting(
        currentUserId,
        draft.id,
        getBackupData,
        currentUserName,
        buildOutingBackup(draft, [], [], currentUserName)
      ).catch(console.error);

      return draft;
    },
    [currentUserId, currentUserName, data, pushUndo, getBackupData]
  );

  const updateOuting = useCallback(
    (id: string, updates: Partial<Pick<Outing, "name" | "category" | "date" | "description" | "status" | "location" | "budget" | "startDate" | "endDate" | "members" | "customCategories" | "pinned" | "note" | "tags" | "archived">>) => {
      if (!currentUserId) return;

      const outing = data.outings.find((o) => o.id === id);
      if (!outing) return;

      const merged = { ...outing, ...updates };
      if (updates.startDate !== undefined || updates.endDate !== undefined) {
        merged.date = formatOutingDates(merged) || merged.date;
        if (merged.status !== "settled") {
          merged.status = deriveOutingStatus(merged.startDate, merged.endDate);
        }
      }

      // Compute updated memberIds if members changed
      const memberIds = updates.members ? getOutingMemberIds(merged) : undefined;

      pushUndo(data);
      // Single write — no sync needed
      updateOutingDoc(id, {
        name: merged.name,
        category: merged.category,
        date: merged.date,
        description: merged.description,
        status: merged.status,
        location: merged.location,
        budget: merged.budget,
        startDate: merged.startDate,
        endDate: merged.endDate,
        members: merged.members,
        customCategories: merged.customCategories,
        pinned: merged.pinned,
        note: merged.note,
        tags: merged.tags,
        archived: merged.archived,
      }, memberIds).catch(console.error);
      scheduleBackup(id);
    },
    [currentUserId, data, pushUndo, scheduleBackup]
  );

  const updateOutingMembers = useCallback(
    (outingId: string, members: OutingMember[]) => {
      if (!currentUserId) return { recalculatedCount: 0, needsReviewCount: 0 };

      const outing = data.outings.find((o) => o.id === outingId);
      if (!outing) return { recalculatedCount: 0, needsReviewCount: 0 };

      let recalculatedCount = 0;
      let needsReviewCount = 0;
      const memberIds = new Set(members.map((m) => m.id));
      const removedIds = getRemovedMemberIds(getOutingMembers(outing), members.map((m) => m.id));

      const outingTxs = data.transactions.filter((t) => t.outingId === outingId);

      // Only recalculate when members are removed.
      // Persistence + member sync is handled by updateOuting().
      if (removedIds.length > 0) {
        // Snapshot before rewriting every split, so this is recoverable.
        pushUndo(data);

        for (const t of outingTxs) {
          recalculatedCount++;
          const newSplits = computeSplits(t.amount, members, "equally");

          let payments = t.payments;
          if (payments?.length) {
            const filtered = payments.filter((p) => memberIds.has(p.memberId));
            const removedFromPayments = payments.some((p) => !memberIds.has(p.memberId));
            if (removedFromPayments) needsReviewCount++;
            payments = filtered.length > 0 ? filtered : undefined;
          } else if (!memberIds.has(t.paidById)) {
            needsReviewCount++;
          }

          const primaryPayerId =
            payments?.[0]?.memberId ??
            (memberIds.has(t.paidById) ? t.paidById : members[0]?.id ?? t.paidById);
          const payer = members.find((m) => m.id === primaryPayerId);

          // Single write per transaction — no sync needed
          updateTransactionDoc(t.id, {
            splits: newSplits,
            splitMode: "equally",
            payments,
            paidById: primaryPayerId,
            paidByName:
              payments && payments.length > 1
                ? payments.map((p) => p.paidByName).join(", ")
                : payer?.name ?? t.paidByName,
          }).catch(console.error);
        }
        scheduleBackup(outingId);
      }

      return { recalculatedCount, needsReviewCount };
    },
    [currentUserId, data, pushUndo, scheduleBackup]
  );

  const deleteOuting = useCallback(
    (id: string): "deleted" | "left" | null => {
      if (!currentUserId) return null;

      const outing = data.outings.find((o) => o.id === id);
      if (!outing) return null;

      const creatorId = outing.createdById ?? currentUserId;
      const isCreator = creatorId === currentUserId;

      pushUndo(data);

      if (isCreator) {
        // Children first, parent last: the rules authorise deleting another
        // member's transaction by reading the outing's createdById, so the
        // outing doc must still exist while those deletes are evaluated.
        Promise.all([
          deleteTransactionsForOuting(id),
          deleteSettlementsForOuting(id),
        ])
          .then(() => deleteOutingDoc(id))
          .catch(console.error);
        return "deleted";
      }

      // Member leaving: remove themselves from memberIds
      const updatedMembers = outing.members.filter((m) => m.id !== currentUserId);
      const updatedMemberIds = updatedMembers.map((m) => m.id);
      updateOutingDoc(id, { members: updatedMembers }, updatedMemberIds)
        .then(() => {
          scheduleBackup(id);
        })
        .catch(console.error);
      return "left";
    },
    [currentUserId, data, pushUndo, scheduleBackup]
  );

  const addFriend = useCallback(
    async (friendId: string, email: string, _name: string, _phone?: string) => {
      if (!currentUserId) return false;
      if (friendId === currentUserId) return false;

      const normalizedEmail = email.trim().toLowerCase();
      const exists = data.friends.some(
        (f) => f.id === friendId || f.email.toLowerCase() === normalizedEmail
      );
      if (exists) return false;

      try {
        await createFriendship(currentUserId, friendId);
        return true;
      } catch (err) {
        console.error("Failed to create friendship:", err);
        return false;
      }
    },
    [currentUserId, data.friends]
  );

  const removeFriend = useCallback(
    (id: string) => {
      if (!currentUserId) return;
      deleteFriendship(currentUserId, id).catch(console.error);
    },
    [currentUserId]
  );

  const recordSettlement = useCallback(
    (input: {
      outingId: string;
      friendId: string;
      friendName: string;
      amount: number;
      type: SettlementStatementType;
    }) => {
      if (!currentUserId) throw new Error("Not authenticated");

      const outing = data.outings.find((o) => o.id === input.outingId);
      if (!outing) throw new Error("Outing not found");

      const isSettle = input.type === "settle";
      const record: SettlementRecord = {
        id: crypto.randomUUID(),
        outingId: input.outingId,
        fromId: isSettle ? currentUserId : input.friendId,
        fromName: isSettle ? currentUserName : input.friendName,
        toId: isSettle ? input.friendId : currentUserId,
        toName: isSettle ? input.friendName : currentUserName,
        amount: input.amount,
        type: input.type,
        createdAt: new Date().toISOString(),
        recordedById: currentUserId,
        recordedByName: currentUserName,
      };

      const memberIds = getOutingMemberIds(outing);

      pushUndo(data);
      // Single write — no sync needed
      saveSettlementRecord(record, memberIds).catch(console.error);
      scheduleBackup(input.outingId);
      return record;
    },
    [currentUserId, currentUserName, data, pushUndo, scheduleBackup]
  );

  const addTransaction = useCallback(
    (txData: {
      outingId: string;
      title: string;
      description?: string;
      amount: number;
      paidById: string;
      payments?: TransactionPayment[];
      splitMode: SplitMode;
      customSplits?: { memberId: string; amount: number }[];
      receiptUrl?: string;
      category?: string;
      date?: string;
    }) => {
      if (!currentUserId) throw new Error("Not authenticated");

      const outing = data.outings.find((o) => o.id === txData.outingId);
      if (!outing) throw new Error("Outing not found");

      const payments = txData.payments?.length ? txData.payments : undefined;
      const primaryPayerId = payments?.[0]?.memberId ?? txData.paidById;
      const payer = outing.members.find((m) => m.id === primaryPayerId);
      const paidByName = payments && payments.length > 1
        ? payments.map((p) => p.paidByName).join(", ")
        : payer?.name ?? "Unknown";

      const splits = computeSplits(
        txData.amount,
        outing.members,
        txData.splitMode,
        txData.customSplits
      );

      const txDate = txData.date
        ? new Date(txData.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
        : new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });

      const tx: Transaction = {
        id: crypto.randomUUID(),
        outingId: txData.outingId,
        title: txData.title,
        description: txData.description,
        amount: txData.amount,
        paidById: primaryPayerId,
        paidByName,
        payments,
        date: txDate,
        category: txData.category,
        splitMode: txData.splitMode,
        splits,
        receiptUrl: txData.receiptUrl,
        createdAt: new Date().toISOString(),
        createdById: currentUserId,
        createdByName: currentUserName,
      };

      const memberIds = getOutingMemberIds(outing);

      pushUndo(data);
      // Single write — no sync needed
      // Fired now, not in .then(): a Firestore write promise only settles on
      // server ack, so offline it never resolves and the backup was skipped.
      // The backup write queues offline exactly like the transaction does.
      saveTransaction(tx, memberIds).catch(console.error);
      scheduleBackup(txData.outingId);
      return tx;
    },
    [data.outings, currentUserId, currentUserName, data, pushUndo, scheduleBackup]
  );

  const updateTransaction = useCallback(
    (id: string, updates: Partial<Pick<Transaction, "title" | "description" | "amount" | "paidById" | "payments" | "splitMode" | "splits" | "receiptUrl" | "category" | "date">>) => {
      if (!currentUserId) return;

      const tx = data.transactions.find((t) => t.id === id);
      if (!tx) return;

      const outing = data.outings.find((o) => o.id === tx.outingId);
      if (!outing || !canUserEditTransaction(tx, currentUserId, outing)) return;

      const updated = { ...tx, ...updates };
      if (updates.payments?.length) {
        updated.paidById = updates.payments[0].memberId;
        updated.paidByName =
          updates.payments.length > 1
            ? updates.payments.map((p) => p.paidByName).join(", ")
            : updates.payments[0].paidByName;
      } else if (updates.paidById) {
        const payer = outing.members.find((m) => m.id === updates.paidById);
        updated.paidByName = payer?.name ?? tx.paidByName;
      }

      pushUndo(data);
      // Single write — no sync needed
      updateTransactionDoc(id, {
        title: updated.title,
        description: updated.description,
        amount: updated.amount,
        paidById: updated.paidById,
        paidByName: updated.paidByName,
        payments: updated.payments,
        splitMode: updated.splitMode,
        splits: updated.splits,
        receiptUrl: updated.receiptUrl,
        category: updated.category,
        date: updated.date,
      }).catch(console.error);
      scheduleBackup(tx.outingId);
    },
    [currentUserId, data, pushUndo, scheduleBackup]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      if (!currentUserId) return;

      const tx = data.transactions.find((t) => t.id === id);
      if (!tx) return;

      const outing = data.outings.find((o) => o.id === tx.outingId);
      if (!outing || !canUserDeleteTransaction(tx, currentUserId, outing)) return;

      pushUndo(data);
      // Single write — no sync needed
      deleteTransactionDoc(id).catch(console.error);
      scheduleBackup(tx.outingId);
    },
    [currentUserId, data, pushUndo, scheduleBackup]
  );

  const forceBackupOutingFn = useCallback(
    async (outingId: string) => {
      if (!currentUserId) return null;
      return forceBackupOuting(
        currentUserId,
        outingId,
        getBackupData,
        currentUserName
      );
    },
    [currentUserId, currentUserName, getBackupData]
  );

  const backupAllOutingsFn = useCallback(async () => {
    if (!currentUserId) return;
    await backupAllOutings(currentUserId, getBackupData, currentUserName);
  }, [currentUserId, currentUserName, getBackupData]);

  const restoreOutingFromBackupFn = useCallback(
    async (
      outingId: string,
      options?: { force?: boolean; dryRun?: boolean }
    ): Promise<"restored" | "conflict" | "missing"> => {
      if (!currentUserId) return "missing";

      const record = await getOutingBackupRecord(currentUserId, outingId);
      if (!record) return "missing";

      const localLatest = getOutingLatestChangeAt(outingId, dataRef.current);
      const localIsNewer =
        localLatest != null &&
        new Date(localLatest).getTime() > new Date(record.lastBackedUp).getTime();

      if (localIsNewer && !options?.force) {
        return "conflict";
      }

      if (options?.dryRun) {
        return localIsNewer ? "conflict" : "restored";
      }

      await restoreOutingFromBackupRecord(currentUserId, record, currentUserName);
      return "restored";
    },
    [currentUserId, currentUserName]
  );

  const activeTransactions = useMemo(
    () => getTransactionsForOutings(data.transactions, myOutings),
    [data.transactions, myOutings]
  );

  const dashboardStats = useMemo(
    () =>
      computeDashboardStats(
        myOutings,
        activeTransactions,
        currentUserId,
        data.settlementRecords
      ),
    [myOutings, activeTransactions, data.settlementRecords, currentUserId]
  );

  const globalSettlements = useMemo(
    () =>
      computeGlobalSettlements(
        myOutings,
        activeTransactions,
        currentUserId,
        data.settlementRecords
      ),
    [myOutings, activeTransactions, data.settlementRecords, currentUserId]
  );

  const friendBalances = useMemo(
    () =>
      computeFriendBalances(
        data.friends,
        myOutings,
        activeTransactions,
        currentUserId,
        currentUserName,
        data.settlementRecords
      ),
    [
      data.friends,
      myOutings,
      activeTransactions,
      data.settlementRecords,
      currentUserId,
      currentUserName,
    ]
  );

  const value: DataContextType = {
    outings: myOutings,
    friends: data.friends,
    transactions: data.transactions,
    settlementRecords: data.settlementRecords,
    loading,
    error,
    retry,
    isOnline,
    lastSyncedAt,
    pendingIds,
    pendingCount: pendingIds.size,
    currentUserId,
    currentUserName,
    dashboardStats,
    globalSettlements,
    friendBalances,
    getOuting,
    getOutingTransactions,
    getOutingSettlementRecords,
    getOutingTotalSpent: (id) => getOutingTotalSpent(getOutingTransactions(id)),
    getOutingYourShare: (id) => {
      const outing = data.outings.find((o) => o.id === id);
      if (!outing) return 0;
      const records = data.settlementRecords.filter((r) => r.outingId === id);
      return getMemberBalance(
        currentUserId,
        outing.members,
        getOutingTransactions(id),
        records
      );
    },
    createOuting,
    updateOuting,
    updateOutingMembers,
    deleteOuting,
    addFriend,
    removeFriend,
    recordSettlement,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    undoLastAction,
    forceBackupOuting: forceBackupOutingFn,
    backupAllOutings: backupAllOutingsFn,
    restoreOutingFromBackup: restoreOutingFromBackupFn,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

export { computeMemberBalances, simplifyDebts } from "@/lib/balances";