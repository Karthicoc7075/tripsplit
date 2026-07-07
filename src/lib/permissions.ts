import type { Outing, Transaction } from "@/types";
import { isOutingCreator } from "@/lib/outing";

/** Transaction creator or outing owner may edit/delete; other members may only view. */
export function canUserModifyTransaction(
  transaction: Transaction,
  currentUserId: string,
  outing: Outing
): boolean {
  if (transaction.createdById === currentUserId) {
    return true;
  }
  if (isOutingCreator(outing, currentUserId)) {
    return true;
  }
  return false;
}