import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getOutingMemberIds } from "@/lib/members";
import type { OutingBackupData } from "@/lib/outingBackup";
import type {
  Friend,
  Outing,
  Transaction,
  SettlementRecord,
} from "@/types";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
}

export interface AppData {
  outings: Outing[];
  friends: Friend[];
  transactions: Transaction[];
  settlementRecords: SettlementRecord[];
}

const EMPTY_DATA: AppData = {
  outings: [],
  friends: [],
  transactions: [],
  settlementRecords: [],
};

export interface Friendship {
  id: string;
  user1: string;
  user2: string;
  addedBy: string;
  status: "accepted" | "pending";
  createdAt: string;
}

// ─── Top-level collection refs ───────────────────────────────────────────────

function friendshipsRef() {
  return collection(db, "friendships");
}

function outingsRef() {
  return collection(db, "outings");
}

function transactionsRef() {
  return collection(db, "transactions");
}

function settlementsRef() {
  return collection(db, "settlementRecords");
}

function backupsRef() {
  return collection(db, "backups");
}

/** Consistent ordering so each pair has exactly one friendship document. */
function normalizeFriendPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export interface OutingBackupRecord {
  outingId: string;
  outingName: string;
  lastBackedUp: string;
  data: OutingBackupData;
  transactionCount: number;
  userId?: string;
}

export interface OutingBackupSummary {
  outingId: string;
  outingName: string;
  lastBackedUp: string;
  transactionCount: number;
}

function mapDocs<T extends { id: string }>(snap: { docs: { id: string; data: () => Record<string, unknown> }[] }): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

/** Firestore rejects `undefined` field values — omit those keys before writes. */
function stripUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as T;
}

// ─── User Profile ────────────────────────────────────────────────────────────

export async function createUserProfile(
  uid: string,
  data: { name: string; email: string; phone?: string }
): Promise<UserProfile> {
  const profile: UserProfile = {
    id: uid,
    name: data.name,
    email: data.email.toLowerCase(),
    phone: data.phone,
    createdAt: new Date().toISOString(),
  };
  await setDoc(
    doc(db, "users", uid),
    stripUndefined({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      createdAt: profile.createdAt,
    })
  );
  return profile;
}

export async function ensureUserProfile(
  uid: string,
  data: { name: string; email: string }
): Promise<UserProfile> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: uid, ...snap.data() } as UserProfile;
  }
  return createUserProfile(uid, data);
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserProfile, "name" | "phone">>
): Promise<void> {
  await updateDoc(doc(db, "users", uid), stripUndefined(updates as Record<string, unknown>));
}

export async function searchUserByEmail(email: string): Promise<UserProfile[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];

  const q = query(
    collection(db, "users"),
    where("email", ">=", normalized),
    where("email", "<=", normalized + "\uf8ff"),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserProfile);
}

