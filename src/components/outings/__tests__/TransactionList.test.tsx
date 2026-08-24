import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TransactionList } from "../TransactionList";
import type { Transaction } from "@/types";

vi.mock("@/context/DataContext", () => ({
  useData: () => ({ pendingIds: new Set<string>() }),
}));

const ME = "me";
const OTHER = "friend";

const tx = (
  id: string,
  title: string,
  amount: number,
  paidBy: { id: string; name: string } = { id: ME, name: "Karthi" }
): Transaction => ({
  id,
  outingId: "o1",
  title,
  amount,
  paidById: paidBy.id,
  paidByName: paidBy.name,
  splitMode: "equally",
  splits: [
    { memberId: ME, amount: amount / 2 },
    { memberId: OTHER, amount: amount / 2 },
  ],
  date: "24 Aug 2026",
  time: "10:00",
  category: "Travel",
  createdAt: "2026-08-24T04:30:00.000Z",
  createdById: ME,
  createdByName: "Karthi",
});

/** The search field only appears past the threshold, so pad the trip out. */
const padding = Array.from({ length: 8 }, (_, i) => tx(`pad${i}`, `Dinner ${i}`, 500));

function renderList(transactions: Transaction[]) {
  return render(
    <TransactionList transactions={transactions} currentUserId={ME} onSelect={() => {}} />
  );
}

function search(term: string) {
  fireEvent.change(screen.getByPlaceholderText(/Search expenses/i), { target: { value: term } });
}

describe("TransactionList search summary", () => {
  it("totals the matching expenses", () => {
    renderList([
      tx("m1", "Metro to palace", 100),
      tx("m2", "Metro back", 120, { id: OTHER, name: "Sanjay Kumar" }),
      ...padding,
    ]);

    search("metro");

    expect(screen.getByText(/2 expenses matching/i)).toBeInTheDocument();
    expect(screen.getByText("₹220")).toBeInTheDocument();
    expect(screen.getByText(/Your share ₹110/)).toBeInTheDocument();
  });

  it("breaks the total down by who paid, biggest payer first", () => {
    renderList([
      tx("m1", "Metro to palace", 100),
      tx("m2", "Metro back", 120, { id: OTHER, name: "Sanjay Kumar" }),
      ...padding,
    ]);

    search("metro");

    const payers = screen.getAllByText(/paid/i).map((el) => el.textContent);
    expect(payers).toEqual(["Sanjaypaid₹120", "Youpaid₹100"]);
  });

  it("adds up a payer across several matching expenses", () => {
    renderList([
      tx("m1", "Metro to palace", 100),
      tx("m2", "Metro back", 120),
      tx("m3", "Metro pass", 40, { id: OTHER, name: "Sanjay Kumar" }),
      ...padding,
    ]);

    search("metro");

    const payers = screen.getAllByText(/paid/i).map((el) => el.textContent);
    expect(payers).toEqual(["Youpaid₹220", "Sanjaypaid₹40"]);
  });

  it("uses the per-person amounts when several people chipped in", () => {
    const shared = tx("m1", "Metro tickets", 200);
    shared.payments = [
      { memberId: ME, paidByName: "Karthi", amount: 80 },
      { memberId: OTHER, paidByName: "Sanjay Kumar", amount: 120 },
    ];
    shared.paidByName = "Karthi, Sanjay Kumar";

    renderList([shared, ...padding]);

    search("metro");

    const payers = screen.getAllByText(/paid/i).map((el) => el.textContent);
    expect(payers).toEqual(["Sanjaypaid₹120", "Youpaid₹80"]);
  });

  it("counts every match, not just the rows currently paged in", () => {
    // Ten of the thirty were paid by someone else, so the total is distinct
    // from either payer's subtotal and the assertion cannot match a chip.
    const many = Array.from({ length: 30 }, (_, i) =>
      tx(`m${i}`, `Metro ride ${i}`, 10, i < 10 ? { id: OTHER, name: "Sanjay Kumar" } : undefined)
    );
    renderList(many);

    search("metro");

    expect(screen.getByText(/30 expenses matching/i)).toBeInTheDocument();
    expect(screen.getByText("₹300")).toBeInTheDocument();
  });

  it("says nothing when the search has no matches", () => {
    renderList([tx("m1", "Metro to palace", 100), ...padding]);

    search("flight");

    expect(screen.queryByText(/expenses matching/i)).not.toBeInTheDocument();
    expect(screen.getByText(/No expenses match/i)).toBeInTheDocument();
  });

  it("shows no summary until something is typed", () => {
    renderList([tx("m1", "Metro to palace", 100), ...padding]);

    expect(screen.queryByText(/expenses matching/i)).not.toBeInTheDocument();
  });
});
