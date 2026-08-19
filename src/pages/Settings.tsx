import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { updateProfile } from "firebase/auth";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { CURRENCIES, getCurrencyCode, setCurrencyCode, type CurrencyCode } from "@/lib/format";
import { useTheme } from "@/components/ThemeProvider";
import {
  User,
  Users,
  Bell,
  Shield,
  Moon,
  Sun,
  Monitor,
  LogOut,
  KeyRound,
  Loader2,
  Smartphone,
  Check,
  ChevronRight,
  HardDrive,
  Trash2,
  Map,
  Cloud,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PremiumTabs,
  PremiumTabsContent,
  PremiumTabsList,
  PremiumTabsTrigger,
} from "@/components/fintech/PremiumTabs";
import { FloatingInput } from "@/components/fintech/FloatingInput";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { updateUserProfile } from "@/lib/firestore";
import {
  type NotificationPrefs,
  type NotificationPermissionState,
  loadNotificationPrefs,
  saveNotificationPrefs,
  resolvePushPref,
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showLocalNotification,
  getPermissionStatusLabel,
} from "@/lib/notifications";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BackupRestorePanel } from "@/components/settings/BackupRestorePanel";
import { useData } from "@/context/DataContext";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function SettingsSection({
  title,
  description,
  children,
  icon: Icon,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="fintech-card overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-border/50 flex items-start gap-3">
        {Icon && (
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon size={18} className="text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  title,
  description,
  action,
  onClick,
  destructive,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 w-full text-left rounded-xl border border-border/50 p-4 transition-colors",
        onClick && "hover:bg-muted/30 hover:border-border active:scale-[0.99]",
        destructive && "border-destructive/20 hover:bg-destructive/5"
      )}
    >
      {Icon && (
        <div
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
            destructive ? "bg-destructive/10" : "bg-muted/60"
          )}
        >
          <Icon
            size={18}
            className={destructive ? "text-destructive" : "text-muted-foreground"}
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-medium text-sm",
            destructive ? "text-destructive" : "text-foreground"
          )}
        >
          {title}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action ?? (onClick && <ChevronRight size={16} className="text-muted-foreground shrink-0" />)}
    </Wrapper>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 rounded-full transition-colors duration-200 shrink-0",
        checked ? "bg-primary" : "bg-muted",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}

