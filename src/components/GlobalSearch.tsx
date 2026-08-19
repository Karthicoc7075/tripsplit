import { formatCurrency } from "@/lib/format";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Map, Users, Receipt } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useData } from "@/context/DataContext";
import type { SearchResult } from "@/types";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function matchesQuery(text: string | undefined, q: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(q);
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { outings, friends, transactions } = useData();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { outings: [], friends: [], transactions: [] };

    const outingResults: SearchResult[] = outings
      .filter(
        (o) =>
          matchesQuery(o.name, q) ||
          matchesQuery(o.category, q) ||
          matchesQuery(o.location, q) ||
          matchesQuery(o.status, q)
      )
      .map((o) => ({
        id: o.id,
        type: "outing" as const,
        title: o.name,
        subtitle: [o.category, o.location].filter(Boolean).join(" · "),
        path: `/outings/${o.id}`,
      }));

    const friendResults: SearchResult[] = friends
      .filter(
        (f) =>
          f.name !== "Unknown User" &&
          (matchesQuery(f.name, q) ||
            matchesQuery(f.email, q) ||
            matchesQuery(f.phone, q))
      )
      .map((f) => ({
        id: f.id,
        type: "friend" as const,
        title: f.name,
        subtitle: f.email,
        path: `/friends/details/${f.id}`,
      }));

    const txResults: SearchResult[] = transactions
      .filter((t) => {
        const outing = outings.find((o) => o.id === t.outingId);
        if (!outing) return false;
        return (
          matchesQuery(t.title, q) ||
          matchesQuery(t.description, q) ||
          matchesQuery(t.category, q) ||
          matchesQuery(t.paidByName, q)
        );
      })
      .map((t) => {
        const outing = outings.find((o) => o.id === t.outingId)!;
        return {
          id: t.id,
          type: "transaction" as const,
          title: t.title,
          subtitle: `${outing.name} · ${formatCurrency(t.amount)}`,
          path: `/outings/${t.outingId}?tx=${t.id}`,
        };
      });

    return { outings: outingResults, friends: friendResults, transactions: txResults };
  }, [query, outings, friends, transactions]);

  const hasResults =
    results.outings.length > 0 ||
    results.friends.length > 0 ||
    results.transactions.length > 0;

  const handleSelect = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput
        placeholder="Search outings, friends, transactions..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!query && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Type to search across outings, friends, and transactions
          </div>
        )}

        {query && !hasResults && <CommandEmpty>No results found.</CommandEmpty>}

        {results.outings.length > 0 && (
          <CommandGroup heading="Outings">
            {results.outings.map((r) => (
              <CommandItem
                key={r.id}
                value={`outing-${r.id}-${r.title}`}
                onSelect={() => handleSelect(r.path)}
              >
                <Map className="text-primary" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{r.title}</span>
                  {r.subtitle && (
                    <span className="text-xs text-muted-foreground truncate">{r.subtitle}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.friends.length > 0 && (
          <>
            {results.outings.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Friends">
              {results.friends.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`friend-${r.id}-${r.title}`}
                  onSelect={() => handleSelect(r.path)}
                >
                  <Users className="text-primary" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{r.title}</span>
                    {r.subtitle && (
                      <span className="text-xs text-muted-foreground truncate">{r.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.transactions.length > 0 && (
          <>
            {(results.outings.length > 0 || results.friends.length > 0) && <CommandSeparator />}
            <CommandGroup heading="Transactions">
              {results.transactions.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`tx-${r.id}-${r.title}`}
                  onSelect={() => handleSelect(r.path)}
                >
                  <Receipt className="text-primary" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{r.title}</span>
                    {r.subtitle && (
                      <span className="text-xs text-muted-foreground truncate">{r.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function useGlobalSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpen();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onOpen]);
}