export async function getDiscoverableUsers(limitCount: number = 10): Promise<UserProfile[]> {
  const q = query(collection(db, "users"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserProfile);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { id: uid, ...snap.data() } as UserProfile;
}

export async function isEmailRegistered(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const q = query(collection(db, "users"), where("email", "==", normalized), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

// ─── Friendships ─────────────────────────────────────────────────────────────

export async function friendshipExists(uid1: string, uid2: string): Promise<boolean> {
  const [user1, user2] = normalizeFriendPair(uid1, uid2);
  const q = query(
    friendshipsRef(),
    where("user1", "==", user1),
    where("user2", "==", user2)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function createFriendship(addedBy: string, friendUid: string): Promise<string> {
  const [user1, user2] = normalizeFriendPair(addedBy, friendUid);
  if (await friendshipExists(user1, user2)) {
    throw new Error("Already friends");
  }

  const ref = doc(friendshipsRef());
  await setDoc(
    ref,
    stripUndefined({
      user1,
      user2,
      addedBy,
      status: "accepted",
      createdAt: new Date().toISOString(),
    })
  );
  return ref.id;
}

export async function deleteFriendship(uid1: string, uid2: string): Promise<void> {
  const [user1, user2] = normalizeFriendPair(uid1, uid2);
  const q = query(
    friendshipsRef(),
    where("user1", "==", user1),
    where("user2", "==", user2)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

async function resolveFriendsFromFriendships(
  friendships: Friendship[],
  currentUserId: string
): Promise<Friend[]> {
  const unique = Array.from(new Map(friendships.map((f) => [f.id, f])).values());

  const friends = await Promise.all(
    unique.map(async (friendship) => {
      const friendUid =
        friendship.user1 === currentUserId ? friendship.user2 : friendship.user1;
      const profile = await getUserProfile(friendUid);

      if (profile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          addedAt: friendship.createdAt,
          addedBy: friendship.addedBy,
        } satisfies Friend;
      }

      return {
        id: friendUid,
        name: "Unknown User",
        email: "",
        addedAt: friendship.createdAt,
        addedBy: friendship.addedBy,
      } satisfies Friend;
    })
  );

  return friends.sort(
    (a, b) => new Date(b.addedAt ?? 0).getTime() - new Date(a.addedAt ?? 0).getTime()
  );
}

function subscribeToFriends(
  uid: string,
  onFriends: (friends: Friend[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  let friendships1: Friendship[] = [];
  let friendships2: Friendship[] = [];
  let requestId = 0;

  const handleError = (err: unknown) => {
    onError?.(err instanceof Error ? err : new Error(String(err)));
  };

  const mergeAndResolve = async () => {
    const currentRequest = ++requestId;
    const merged = [...friendships1, ...friendships2];
    try {
      const friends = await resolveFriendsFromFriendships(merged, uid);
      if (currentRequest === requestId) {
        onFriends(friends);
      }
    } catch (err) {
      handleError(err);
    }
  };

  const q1 = query(friendshipsRef(), where("user1", "==", uid));
  const q2 = query(friendshipsRef(), where("user2", "==", uid));

  const unsub1 = onSnapshot(
    q1,
    (snap) => {
      friendships1 = mapDocs<Friendship>(snap);
      mergeAndResolve();
    },
    handleError
  );

  const unsub2 = onSnapshot(
    q2,
    (snap) => {
      friendships2 = mapDocs<Friendship>(snap);
      mergeAndResolve();
    },
    handleError
  );

  return () => {
    unsub1();
    unsub2();
  };
}

// ─── Real-time subscription (top-level collections with array-contains) ──────

export function subscribeToUserData(
  uid: string,
  onData: (data: AppData) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const state: AppData = { ...EMPTY_DATA };
  const ready = { friends: false, outings: false, transactions: false, settlements: false };

  const emit = () => {
    if (ready.friends && ready.outings && ready.transactions && ready.settlements) {
      onData({ ...state });
    }
  };

  const handleError = (err: unknown) => {
    onError?.(err instanceof Error ? err : new Error(String(err)));
  };

  const unsubFriends = subscribeToFriends(
    uid,
    (friends) => {
      state.friends = friends;
      ready.friends = true;
      emit();
    },
    handleError
  );

  // Query top-level outings where user is a member
  const outingsQuery = query(outingsRef(), where("memberIds", "array-contains", uid));
  const unsubOutings = onSnapshot(
    outingsQuery,
    (snap) => {
      state.outings = mapDocs<Outing>(snap);
      ready.outings = true;
      emit();
    },
    handleError
  );

  // Query top-level transactions where user is a member
  const txQuery = query(transactionsRef(), where("memberIds", "array-contains", uid));
  const unsubTransactions = onSnapshot(
    txQuery,
    (snap) => {
      state.transactions = mapDocs<Transaction>(snap);
      ready.transactions = true;
      emit();
    },
    handleError
  );

  // Query top-level settlements where user is a member
  const settleQuery = query(settlementsRef(), where("memberIds", "array-contains", uid));
  const unsubSettlements = onSnapshot(
    settleQuery,
    (snap) => {
      state.settlementRecords = mapDocs<SettlementRecord>(snap);
      ready.settlements = true;
      emit();
    },
    handleError
  );

  return () => {
    unsubFriends();
    unsubOutings();
    unsubTransactions();
    unsubSettlements();
  };
}

// ─── Outing CRUD (single doc, no sync needed) ───────────────────────────────

export async function saveOuting(outing: Outing): Promise<void> {
  const { id, ...rest } = outing;
  const memberIds = getOutingMemberIds(outing);
  await setDoc(doc(outingsRef(), id), stripUndefined({ ...rest, memberIds } as Record<string, unknown>));
}

export async function updateOutingDoc(
  id: string,
  updates: Partial<Omit<Outing, "id">>,
  memberIds?: string[]
): Promise<void> {
  const payload: Record<string, unknown> = { ...updates };
  // If members are being updated, recompute the memberIds array
  if (memberIds) {
    payload.memberIds = memberIds;
  }
  await updateDoc(doc(outingsRef(), id), stripUndefined(payload));
}

export async function deleteOutingDoc(id: string): Promise<void> {
  await deleteDoc(doc(outingsRef(), id));
}

// ─── Transaction CRUD (single doc, no sync needed) ──────────────────────────

export async function saveTransaction(tx: Transaction, memberIds: string[]): Promise<void> {
  const { id, ...rest } = tx;
  await setDoc(doc(transactionsRef(), id), stripUndefined({ ...rest, memberIds } as Record<string, unknown>));
}

export async function updateTransactionDoc(
  id: string,
  updates: Partial<Omit<Transaction, "id">>
): Promise<void> {
  await updateDoc(doc(transactionsRef(), id), stripUndefined(updates as Record<string, unknown>));
}

export async function deleteTransactionDoc(id: string): Promise<void> {
  await deleteDoc(doc(transactionsRef(), id));
}

// ─── Settlement CRUD (single doc, no sync needed) ───────────────────────────

export async function saveSettlementRecord(record: SettlementRecord, memberIds: string[]): Promise<void> {
  const { id, ...rest } = record;
  await setDoc(doc(settlementsRef(), id), stripUndefined({ ...rest, memberIds } as Record<string, unknown>));
}

// ─── Bulk delete helpers ────────────────────────────────────────────────────

export async function deleteTransactionsForOuting(outingId: string): Promise<void> {
  const snap = await getDocs(query(transactionsRef(), where("outingId", "==", outingId)));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  if (!snap.empty) await batch.commit();
}

export async function deleteSettlementsForOuting(outingId: string): Promise<void> {
  const snap = await getDocs(query(settlementsRef(), where("outingId", "==", outingId)));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  if (!snap.empty) await batch.commit();
}

// ─── Replace all user data (undo/import) ─────────────────────────────────────

export async function replaceAllUserData(uid: string, data: AppData): Promise<void> {
  // Delete existing docs where user is a member
  const [outingsSnap, txSnap, settleSnap] = await Promise.all([
    getDocs(query(outingsRef(), where("memberIds", "array-contains", uid))),
    getDocs(query(transactionsRef(), where("memberIds", "array-contains", uid))),
    getDocs(query(settlementsRef(), where("memberIds", "array-contains", uid))),
  ]);

  const batch = writeBatch(db);

  outingsSnap.docs.forEach((d) => batch.delete(d.ref));
  txSnap.docs.forEach((d) => batch.delete(d.ref));
  settleSnap.docs.forEach((d) => batch.delete(d.ref));

  for (const outing of data.outings) {
    const { id, ...rest } = outing;
    const memberIds = getOutingMemberIds(outing);
    batch.set(doc(outingsRef(), id), stripUndefined({ ...rest, memberIds } as Record<string, unknown>));
  }
  for (const tx of data.transactions) {
    const { id, ...rest } = tx;
    // Use the outing's memberIds for the transaction
    const outing = data.outings.find((o) => o.id === tx.outingId);
    const memberIds = outing ? getOutingMemberIds(outing) : [uid];
    batch.set(doc(transactionsRef(), id), stripUndefined({ ...rest, memberIds } as Record<string, unknown>));
  }
  for (const record of data.settlementRecords) {
    const { id, ...rest } = record;
    const outing = data.outings.find((o) => o.id === record.outingId);
    const memberIds = outing ? getOutingMemberIds(outing) : [uid];
    batch.set(doc(settlementsRef(), id), stripUndefined({ ...rest, memberIds } as Record<string, unknown>));
  }

  await batch.commit();
}

// ─── Cloud Backup (flat /backups collection) ─────────────────────────────────

function backupDocId(uid: string, outingId: string): string {
  return `${uid}_${outingId}`;
}

export async function saveOutingBackupToCloud(
  uid: string,
  outingId: string,
  payload: OutingBackupData
): Promise<string> {
  const lastBackedUp = new Date().toISOString();
  await setDoc(
    doc(backupsRef(), backupDocId(uid, outingId)),
    stripUndefined({
      userId: uid,
      outingId,
      outingName: payload.outing.name,
      lastBackedUp,
      transactionCount: payload.transactions.length,
      data: payload,
    } as Record<string, unknown>)
  );
  return lastBackedUp;
}

export async function getOutingBackupRecord(
  uid: string,
  outingId: string
): Promise<OutingBackupRecord | null> {
  const snap = await getDoc(doc(backupsRef(), backupDocId(uid, outingId)));
  if (!snap.exists()) return null;
  return snap.data() as OutingBackupRecord;
}

export function subscribeOutingBackupMeta(
  uid: string,
  outingId: string,
  onUpdate: (lastBackedUp: string | null) => void
): Unsubscribe {
  return onSnapshot(doc(backupsRef(), backupDocId(uid, outingId)), (snap) => {
    if (!snap.exists()) {
      onUpdate(null);
      return;
    }
    onUpdate((snap.data().lastBackedUp as string) ?? null);
  });
}

export async function listOutingBackupSummaries(uid: string): Promise<OutingBackupSummary[]> {
  const snap = await getDocs(query(backupsRef(), where("userId", "==", uid)));
  return snap.docs
    .map((d) => {
      const row = d.data();
      return {
        outingId: row.outingId as string,
        outingName: row.outingName as string,
        lastBackedUp: row.lastBackedUp as string,
        transactionCount: (row.transactionCount as number) ?? 0,
      };
    })
    .sort(
      (a, b) => new Date(b.lastBackedUp).getTime() - new Date(a.lastBackedUp).getTime()
    );
}

export async function deleteOutingBackupDoc(uid: string, outingId: string): Promise<void> {
  await deleteDoc(doc(backupsRef(), backupDocId(uid, outingId)));
}

export async function restoreOutingFromBackupRecord(
  uid: string,
  record: OutingBackupRecord,
  userName?: string
): Promise<void> {
  const { outing, transactions, settlements } = record.data;
  
  // Ensure the restoring user is in the members list so they can see the outing
  const memberIds = getOutingMemberIds(outing);
  if (!memberIds.includes(uid)) {
    outing.members = [
      ...outing.members,
      { id: uid, name: userName || "You" }
    ];
  }
  
  if (!outing.createdById) {
    outing.createdById = uid;
  }

  const outingMemberIds = getOutingMemberIds(outing);

  await saveOuting(outing);
  await deleteTransactionsForOuting(outing.id);
  await deleteSettlementsForOuting(outing.id);
  await Promise.all(transactions.map((tx) => saveTransaction(tx, outingMemberIds)));
  await Promise.all(settlements.map((r) => saveSettlementRecord(r, outingMemberIds)));
}