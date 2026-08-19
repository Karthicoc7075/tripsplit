import { getCurrencySymbol } from "@/lib/format";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Info, Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { OUTING_CATEGORIES, OUTING_CATEGORY_LABELS, type CreateOutingInput } from "@/types";
import { cn } from "@/lib/utils";
import type { Friend } from "@/types";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { BottomSheet } from "@/components/BottomSheet";

interface CreateOutingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friends: Friend[];
  onSubmit: (input: CreateOutingInput) => void;
}

export function CreateOutingModal({
  open,
  onOpenChange,
  friends,
  onSubmit,
}: CreateOutingModalProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("Trip");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setCategory("Trip");
    setCustomCategory("");
    setShowCustomCategory(false);
    setLocation("");
    setBudget("");
    setStartDate("");
    setEndDate("");
    setSelectedFriendIds([]);
    setFriendSearch("");
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.name.toLowerCase().includes(friendSearch.toLowerCase()) ||
      f.email.toLowerCase().includes(friendSearch.toLowerCase())
  );

  const toggleFriend = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalCategory = showCustomCategory && customCategory.trim()
      ? customCategory.trim()
      : category;

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));

    onSubmit({
      name: name.trim(),
      category: finalCategory,
      location: location.trim() || undefined,
      budget: budget ? Number(budget) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      friendIds: selectedFriendIds,
    });

    setSubmitting(false);
    reset();
    onOpenChange(false);
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-5 pt-1">
      <div className="space-y-2">
        <Label htmlFor="outing-name">
          Outing Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="outing-name"
          placeholder='e.g., "Kerala Trip 2026"'
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>
          Category <span className="text-destructive">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {OUTING_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCategory(cat);
                setShowCustomCategory(false);
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                !showCustomCategory && category === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {OUTING_CATEGORY_LABELS[cat]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCustomCategory(true)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-all flex items-center gap-1",
              showCustomCategory
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <Plus className="h-3 w-3" /> Custom
          </button>
        </div>
        {showCustomCategory && (
          <Input
            placeholder="Enter custom category"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            className="mt-2"
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          placeholder="City, venue, or address (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget">Budget ({getCurrencySymbol()})</Label>
        <Input
          id="budget"
          type="number"
            inputMode="decimal"
          min="0"
          placeholder="Optional budget cap"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date">End Date</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p>
          You can create the outing now for planning (train tickets, hotels) even if the actual dates are next month.
        </p>
      </div>

      <div className="space-y-3">
        <Label>Add Friends</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            className="pl-9"
            value={friendSearch}
            onChange={(e) => setFriendSearch(e.target.value)}
          />
        </div>
        <div className="max-h-36 overflow-y-auto rounded-lg border border-border/60 divide-y divide-border/40">
          {filteredFriends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {friends.length === 0 ? "Add friends first from the Friends page." : "No friends match your search."}
            </p>
          ) : (
            filteredFriends.map((friend) => {
              const selected = selectedFriendIds.includes(friend.id);
              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => toggleFriend(friend.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    selected ? "bg-primary/5" : "hover:bg-muted/40"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback seed={friend.id} className="text-xs bg-primary/10 text-primary">{friend.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{friend.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
                  </div>
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      selected ? "bg-primary border-primary" : "border-border"
                    )}
                  >
                    {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
        <Button
          type="submit"
          className="w-full h-11 shadow-md shadow-primary/20"
          disabled={!name.trim() || submitting || (showCustomCategory && !customCategory.trim())}
        >
          {submitting ? "Creating..." : "Create Outing"}
        </Button>
      </motion.div>
    </form>
  );

  return isMobile ? (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="Create Outing"
      description="Plan a trip or event and start tracking shared expenses."
    >
      {formContent}
    </BottomSheet>
  ) : (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Outing</DialogTitle>
          <DialogDescription>
            Plan a trip or event and start tracking shared expenses.
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}