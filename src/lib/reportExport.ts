import type { Outing, SettlementRecord, Transaction } from "@/types";
import { getOutingMembers } from "@/lib/members";
import { getTransactionInstant } from "@/lib/dashboard";
import { formatClockTime, toDisplayDate, toLocalTimeInput } from "@/lib/format";

/**
 * One line of the ledger, flattened for export.
 *
 * Every field here maps to something the app actually stores. The brief also
 * asked for Merchant, Account and Purpose columns; TripSplit has no such
 * fields, and inventing them would put empty columns in front of the user, so
 * the tables carry Paid By and Notes — which do exist — in their place.
 */
export interface ExportRow {
  id: string;
  /** "expense" comes off a Transaction; the other two off a SettlementRecord. */
  kind: "expense" | "settlement" | "reimbursement";
  typeLabel: string;
  /** Sort key: the expense day plus its clock time. */
  instant: Date;
  date: string;
  time: string;
  title: string;
  amount: number;
  category: string;
  paidBy: string;
  splitWith: string;
  notes: string;
  outingId: string;
  outingName: string;
  outingStatus: string;
  recordedBy: string;
  recordedAt: string;
}

export interface OutingSection {
  outing: Outing;
  createdDate: string;
  members: string;
  statusLabel: string;
  rows: ExportRow[];
  total: number;
}

export interface ExportModel {
  sections: OutingSection[];
  /** Transactions whose outing is gone — listed under "Normal Transactions". */
  unlinked: ExportRow[];
  /** Spend total of the unlinked rows, on the same footing as a section total. */
  unlinkedTotal: number;
  rowCount: number;
}

export interface ExportMeta {
  userName: string;
  /** ISO string, or null when the account's join date is unknown. */
  joinedAt: string | null;
  generatedAt: Date;
  outingCount: number;
  /**
   * Every filter the report was pulled under, spelled out — a slice of the
   * history has to say so on its face, or it reads as the whole thing.
   */
  filtersLabel: string;
  currencyCode: string;
}

const EMPTY = "—";

const STATUS_LABELS: Record<Outing["status"], string> = {
  planned: "Planned",
  ongoing: "Active",
  settled: "Completed",
};

/** "Karthi (You)" for the person running the report, plain names for everyone else. */
function personLabel(name: string, id: string, currentUserId: string): string {
  const clean = name?.trim() || "Unknown";
  return id === currentUserId ? `${clean} (You)` : clean;
}

function timeLabel(tx: Transaction): string {
  if (tx.time) return formatClockTime(tx.time);
  // No stored time: the entry clock only says something when the expense was
  // logged on the day it happened.
  const instant = getTransactionInstant(tx);
  const created = new Date(tx.createdAt);
  if (Number.isNaN(created.getTime())) return "";
  const sameDay =
    instant.getFullYear() === created.getFullYear() &&
    instant.getMonth() === created.getMonth() &&
    instant.getDate() === created.getDate();
  return sameDay ? formatClockTime(toLocalTimeInput(created)) : "";
}

function transactionRow(
  tx: Transaction,
  outing: Outing | undefined,
  currentUserId: string
): ExportRow {
  const memberNames = new Map(
    (outing ? getOutingMembers(outing) : []).map((m) => [m.id, m.name])
  );

  // `paidByName` is a joined string once several people chipped in, so the
  // per-person names come off `payments` when it is there.
  const paidBy = tx.payments?.length
    ? tx.payments.map((p) => personLabel(p.paidByName, p.memberId, currentUserId)).join(", ")
    : personLabel(tx.paidByName, tx.paidById, currentUserId);

  // Names only: the brief rules out share/split maths in the report.
  const splitWith = tx.splits
    .filter((s) => s.amount !== 0)
    .map((s) => personLabel(memberNames.get(s.memberId) ?? "Unknown", s.memberId, currentUserId))
    .join(", ");

  return {
    id: tx.id,
    kind: "expense",
    typeLabel: "Expense",
    instant: getTransactionInstant(tx),
    date: tx.date || toDisplayDate(tx.createdAt),
    time: timeLabel(tx),
    title: tx.title,
    amount: tx.amount,
    category: tx.category ?? EMPTY,
    paidBy,
    splitWith: splitWith || EMPTY,
    notes: tx.description ?? "",
    outingId: tx.outingId,
    outingName: outing?.name ?? EMPTY,
    outingStatus: outing ? STATUS_LABELS[outing.status] ?? outing.status : EMPTY,
    recordedBy: tx.createdByName,
    recordedAt: tx.createdAt,
  };
}

