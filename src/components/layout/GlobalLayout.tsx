import { useMemo, useState, useCallback } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { getDashboardContext } from "@/lib/dashboardContext";
import { useIncomingFriendAlerts } from "@/hooks/useIncomingFriendAlerts";
import { useIncomingOutingAlerts } from "@/hooks/useIncomingOutingAlerts";
import { Home, Users, Map, Settings, Search, LogOut, Plus, PieChart, Wallet, User, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlobalSearch, useGlobalSearchShortcut } from "@/components/GlobalSearch";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { SyncStatus } from "@/components/SyncStatus";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { OnboardingTour } from "@/components/OnboardingTour";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import logoImg from "@/assets/logo.png";

export default function GlobalLayout() {
  const { user, signOut } = useAuth();
  const { friends, outings, transactions, currentUserId } = useData();

  // A live or upcoming trip makes logging an expense the most likely reason for
  // tapping (+), so it leads the menu. Planning counts too: advance bookings —
  // tickets, hotel deposits — are spent before the trip starts.
  const quickAddContext = useMemo(
    () => getDashboardContext(outings, transactions),
    [outings, transactions]
  );
  const quickAddOuting =
    quickAddContext.mode === "home" ? null : quickAddContext.outing;
  const quickAddLabel = "Add Transaction to";
  const navigate = useNavigate();
  const location = useLocation();

  useIncomingFriendAlerts(friends, currentUserId);
  useIncomingOutingAlerts(outings, currentUserId);
  const [searchOpen, setSearchOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  useGlobalSearchShortcut(openSearch);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: Home },
    { name: "Outings", path: "/outings", icon: Map },
    { name: "Friends", path: "/friends", icon: Users },
    { name: "Reports", path: "/reports", icon: PieChart },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16 md:pb-0">
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between max-w-7xl">
          <div className="flex min-w-0 items-center gap-4 lg:gap-8">
            <NavLink
              to="/dashboard"
              className="flex shrink-0 items-center gap-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* Header is h-16; the mark stays well inside it so it never
                  touches the top border or the bottom divider.

                  `w-auto`, not a square box: the artwork is taller than it is
                  wide, so a w-9 box would letterbox it and reintroduce the
                  dead space this file was cropped to remove. */}
              <img
                src={logoImg}
                alt=""
                aria-hidden
                className="h-8 w-auto shrink-0 sm:h-9"
              />
              <span className="hidden whitespace-nowrap text-lg font-bold min-[380px]:inline">
                <span style={{ color: "#276ACF" }}>Trip</span><span style={{ color: "#3AA91F" }}>Split</span>
              </span>
              {/* The wordmark disappears under 380px, so the beta tag rides
                  along with it rather than floating beside a bare icon.
                  -translate-y sits it against the wordmark's cap height
                  instead of its optical centre, like a superscript. */}
              <span className="hidden -translate-y-1 rounded-md border border-primary/40 bg-primary/10 px-1 py-px text-[9px] font-bold uppercase leading-[1.4] tracking-[0.12em] text-primary min-[380px]:inline-block">
                Beta
              </span>
            </NavLink>

            <nav className="hidden min-w-0 items-center gap-0.5 md:flex lg:gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `shrink-0 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition-colors lg:px-3 ${isActive
                      ? "text-primary bg-primary/8"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-3">
            <button
              onClick={openSearch}
              className="hidden h-9 w-40 items-center gap-2 rounded-lg border border-border/60 bg-card px-3 text-sm text-muted-foreground transition-all hover:border-border hover:text-foreground md:flex lg:w-56"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left truncate">Search...</span>
              <kbd className="hidden lg:inline text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border/60">⌘K</kbd>
            </button>

            <SyncStatus className="shrink-0" />

            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={openSearch}>
              <Search className="h-4 w-4" />
            </Button>

            <NotificationDropdown />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-8 w-8 border border-border/60">
                    <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium">{user?.displayName || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings?tab=account")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setLogoutOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-3 sm:px-6 py-5 sm:py-8 max-w-7xl min-w-0">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="min-w-0"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Floating action button — bottom-right, above the tab bar, inside thumb
          reach. Mobile only; desktop has Quick Actions on the dashboard. */}
      <button
        type="button"
        onClick={() => setFabOpen(true)}
        aria-label="Quick actions"
        className="md:hidden fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Plus className="h-6 w-6" />
      </button>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="flex items-stretch h-16 px-1">
          {navItems.map((item) => {
            // The bar uses each page's own name, so the label matches the
            // heading you land on. Only Dashboard is shortened — "Home" reads
            // better in a 10px tab than "Dashboard", which truncates.
            const shortLabel = item.name === "Dashboard" ? "Home" : item.name;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 min-w-0 gap-0.5 py-2 ${isActive ? "text-primary" : "text-muted-foreground"
                  }`
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="text-[10px] font-medium truncate max-w-full px-0.5">
                  {shortLabel}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Log out?"
        description="Are you sure you want to log out of TripSplit on this device?"
        confirmLabel="Log out"
        onConfirm={handleSignOut}
        variant="destructive"
      />

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <OnboardingTour />
      <PWAInstallPrompt />

      <Dialog open={fabOpen} onOpenChange={setFabOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Quick Actions</DialogTitle>
            <DialogDescription>What would you like to do?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 pt-2">
            {quickAddOuting && (
              <Button
                className="justify-start gap-2 h-11"
                onClick={() => { setFabOpen(false); navigate(`/outings/${quickAddOuting.id}?add=1`); }}
              >
                <Receipt className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">
                  {quickAddLabel} {quickAddOuting.name}
                </span>
              </Button>
            )}
            <Button
              variant={quickAddOuting ? "outline" : "default"}
              className="justify-start gap-2 h-11"
              onClick={() => { setFabOpen(false); navigate("/outings"); }}
            >
              <Map className="h-4 w-4" /> Create Outing
            </Button>
            <Button variant="outline" className="justify-start gap-2 h-11" onClick={() => { setFabOpen(false); navigate("/friends"); }}>
              <Users className="h-4 w-4" /> Add Friend
            </Button>
            <Button variant="outline" className="justify-start gap-2 h-11" onClick={() => { setFabOpen(false); navigate("/settle"); }}>
              <Wallet className="h-4 w-4" /> Settle Up
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}