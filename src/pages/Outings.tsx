import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { OutingCard } from "@/components/OutingCard";
import { EmptyState } from "@/components/EmptyState";
import { OutingCardSkeleton } from "@/components/skeletons";
import { FilterChips } from "@/components/fintech/FilterChips";
import { CreateOutingModal } from "@/components/outings/CreateOutingModal";
import { filterOutings, sortOutings, type OutingFilter } from "@/lib/outing";

export default function Outings() {
  const navigate = useNavigate();
  const {
    outings,
    friends,
    loading,
    transactions,
    createOuting,
    getOutingTotalSpent,
    getOutingYourShare,
    currentUserId,
    currentUserName,
  } = useData();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OutingFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const txCountByOuting = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => map.set(t.outingId, (map.get(t.outingId) ?? 0) + 1));
    return map;
  }, [transactions]);

  const filteredOutings = useMemo(() => {
    const filtered = filterOutings(outings, statusFilter, searchQuery);
    return sortOutings(filtered, "newest", getOutingTotalSpent);
  }, [outings, statusFilter, searchQuery, getOutingTotalSpent]);

  const handleCreateOuting = (input: Parameters<typeof createOuting>[0]) => {
    const outing = createOuting(input);
    toast.success("Outing created successfully!");
    navigate(`/outings/${outing.id}`);
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Outings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track trips, events, and shared expenses with friends.
          </p>
        </div>
        <Button
          className="gap-2 h-11 px-5 shadow-md shadow-primary/20 w-full sm:w-auto shrink-0"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus size={18} /> Create Outing
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search outings..."
          className="pl-10 bg-card h-11"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <FilterChips
        options={[
          { value: "all" as const, label: "All" },
          { value: "ongoing" as const, label: "Active" },
          { value: "settled" as const, label: "Completed" },
          { value: "planned" as const, label: "Planned" },
        ]}
        value={statusFilter}
        onChange={setStatusFilter}
      />

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <OutingCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredOutings.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={MapIcon}
                  title={searchQuery ? "No outings found" : "No outings yet"}
                  description={
                    searchQuery
                      ? "Try adjusting your search or filters."
                      : "Create your first outing to start splitting expenses."
                  }
                  actionLabel="Create your first outing"
                  onAction={() => setIsCreateOpen(true)}
                />
              </div>
            ) : (
              filteredOutings.map((outing, i) => (
                <OutingCard
                  key={outing.id}
                  outing={outing}
                  totalSpent={getOutingTotalSpent(outing.id)}
                  yourShare={getOutingYourShare(outing.id)}
                  transactionCount={txCountByOuting.get(outing.id) ?? 0}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  index={i}
                />
              ))
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <CreateOutingModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        friends={friends}
        onSubmit={handleCreateOuting}
      />
    </div>
  );
}