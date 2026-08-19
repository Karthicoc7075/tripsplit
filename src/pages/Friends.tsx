import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useData } from "@/context/DataContext";
import { EmptyState } from "@/components/EmptyState";
import { FriendCardSkeleton } from "@/components/skeletons";
import { FriendsSummaryBar } from "@/components/friends/FriendsSummaryBar";
import { FriendCard } from "@/components/friends/FriendCard";
import { AddFriendModal } from "@/components/friends/AddFriendModal";
import { getFriendsOverallSummary, sortFriends } from "@/lib/friends";
import { DataErrorState } from "@/components/DataErrorState";

export default function Friends() {
  const navigate = useNavigate();
  const {
    friends,
    friendBalances,
    outings,
    loading,
    currentUserId,
    currentUserName,
    addFriend,
    error,
    retry,
  } = useData();

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const summary = useMemo(
    () => getFriendsOverallSummary(friends, friendBalances),
    [friends, friendBalances]
  );

  const filteredFriends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matched = q
      ? friends.filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            f.email.toLowerCase().includes(q)
        )
      : friends;
    return sortFriends(matched, friendBalances, "balance");
  }, [friends, searchQuery, friendBalances]);

  const handleAddFriend = (id: string, email: string, name: string, phone?: string) =>
    addFriend(id, email, name, phone);

  if (error) {
    return (
      <div className="space-y-6 pb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Friends
        </h1>
        <DataErrorState message={error} onRetry={retry} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-6 min-w-0">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
        Friends
      </h1>

      {/* Top bar: Search + Add Friend */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search friends..."
            className="pl-10 bg-card h-11"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          className="gap-2 h-11 px-5 shadow-md shadow-primary/20 shrink-0"
          onClick={() => setIsAddOpen(true)}
        >
          <UserPlus size={18} />
          Add Friend
        </Button>
      </div>

      <AddFriendModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAddFriend={handleAddFriend}
        currentUserId={currentUserId}
        friends={friends}
      />

      {!loading && friends.length > 0 && (
        <FriendsSummaryBar summary={summary} userName={currentUserName} />
      )}

      {/* Friend list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <FriendCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredFriends.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={friends.length === 0 ? "No friends yet" : "No friends found"}
          description={
            friends.length === 0
              ? "Add friends by email to split expenses together."
              : "Try a different search term."
          }
          actionLabel={friends.length === 0 ? "Add your first friend" : undefined}
          onAction={friends.length === 0 ? () => setIsAddOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredFriends.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                balance={friendBalances.get(friend.id) ?? 0}
                outings={outings}
                currentUserId={currentUserId}
                onClick={() => navigate(`/friends/details/${friend.id}`)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}