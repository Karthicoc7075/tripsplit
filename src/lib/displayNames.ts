import { formatCurrency } from "@/lib/format";

let activeUserNames: string[] = [];

export function setActiveUserNames(names: string[]) {
  activeUserNames = names.map((n) => n.trim().toLowerCase()).filter(Boolean);
}

export function getFirstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Guest";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function checkIsMe(name: string): boolean {
  const lower = name.toLowerCase();
  if (
    lower === "you" ||
    lower.includes("(you)") ||
    lower.includes(" you")
  ) {
    return true;
  }
  return activeUserNames.some((activeName) => {
    return lower === activeName || lower.startsWith(activeName + " ");
  });
}

export function possessiveLabel(name: string): string {
  const isMe = checkIsMe(name);
  if (isMe) return "Your";
  return `${getFirstName(name)}'s`;
}

/** e.g. Karthi (You) or Sanjay */
export function memberLabel(name: string, isCurrentUser: boolean): string {
  const first = getFirstName(name);
  const isMe = isCurrentUser || checkIsMe(name);
  return isMe ? `${first} (You)` : first;
}

export function formatPersonOwes(name: string, amount: number): string {
  const isMe = checkIsMe(name);
  if (isMe) {
    return `You owe ${formatCurrency(amount)}`;
  }
  return `${getFirstName(name)} owes ${formatCurrency(amount)}`;
}

/**
 * The two directions of a Net Balance, worded the same everywhere it appears.
 * Mirrors the app's vocabulary: money coming back is a "return", money going
 * out is a "settle"/payment to friends.
 */
export function formatPayTo(amount: number, to = "friends"): string {
  return `You pay ${formatCurrency(amount)} to ${to}`;
}

export function formatReturnFrom(amount: number, from = "friends"): string {
  return `${formatCurrency(amount)} return from ${from}`;
}

export function formatPersonIsOwed(name: string, amount: number): string {
  const isMe = checkIsMe(name);
  if (isMe) {
    return `You are owed ${formatCurrency(amount)}`;
  }
  return `${getFirstName(name)} is owed ${formatCurrency(amount)}`;
}

export function formatPersonPaidFor(name: string, amount: number, title: string): string {
  const isMe = checkIsMe(name);
  if (isMe) {
    return `You paid ${formatCurrency(amount)} for ${title}`;
  }
  return `${getFirstName(name)} paid ${formatCurrency(amount)} for ${title}`;
}