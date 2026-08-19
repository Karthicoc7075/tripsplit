import { getCurrencySymbol } from "@/lib/format";
import { useEffect, useMemo, useState } from "react";
import { Search, X, UserPlus, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { BottomSheet } from "@/components/BottomSheet";
import { OUTING_CATEGORIES, type Friend, type Outing, type OutingMember, type Transaction } from "@/types";
import {
  buildMembersList,
  getAddedMemberIds,
  getOutingMembers,
  getRemovedMemberIds,
  getTransactionsNeedingReview,
  membersChanged,
} from "@/lib/members";
import { cn } from "@/lib/utils";

export interface EditOutingSaveData {
  name: string;
  category: string;
  location?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  members: OutingMember[];
  membersChanged: boolean;
  /** Empty string clears the note — `undefined` would leave the old one in place. */
  note: string;
  /** Empty array clears the tags, for the same reason. */
  tags: string[];
  archived: boolean;
}

interface EditOutingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outing: Outing;
  friends: Friend[];
  transactions: Transaction[];
  currentUserId: string;
  currentUserName: string;
  onSave: (data: EditOutingSaveData) => void;
}

export function EditOutingModal({
  open,
  onOpenChange,
  outing,
  friends,
  transactions,
  currentUserId,
  currentUserName,
  onSave,
}: EditOutingModalProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [name, setName] = useState(outing.name);
  const [category, setCategory] = useState(outing.category);
  const [location, setLocation] = useState(outing.location ?? "");
  const [budget, setBudget] = useState(outing.budget ? String(outing.budget) : "");
  const [startDate, setStartDate] = useState(outing.startDate ?? "");
  const [endDate, setEndDate] = useState(outing.endDate ?? "");
  const [note, setNote] = useState(outing.note ?? "");
  const [tagsInput, setTagsInput] = useState((outing.tags ?? []).join(", "));
  const [archived, setArchived] = useState(!!outing.archived);
  const outingMembers = getOutingMembers(outing);
  const [memberIds, setMemberIds] = useState<string[]>(outingMembers.map((m) => m.id));
  const [friendSearch, setFriendSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<EditOutingSaveData | null>(null);

  useEffect(() => {
    if (open) {
      setName(outing.name);
      setCategory(outing.category);
      setLocation(outing.location ?? "");
      setBudget(outing.budget ? String(outing.budget) : "");
      setNote(outing.note ?? "");
      setTagsInput((outing.tags ?? []).join(", "));
      setArchived(!!outing.archived);
      setStartDate(outing.startDate ?? "");
      setEndDate(outing.endDate ?? "");
      setMemberIds(getOutingMembers(outing).map((m) => m.id));
      setFriendSearch("");
    }
  }, [open, outing]);

  const currentMembers = useMemo(
    () => buildMembersList(memberIds, outingMembers, friends, currentUserId, currentUserName),
    [memberIds, outingMembers, friends, currentUserId, currentUserName]
  );

  const availableFriends = friends.filter((f) => !memberIds.includes(f.id));
  const filteredFriends = availableFriends.filter(
    (f) =>
      f.name.toLowerCase().includes(friendSearch.toLowerCase()) ||
      f.email.toLowerCase().includes(friendSearch.toLowerCase())
  );

  const removedIds = getRemovedMemberIds(outingMembers, memberIds);
  const addedIds = getAddedMemberIds(outingMembers, memberIds);
  const hasMemberChanges = membersChanged(outingMembers, memberIds);
  const txsNeedingReview = getTransactionsNeedingReview(transactions, removedIds);

  const removeMember = (memberId: string) => {
    setMemberIds((prev) => prev.filter((id) => id !== memberId));
  };

  const addMember = (friendId: string) => {
    if (!memberIds.includes(friendId)) {
      setMemberIds((prev) => [...prev, friendId]);
    }
  };

  // "goa, beach , 2026" -> ["goa","beach","2026"], de-duped, blanks dropped.
  const parsedTags = useMemo(
    () =>
      Array.from(
        new Set(
          tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        )
      ),
    [tagsInput]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data: EditOutingSaveData = {
      name: name.trim(),
      category,
      location: location.trim() || undefined,
      budget: budget ? Number(budget) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      members: currentMembers,
      membersChanged: hasMemberChanges,
      note: note.trim(),
      tags: parsedTags,
      archived,
    };

    if (transactions.length > 0 && hasMemberChanges) {
      setPendingSave(data);
      setConfirmOpen(true);
    } else {
      onSave(data);
      onOpenChange(false);
    }
  };

  const handleConfirmMemberChange = () => {
    if (pendingSave) {
      onSave(pendingSave);
      setPendingSave(null);
    }
    setConfirmOpen(false);
    onOpenChange(false);
  };

  const confirmDescription =
    txsNeedingReview.length > 0
      ? `Removing members will affect the following ${txsNeedingReview.length} transaction(s): ${txsNeedingReview
          .map((t) => `"${t.title}"`)
          .join(", ")}. These splits will be updated to exclude the removed members and will be marked as "Needs Review" so you can adjust them later.`
      : "Updating the member list will recalculate balances for this outing.";

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <div className="flex flex-wrap gap-2">
          {OUTING_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border",
                category === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/60"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Budget ({getCurrencySymbol()})</Label>
        <Input type="number"
            inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Memory note</Label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={280}
          placeholder="Best sunset of the year 🌅"
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Shows on this outing&apos;s card in Reports. {280 - note.length} characters left.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <Input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="family, annual, beach"
        />
        {parsedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {parsedTags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Comma separated. Searchable and filterable in Reports.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 p-3">
        <input
          type="checkbox"
          checked={archived}
          onChange={(e) => setArchived(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground">Archive this outing</span>
          <span className="block text-xs text-muted-foreground">
            Hidden from the Reports timeline. Nothing is deleted — balances and
            expenses stay exactly as they are.
          </span>
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {/* Members */}
      <div className="space-y-3 pt-2 border-t border-border/50">
        <Label className="text-sm font-semibold">Members</Label>

        <div className="space-y-2">
          {currentMembers.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback seed={m.id} className="text-xs">{m.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {m.name}
                  {m.id === currentUserId && (
                    <span className="text-xs text-muted-foreground ml-1">(You)</span>
                  )}
                </span>
              </div>
              {m.id !== currentUserId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMember(m.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {transactions.length > 0 && hasMemberChanges && (
          <div className="flex gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Transactions already exist. Adding or removing members will recalculate splits and may require editing some transactions.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <UserPlus className="h-3.5 w-3.5" /> Add friend to outing
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search friends to add..."
              className="pl-9"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
            />
          </div>
          <div className="max-h-32 overflow-y-auto rounded-lg border border-border/60 divide-y divide-border/40">
            {filteredFriends.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {availableFriends.length === 0
                  ? "All friends are already in this outing."
                  : "No friends match your search."}
              </p>
            ) : (
              filteredFriends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => addMember(friend.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback seed={friend.id} className="text-[10px] bg-primary/10 text-primary">{friend.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{friend.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
                  </div>
                  <UserPlus className="h-4 w-4 text-primary shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t mt-4">
        <Button type="button" variant="outline" className="flex-1 sm:flex-initial" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1 sm:flex-initial" disabled={!name.trim()}>
          Save Changes
        </Button>
      </div>
    </form>
  );

  return (
    <>
      {isMobile ? (
        <BottomSheet
          open={open}
          onOpenChange={onOpenChange}
          title="Edit Outing"
          description="Update details and manage members in this outing."
        >
          {formContent}
        </BottomSheet>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Outing</DialogTitle>
              <DialogDescription>Update details and manage members in this outing.</DialogDescription>
            </DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          setConfirmOpen(o);
          if (!o) setPendingSave(null);
        }}
        title="Transactions already exist"
        description={confirmDescription}
        confirmLabel="Update members & recalculate"
        variant="default"
        onConfirm={handleConfirmMemberChange}
      />
    </>
  );
}