/**
 * A recorded payment between two members.
 *
 * `settle` and `return` stay labelled as settlement and reimbursement rather
 * than being folded into expenses — money moving between members is not a new
 * cost, and showing it as one would double-count the trip.
 */
function settlementRow(
  record: SettlementRecord,
  outing: Outing | undefined,
  currentUserId: string
): ExportRow {
  const created = new Date(record.createdAt);
  const from = personLabel(record.fromName, record.fromId, currentUserId);
  const to = personLabel(record.toName, record.toId, currentUserId);

  return {
    id: record.id,
    kind: record.type === "return" ? "reimbursement" : "settlement",
    typeLabel: record.type === "return" ? "Reimbursement" : "Settlement",
    instant: created,
    date: toDisplayDate(record.createdAt),
    time: Number.isNaN(created.getTime()) ? "" : formatClockTime(toLocalTimeInput(created)),
    title: `${from} paid ${to}`,
    amount: record.amount,
    category: EMPTY,
    paidBy: from,
    splitWith: to,
    notes: "",
    outingId: record.outingId,
    outingName: outing?.name ?? EMPTY,
    outingStatus: outing ? STATUS_LABELS[outing.status] ?? outing.status : EMPTY,
    recordedBy: record.recordedByName,
    recordedAt: record.createdAt,
  };
}

/**
 * What an outing cost.
 *
 * Settlements move money that was already counted as an expense, so they are
 * left out — adding them would report the trip as costing more than it did.
 */
function expenseTotal(rows: ExportRow[]): number {
  return rows.filter((r) => r.kind === "expense").reduce((sum, r) => sum + r.amount, 0);
}

/** Oldest first — a report reads forwards, unlike the app's newest-first lists. */
function byInstantAsc(a: ExportRow, b: ExportRow): number {
  return a.instant.getTime() - b.instant.getTime();
}

function outingStartDate(outing: Outing): number {
  const start = outing.startDate ? new Date(outing.startDate) : null;
  if (start && !Number.isNaN(start.getTime())) return start.getTime();
  const created = new Date(outing.createdAt);
  return Number.isNaN(created.getTime()) ? 0 : created.getTime();
}

/**
 * Groups the ledger the way the report reads: outings in the order they
 * happened, each with its own transactions and settlements in time order, then
 * whatever is left over.
 */
export function buildExportModel(params: {
  outings: Outing[];
  transactions: Transaction[];
  settlements: SettlementRecord[];
  currentUserId: string;
  /**
   * Drops outings that ended up with nothing in them. Set when the export is
   * filtered: an outing the filters emptied should not appear as a heading
   * with "no transactions" under it, which reads as data loss.
   */
  dropEmptyOutings?: boolean;
}): ExportModel {
  const { outings, transactions, settlements, currentUserId } = params;
  const byId = new Map(outings.map((o) => [o.id, o]));

  const sections: OutingSection[] = [...outings]
    .sort((a, b) => outingStartDate(a) - outingStartDate(b))
    .map((outing) => {
      const rows = [
        ...transactions
          .filter((t) => t.outingId === outing.id)
          .map((t) => transactionRow(t, outing, currentUserId)),
        ...settlements
          .filter((s) => s.outingId === outing.id)
          .map((s) => settlementRow(s, outing, currentUserId)),
      ].sort(byInstantAsc);

      return {
        outing,
        createdDate: toDisplayDate(outing.startDate ?? outing.createdAt),
        members: getOutingMembers(outing)
          .map((m) => personLabel(m.name, m.id, currentUserId))
          .join(", "),
        statusLabel: STATUS_LABELS[outing.status] ?? outing.status,
        rows,
        total: expenseTotal(rows),
      };
    })
    .filter((section) => !params.dropEmptyOutings || section.rows.length > 0);

  const unlinked = [
    ...transactions.filter((t) => !byId.has(t.outingId)).map((t) => transactionRow(t, undefined, currentUserId)),
    ...settlements.filter((s) => !byId.has(s.outingId)).map((s) => settlementRow(s, undefined, currentUserId)),
  ].sort(byInstantAsc);

  return {
    sections,
    unlinked,
    unlinkedTotal: expenseTotal(unlinked),
    rowCount: sections.reduce((sum, s) => sum + s.rows.length, 0) + unlinked.length,
  };
}

