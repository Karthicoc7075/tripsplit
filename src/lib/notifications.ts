export type NotificationPermissionState = NotificationPermission | "unsupported";

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}

export function showLocalNotification(title: string, body: string) {
  if (!isPushSupported() || Notification.permission !== "granted") return;

  try {
    new Notification(title, {
      body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
    });
  } catch {
    // Some browsers block without service worker
  }
}

export function getPermissionStatusLabel(permission: NotificationPermissionState): string {
  switch (permission) {
    case "granted":
      return "Allowed on this device";
    case "denied":
      return "Blocked — enable in browser settings";
    case "default":
      return "Permission not granted yet";
    default:
      return "Not supported in this browser";
  }
}

export const NOTIF_STORAGE_KEY = "tripsplit-notifications";

export interface NotificationPrefs {
  push: boolean;
  email: boolean;
}

export function loadNotificationPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as NotificationPrefs;
  } catch {
    // ignore
  }
  return { push: false, email: false };
}

export function saveNotificationPrefs(prefs: NotificationPrefs) {
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(prefs));
}

/** Sync stored push pref with actual browser permission. */
export function resolvePushPref(storedPush: boolean): boolean {
  const permission = getNotificationPermission();
  if (permission !== "granted") return false;
  return storedPush;
}

export function shouldShowPushNotifications(): boolean {
  return resolvePushPref(loadNotificationPrefs().push);
}