import type { Transaction, Outing, Friend } from "@/types";
import { formatRelativeTime } from "@/lib/format";
import { getOutingMemberIds, getOutingMembers } from "@/lib/members";
import { getOutingStatusLabel } from "@/lib/outing";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  createdAt: string;
  path: string;
}

const LAST_SEEN_KEY = "tripsplit-notif-last-seen";

function buildExpenseNotifications(
  transactions: Transaction[],
  outings: Outing[],
  currentUserId: string
): NotificationItem[] {
  const outingMap = new Map(outings.map((o) => [o.id, o]));

  return transactions.map((tx) => {
    const outing = outingMap.get(tx.outingId);
    const outingLabel = outing ? ` in ${outing.name}` : "";

    let payerText = "";
    if (tx.payments && tx.payments.length > 1) {
      const names = tx.payments.map((p) => {
        let mName = p.paidByName;
        for (const o of outings) {
          const m = o.members?.find((m) => m.id === p.memberId);
          if (m) {
            mName = m.name;
            break;
          }
        }
        return p.memberId === currentUserId ? "You" : mName;
      });

      if (names.length === 2) {
        payerText = `${names[0]} and ${names[1]}`;
      } else {
        payerText = `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
      }
    } else {
      payerText = tx.paidById === currentUserId ? "You" : tx.paidByName;
    }

    return {
      id: `expense-${tx.id}`,
      title: "New expense",
      message: `${payerText} paid ₹${tx.amount.toLocaleString("en-IN")} for '${tx.title}'${outingLabel}`,
      time: formatRelativeTime(tx.createdAt),
      createdAt: tx.createdAt,
      path: `/outings/${tx.outingId}`,
    };
  });
}

export function getInvitedOutings(outings: Outing[], currentUserId: string): Outing[] {
  return outings.filter((outing) => {
    const members = getOutingMembers(outing);
    const creatorId = outing.createdById ?? members[0]?.id;
    if (!creatorId || creatorId === currentUserId) return false;
    return getOutingMemberIds(outing).includes(currentUserId);
  });
}

function buildOutingInviteNotifications(
  outings: Outing[],
  currentUserId: string
): NotificationItem[] {
  return getInvitedOutings(outings, currentUserId).map((outing) => {
    const creatorName = outing.createdByName ?? outing.members[0]?.name ?? "Someone";

    return {
      id: `outing-invite-${outing.id}`,
      title: getOutingStatusLabel(outing.status),
      message: `${creatorName} added you to '${outing.name}'`,
      time: formatRelativeTime(outing.createdAt),
      createdAt: outing.createdAt,
      path: `/outings/${outing.id}`,
    };
  });
}

function buildFriendNotifications(
  friends: Friend[],
  currentUserId: string
): NotificationItem[] {
  return friends
    .filter((friend) => friend.addedBy && friend.addedBy !== currentUserId && friend.addedAt)
    .map((friend) => ({
      id: `friend-${friend.id}-${friend.addedAt}`,
      title: "New friend added",
      message: `${friend.name} added you as a friend`,
      time: formatRelativeTime(friend.addedAt!),
      createdAt: friend.addedAt!,
      path: `/friends/details/${friend.id}`,
    }));
}

export function buildNotificationHistory(
  transactions: Transaction[],
  outings: Outing[],
  friends: Friend[],
  currentUserId: string,
  _currentUserName: string,
  limit = 20
): NotificationItem[] {
  const items = [
    ...buildExpenseNotifications(transactions, outings, currentUserId),
    ...buildOutingInviteNotifications(outings, currentUserId),
    ...buildFriendNotifications(friends, currentUserId),
  ];

  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map((item) => ({
      ...item,
      time: formatRelativeTime(item.createdAt),
    }));
}

export function getLastSeenTimestamp(): string | null {
  return localStorage.getItem(LAST_SEEN_KEY);
}

export function markNotificationsSeen(notifications: NotificationItem[]) {
  if (notifications.length === 0) return;
  const latest = notifications.reduce((max, n) =>
    new Date(n.createdAt).getTime() > new Date(max).getTime() ? n.createdAt : max,
    notifications[0].createdAt
  );
  localStorage.setItem(LAST_SEEN_KEY, latest);
}

export function getUnreadCount(notifications: NotificationItem[]): number {
  const lastSeen = getLastSeenTimestamp();
  if (!lastSeen) return notifications.length;
  const lastSeenTime = new Date(lastSeen).getTime();
  return notifications.filter((n) => new Date(n.createdAt).getTime() > lastSeenTime).length;
}

export function getIncomingFriends(friends: Friend[], currentUserId: string): Friend[] {
  return friends.filter(
    (friend) => friend.addedBy && friend.addedBy !== currentUserId && friend.addedAt
  );
}