const SETTINGS_TABS = ["account", "appearance", "notifications", "security", "backup"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

function isSettingsTab(value: string | null): value is SettingsTab {
  return SETTINGS_TABS.includes(value as SettingsTab);
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { backupAllOutings } = useData();
  const { theme, setTheme } = useTheme();
  const [currency, setCurrency] = useState<CurrencyCode>(() => getCurrencyCode());

  const handleCurrencyChange = (code: CurrencyCode) => {
    setCurrencyCode(code);
    setCurrency(code);
    // formatCurrency() is a synchronous read used by dozens of components, so a
    // reload is the reliable way to repaint every amount in the app at once.
    toast.success("Currency updated", { description: "Reloading to apply…" });
    setTimeout(() => window.location.reload(), 600);
  };
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = isSettingsTab(searchParams.get("tab")) ? searchParams.get("tab")! : "account";

  const [name, setName] = useState(user?.displayName || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPrefs>(() => {
    const stored = loadNotificationPrefs();
    return { ...stored, push: resolvePushPref(stored.push) };
  });
  const [pushPermission, setPushPermission] = useState<NotificationPermissionState>(
    getNotificationPermission
  );
  const [requestingPush, setRequestingPush] = useState(false);

  useEffect(() => {
    setName(user?.displayName || "");
  }, [user?.displayName]);

  useEffect(() => {
    saveNotificationPrefs(notifications);
  }, [notifications]);

  useEffect(() => {
    const syncPermission = () => setPushPermission(getNotificationPermission());
    syncPermission();
    document.addEventListener("visibilitychange", syncPermission);
    return () => document.removeEventListener("visibilitychange", syncPermission);
  }, []);

  const handlePushToggle = async (enabled: boolean) => {
    if (!enabled) {
      setNotifications((n) => ({ ...n, push: false }));
      return;
    }

    if (!isPushSupported()) {
      toast.error("Push notifications are not supported in this browser.");
      return;
    }

    if (pushPermission === "denied") {
      toast.error("Notifications are blocked. Enable them in your browser site settings.");
      return;
    }

    setRequestingPush(true);
    try {
      const permission = await requestNotificationPermission();
      setPushPermission(permission);

      if (permission === "granted") {
        setNotifications((n) => ({ ...n, push: true }));
        showLocalNotification(
          "TripSplit",
          "Push notifications are on. You'll be alerted for new expenses."
        );
        toast.success("Push notifications enabled");
      } else if (permission === "denied") {
        setNotifications((n) => ({ ...n, push: false }));
        toast.error("Permission denied. Enable notifications in browser settings.");
      } else {
        setNotifications((n) => ({ ...n, push: false }));
        toast.message("Notification permission was not granted.");
      }
    } finally {
      setRequestingPush(false);
    }
  };

  const displayName = name || user?.displayName || "User";
  const userEmail = user?.email || "";
  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile(user, { displayName: name.trim() });
      if (isFirebaseConfigured) {
        await updateUserProfile(user.uid, { name: name.trim() });
      }
      toast.success("Profile updated successfully!");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await backupAllOutings();
    } catch (err) {
      console.error("Logout backup failed:", err);
    }
    await signOut();
    navigate("/login");
  };

  const handleForgotPassword = async () => {
    if (!user?.email) {
      toast.error("No email found on your account.");
      return;
    }
    if (!isFirebaseConfigured) {
      toast.error("Firebase is not configured.");
      return;
    }

    setResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success(`Password reset link sent to ${user.email}`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to send reset email.");
    } finally {
      setResettingPassword(false);
    }
  };

  const themeOptions = [
    {
      value: "light" as const,
      label: "Light",
      desc: "Clean and bright",
      icon: Sun,
      preview: "bg-[#F8FAFC]",
    },
    {
      value: "dark" as const,
      label: "Dark",
      desc: "True black OLED",
      icon: Moon,
      preview: "bg-[#0A0A0A]",
    },
    {
      value: "system" as const,
      label: "System",
      desc: "Match device",
      icon: Monitor,
      preview: "bg-gradient-to-br from-[#F8FAFC] to-[#0A0A0A]",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto pb-20 md:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, appearance, and preferences.
        </p>
      </motion.div>

      {/* Profile banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="fintech-card p-5 sm:p-6"
      >
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-primary/20 shrink-0">
            <AvatarImage src={user?.photoURL || ""} alt={displayName} />
            <AvatarFallback className="text-xl sm:text-2xl bg-primary/10 text-primary font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-lg sm:text-xl font-semibold text-foreground truncate">
              {displayName}
            </p>
            <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
            {memberSince && (
              <p className="text-xs text-muted-foreground mt-1">Member since {memberSince}</p>
            )}
          </div>
        </div>
      </motion.div>

      <PremiumTabs
        value={activeTab}
        onValueChange={(tab) => setSearchParams({ tab })}
      >
        <PremiumTabsList className="grid grid-cols-5 sm:flex">
          <PremiumTabsTrigger value="account" className="gap-1.5 sm:gap-2 flex-col sm:flex-row justify-center sm:justify-start">
            <User size={16} />
            <span className="text-[10px] sm:text-sm">Account</span>
          </PremiumTabsTrigger>
          <PremiumTabsTrigger value="appearance" className="gap-1.5 sm:gap-2 flex-col sm:flex-row justify-center sm:justify-start">
            <Moon size={16} />
            <span className="text-[10px] sm:text-sm">Theme</span>
          </PremiumTabsTrigger>
          <PremiumTabsTrigger value="notifications" className="gap-1.5 sm:gap-2 flex-col sm:flex-row justify-center sm:justify-start">
            <Bell size={16} />
            <span className="text-[10px] sm:text-sm">Alerts</span>
          </PremiumTabsTrigger>
          <PremiumTabsTrigger value="security" className="gap-1.5 sm:gap-2 flex-col sm:flex-row justify-center sm:justify-start">
            <Shield size={16} />
            <span className="text-[10px] sm:text-sm">Security</span>
          </PremiumTabsTrigger>
          <PremiumTabsTrigger value="backup" className="gap-1.5 sm:gap-2 flex-col sm:flex-row justify-center sm:justify-start">
            <HardDrive size={16} />
            <span className="text-[10px] sm:text-sm">Data</span>
          </PremiumTabsTrigger>
        </PremiumTabsList>

        {/* Account */}
        <PremiumTabsContent value="account">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="space-y-5"
          >
            <SettingsSection
              title="Personal Information"
              description="Update how your name appears across TripSplit."
              icon={User}
            >
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <FloatingInput
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
                <div className="space-y-1.5">
                  <FloatingInput
                    label="Email Address"
                    type="email"
                    value={userEmail}
                    readOnly
                    disabled
                    className="opacity-70 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground px-1">
                    Email is managed through your login account and cannot be changed here.
                  </p>
                </div>
                <Button type="submit" className="w-full sm:w-auto" disabled={savingProfile}>
                  {savingProfile ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </form>
            </SettingsSection>
          </motion.div>
        </PremiumTabsContent>

        {/* Appearance */}
        <PremiumTabsContent value="appearance">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <SettingsSection
              title="Theme"
              description="Choose how TripSplit looks on your device."
              icon={Moon}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {themeOptions.map((opt) => {
                  const selected = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        "relative flex flex-col rounded-xl border-2 p-4 text-left transition-all duration-200",
                        selected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/60 hover:border-border hover:bg-muted/20"
                      )}
                    >
                      {selected && (
                        <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Check size={12} className="text-primary-foreground" />
                        </span>
                      )}
                      <div
                        className={cn(
                          "w-full h-20 rounded-lg border border-border/60 mb-4",
                          opt.preview
                        )}
                      />
                      <div className="flex items-center gap-2 mb-1">
                        <opt.icon
                          size={16}
                          className={selected ? "text-primary" : "text-muted-foreground"}
                        />
                        <span className="font-medium text-sm text-foreground">{opt.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </SettingsSection>

            <SettingsSection
              title="Currency"
              description="Used everywhere amounts are shown. Stored on this device."
              icon={Wallet}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {CURRENCIES.map((c) => {
                  const selected = currency === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleCurrencyChange(c.code)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all duration-200",
                        selected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/60 hover:border-border"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
                          selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {c.symbol}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {c.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">{c.code}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                This changes the symbol only — existing amounts are not converted.
              </p>
            </SettingsSection>
          </motion.div>
        </PremiumTabsContent>

        {/* Notifications */}
        <PremiumTabsContent value="notifications">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <SettingsSection
              title="Alerts"
              description="Control how you stay updated on outings and expenses."
              icon={Bell}
            >
              <div className="space-y-3">
                <SettingsRow
                  icon={Smartphone}
                  title="Push Notifications"
                  description={
                    isPushSupported()
                      ? `Get alerts when someone adds an expense. ${getPermissionStatusLabel(pushPermission)}`
                      : "Push notifications are not supported in this browser."
                  }
                  action={
                    requestingPush ? (
                      <Loader2 size={18} className="animate-spin text-muted-foreground shrink-0" />
                    ) : (
                      <ToggleSwitch
                        checked={notifications.push && pushPermission === "granted"}
                        onChange={handlePushToggle}
                        label="Push notifications"
                        disabled={!isPushSupported() || pushPermission === "denied"}
                      />
                    )
                  }
                />
                {pushPermission === "denied" && (
                  <p className="text-xs text-destructive px-1">
                    Notifications are blocked. Open your browser settings for this site and allow
                    notifications, then try again.
                  </p>
                )}
              </div>
            </SettingsSection>
          </motion.div>
        </PremiumTabsContent>

        {/* Data & backup */}
        <PremiumTabsContent value="backup">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <SettingsSection
              title="Your Data & Deletions"
              description="Understand what happens when you or a friend removes an outing."
              icon={HardDrive}
            >
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <Map size={18} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Outings you created</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Only the person who created an outing can permanently delete it. Deleting
                        removes the outing, all transactions, and balances for everyone in that
                        trip.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <Users size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Outings shared with you</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        If a friend added you to their outing, you can only leave it. Leaving
                        removes it from your list only — their expenses and transactions stay safe.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <Trash2 size={18} className="text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Delete confirmations</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        TripSplit always asks you to confirm before deleting outings, transactions,
                        or friends. Review the message carefully — creator deletes affect everyone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </SettingsSection>

            <SettingsSection
              title="Automatic Cloud Backup"
              description="Each outing is backed up to Firebase when you create, edit, or change expenses."
              icon={HardDrive}
            >
              <p className="text-sm text-muted-foreground leading-relaxed">
                TripSplit silently saves per-outing backups under your account after every
                important change. Use Restore below if you need to recover an outing.
              </p>
            </SettingsSection>

            <SettingsSection
              title="Restore from Backup"
              description="Recover outings saved in your cloud backups."
              icon={Cloud}
            >
              <BackupRestorePanel />
            </SettingsSection>
          </motion.div>
        </PremiumTabsContent>

        {/* Security */}
        <PremiumTabsContent value="security">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <SettingsSection
              title="Account Security"
              description="Manage your password and active session."
              icon={Shield}
            >
              <div className="space-y-3">
                <SettingsRow
                  icon={KeyRound}
                  title="Reset Password"
                  description={`Send a reset link to ${userEmail || "your email"}.`}
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={handleForgotPassword}
                      disabled={resettingPassword || !userEmail}
                    >
                      {resettingPassword ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        "Send Link"
                      )}
                    </Button>
                  }
                />
                <SettingsRow
                  icon={LogOut}
                  title="Sign Out"
                  description="Log out from this device and return to login."
                  destructive
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setLogoutOpen(true)}
                    >
                      <LogOut size={14} className="mr-1.5" />
                      Sign out
                    </Button>
                  }
                />
              </div>
            </SettingsSection>
          </motion.div>
        </PremiumTabsContent>
      </PremiumTabs>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Log out?"
        description="Are you sure you want to log out of TripSplit on this device?"
        confirmLabel="Log out"
        onConfirm={handleSignOut}
        variant="destructive"
      />
    </div>
  );
}