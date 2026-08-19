import type { Outing, Transaction } from "@/types";
import { isOutingCreator } from "@/lib/outing";
import { getOutingMembers } from "@/lib/members";

/**
 * Who can do what inside an outing.
 *
 * Editing and deleting are deliberately different rights:
 *
 * - **Edit** — any member. Expenses are shared, someone mistypes an amount or
 *   picks the wrong payer, and whoever notices should be able to correct it.
 *   Removing a member also re-splits every transaction in the outing, which is
 *   an edit performed by whoever made the change.
 * - **Delete** — only the person who logged the expense, or the outing's
 *   owner. Deleting silently changes everyone's balance and cannot be
 *   recovered by another member, so it stays with the two people accountable
 *   for it.
 *
 * These mirror firestore.rules exactly. The rules are the real boundary; this
 * exists so the UI does not offer actions that would be rejected.
 */

export function isOutingMember(outing: Outing, userId: string): boolean {
  return getOutingMembers(outing).some((m) => m.id === userId);
}

/** Any member of the outing may edit any expense in it. */
export function canUserEditTransaction(
  _transaction: Transaction,
  currentUserId: string,
  outing: Outing
): boolean {
  return isOutingMember(outing, currentUserId);
}

/** Only the expense's author, or the outing's owner, may delete it. */
export function canUserDeleteTransaction(
  transaction: Transaction,
  currentUserId: string,
  outing: Outing
): boolean {
  if (!isOutingMember(outing, currentUserId)) return false;
  if (transaction.createdById === currentUserId) return true;
  return isOutingCreator(outing, currentUserId);
}
