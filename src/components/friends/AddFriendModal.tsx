import { useEffect, useState } from "react";
import { Search, UserPlus, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FloatingInput } from "@/components/fintech/FloatingInput";
import { BottomSheet } from "@/components/BottomSheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { searchDiscoverableUsers, getDiscoverableUsers, type DiscoverableUser } from "@/lib/friends";
import type { Friend } from "@/types";
import { toast } from "sonner";

interface AddFriendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFriend: (id: string, email: string, name: string, phone?: string) => Promise<boolean>;
  currentUserId: string;
  friends: Friend[];
}

export function AddFriendModal({
  open,
  onOpenChange,
  onAddFriend,
  currentUserId,
  friends,
}: AddFriendModalProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [email, setEmail] = useState("");
  const [foundUsers, setFoundUsers] = useState<DiscoverableUser[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const reset = () => {
    setEmail("");
    setFoundUsers([]);
    setSearched(false);
    setSearching(false);
    setAddingId(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  // Debounced search / load suggestions on open or input change
  useEffect(() => {
    if (!open) return;

    const trimmed = email.trim();
    
    const fetchUsers = async () => {
      setSearching(true);
      try {
        let users: DiscoverableUser[] = [];
        if (trimmed) {
          users = await searchDiscoverableUsers(trimmed);
        } else {
          // If empty email input, fetch up to 10 existing users as suggestions
          users = await getDiscoverableUsers(10);
        }
        // Exclude the current user from query results and filter out duplicates by ID or email
        const uniqueUsers: DiscoverableUser[] = [];
        const seen = new Set<string>();
        for (const u of users) {
          if (u.id === currentUserId) continue;
          if (seen.has(u.id) || (u.email && seen.has(u.email.toLowerCase()))) continue;
          seen.add(u.id);
          if (u.email) seen.add(u.email.toLowerCase());
          uniqueUsers.push(u);
        }
        setFoundUsers(uniqueUsers);
        setSearched(true);
      } catch {
        toast.error("Failed to load users. Please try again.");
      } finally {
        setSearching(false);
      }
    };

    if (!trimmed) {
      void fetchUsers();
      return;
    }

    const timer = setTimeout(() => {
      void fetchUsers();
    }, 300);

    return () => clearTimeout(timer);
  }, [email, currentUserId, open]);

  const handleAdd = async (user: DiscoverableUser) => {
    if (addingId) return;

    setAddingId(user.id);
    try {
      const added = await onAddFriend(
        user.id,
        user.email,
        user.name,
        user.phone
      );
      if (!added) {
        toast.error("This friend is already in your list.");
        return;
      }
      toast.success(`${user.name} added! You can both see each other now.`);
    } catch {
      toast.error("Failed to add friend. Please try again.");
    } finally {
      setAddingId(null);
    }
  };

  const content = (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="relative">
          <FloatingInput
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {searched && foundUsers.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            {email.trim() ? `Search Results (${foundUsers.length})` : "Suggestions"}
          </p>
          <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1">
            {foundUsers.map((user) => {
              const isAlreadyFriend = friends.some((f) => f.id === user.id);
              return (
                <div
                  key={user.id}
                  className="fintech-card p-3 flex items-center justify-between gap-3 border border-border/40 hover:border-border/80 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 border border-border/60">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  {isAlreadyFriend ? (
                    <span className="text-[11px] font-bold text-muted-foreground px-2 py-1 rounded bg-muted/60 shrink-0">
                      Already Friend
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-1 px-3 shrink-0 h-8 text-xs font-bold"
                      onClick={() => void handleAdd(user)}
                      disabled={addingId === user.id}
                    >
                      {addingId === user.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <UserPlus size={12} />
                      )}
                      Add
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {searched && foundUsers.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center bg-card/40 rounded-xl border border-border/40 border-dashed">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground">No users found</p>
            <p className="text-xs text-muted-foreground">
              Try typing a different email address.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={handleOpenChange}
        title="Add a Friend"
        description="Search by email or choose from suggestions."
      >
        <div className="pb-8">{content}</div>
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Friend</DialogTitle>
          <DialogDescription>
            Search user profiles by typing their email.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}