/**
 * Escapes one CSV field.
 *
 * The leading apostrophe on `=`, `+`, `-` and `@` stops Excel and Sheets from
 * reading a name like "-Metro" as a formula — a spreadsheet opening an export
 * should not execute anything.
 */
function csvCell(value: string | number): string {
  if (typeof value === "number") return String(value);
  const text = value ?? "";
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

const CSV_COLUMNS = [
  "Date",
  "Time",
  "Transaction ID",
  "Transaction",
  "Type",
  "Amount",
  "Currency",
  "Category",
  "Outing",
  "Outing Status",
  "Paid By",
  "Split With",
  "Recorded By",
  "Recorded At",
  "Notes",
] as const;

/**
 * The closing line of an outing's block.
 *
 * Written as a real row with its own "Outing Total" type rather than a bare
 * figure, so a spreadsheet can filter the totals out (or keep only them)
 * instead of a stray number breaking a sum over the Amount column.
 */
function csvTotalRow(
  label: string,
  total: number,
  entryCount: number,
  currencyCode: string
): string {
  return [
    csvCell(""),
    csvCell(""),
    csvCell(""),
    csvCell(`${label} — Total Spent`),
    csvCell("Outing Total"),
    csvCell(total),
    csvCell(currencyCode),
    csvCell(""),
    csvCell(label),
    csvCell(""),
    csvCell(""),
    csvCell(""),
    csvCell(""),
    csvCell(""),
    csvCell(`${entryCount} entries`),
  ].join(",");
}

function csvRow(row: ExportRow, currencyCode: string): string {
  return [
    csvCell(row.date),
    csvCell(row.time),
    csvCell(row.id),
    csvCell(row.title),
    csvCell(row.typeLabel),
    csvCell(row.amount),
    csvCell(currencyCode),
    csvCell(row.category),
    csvCell(row.outingName),
    csvCell(row.outingStatus),
    csvCell(row.paidBy),
    csvCell(row.splitWith),
    csvCell(row.recordedBy),
    csvCell(row.recordedAt),
    csvCell(row.notes),
  ].join(",");
}

/**
 * One row per transaction, outings in report order.
 *
 * The metadata lines up top mirror the PDF cover so a spreadsheet on its own
 * still says whose report it is, when it was pulled and under which filters;
 * the table starts after a blank line, which every spreadsheet app imports
 * cleanly.
 */
export function buildTransactionsCsv(model: ExportModel, meta: ExportMeta): string {
  const lines = [
    `${csvCell("User Name")},${csvCell(meta.userName)}`,
    `${csvCell("Joined TripSplit")},${csvCell(meta.joinedAt ? toDisplayDate(meta.joinedAt) : EMPTY)}`,
    `${csvCell("Report Downloaded")},${csvCell(formatStamp(meta.generatedAt))}`,
    `${csvCell("Total Outings")},${meta.outingCount}`,
    `${csvCell("Filters Applied")},${csvCell(meta.filtersLabel)}`,
    "",
    CSV_COLUMNS.map(csvCell).join(","),
  ];

  for (const section of model.sections) {
    for (const row of section.rows) lines.push(csvRow(row, meta.currencyCode));
    lines.push(
      csvTotalRow(section.outing.name, section.total, section.rows.length, meta.currencyCode)
    );
  }

  if (model.unlinked.length > 0) {
    for (const row of model.unlinked) lines.push(csvRow(row, meta.currencyCode));
    lines.push(
      csvTotalRow(
        "Normal Transactions",
        model.unlinkedTotal,
        model.unlinked.length,
        meta.currencyCode
      )
    );
  }

  // Excel on Windows needs the BOM to read UTF-8 names correctly.
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** "24 Aug 2026, 6:05 PM" — the stamp used on the cover, footers and CSV. */
export function formatStamp(date: Date): string {
  if (Number.isNaN(date.getTime())) return EMPTY;
  return `${toDisplayDate(date.toISOString())}, ${formatClockTime(toLocalTimeInput(date))}`;
}

/** Plain grouped number: the PDF puts the currency in the column header. */
export function formatAmount(amount: number): string {
  return amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
