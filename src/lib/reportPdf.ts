import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatAmount,
  formatStamp,
  type ExportMeta,
  type ExportModel,
  type ExportRow,
  type OutingSection,
} from "@/lib/reportExport";

/**
 * The report's whole palette. Colour is used to mark structure — the brand
 * rule, section headings, table header band — and nowhere else, so a printed
 * copy in greyscale reads exactly the same as the screen one.
 */
const INK = {
  brand: [15, 118, 110] as [number, number, number], // primary teal
  text: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  line: [203, 213, 225] as [number, number, number],
  headFill: [241, 245, 249] as [number, number, number],
};

const PAGE = {
  margin: 42,
  headerBottom: 58,
  footerTop: 40,
};

const FONT = "helvetica";

/**
 * jsPDF's built-in fonts are WinAnsi-encoded, so "₹" and other non-Latin
 * currency glyphs would come out as noise. The amount columns are plain
 * numbers and the currency is named in the column header instead.
 */
function amountHeader(currencyCode: string): string {
  return `Amount (${currencyCode})`;
}

const TABLE_HEAD = (currencyCode: string) => [
  "Date & Time",
  "Transaction",
  "Type",
  amountHeader(currencyCode),
  "Category",
  "Paid By",
  "Notes",
];

function tableBody(rows: ExportRow[]): string[][] {
  return rows.map((row) => [
    row.time ? `${row.date}\n${row.time}` : row.date,
    row.title,
    row.typeLabel,
    formatAmount(row.amount),
    row.category,
    row.paidBy,
    row.notes || "—",
  ]);
}

function drawRunningHeader(doc: jsPDF, meta: ExportMeta) {
  const width = doc.internal.pageSize.getWidth();

  doc.setFont(FONT, "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK.brand);
  doc.text("TripSplit", PAGE.margin, 32);

  doc.setFont(FONT, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...INK.muted);
  doc.text(`User: ${meta.userName}`, PAGE.margin + 58, 32);
  doc.text(`Downloaded: ${formatStamp(meta.generatedAt)}`, width - PAGE.margin, 32, {
    align: "right",
  });

  doc.setDrawColor(...INK.line);
  doc.setLineWidth(0.5);
  doc.line(PAGE.margin, 40, width - PAGE.margin, 40);
}

/**
 * Footers are stamped in a second pass: "Page 3 of 12" cannot be written while
 * page 3 is being drawn, because the total is only known once the last table
 * has been laid out.
 */
function stampFooters(doc: jsPDF, meta: ExportMeta) {
  const total = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...INK.line);
    doc.setLineWidth(0.5);
    doc.line(PAGE.margin, height - 34, width - PAGE.margin, height - 34);

    doc.setFont(FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...INK.muted);
    doc.text(`TripSplit · ${meta.userName}`, PAGE.margin, height - 22);
    doc.text(`Page ${page} of ${total}`, width - PAGE.margin, height - 22, { align: "right" });
  }
}

function drawCover(doc: jsPDF, meta: ExportMeta) {
  const width = doc.internal.pageSize.getWidth();
  let y = 150;

  doc.setFont(FONT, "bold");
  doc.setFontSize(34);
  doc.setTextColor(...INK.brand);
  doc.text("TripSplit", PAGE.margin, y);

  y += 26;
  doc.setFont(FONT, "normal");
  doc.setFontSize(16);
  doc.setTextColor(...INK.text);
  doc.text("Trip & Split Report", PAGE.margin, y);

  y += 22;
  doc.setDrawColor(...INK.brand);
  doc.setLineWidth(1.5);
  doc.line(PAGE.margin, y, PAGE.margin + 90, y);

  y += 52;
  const facts: [string, string][] = [
    ["User Name", meta.userName],
    ["Total Outings", String(meta.outingCount)],
    ["Joined TripSplit", meta.joinedAt ? formatStamp(new Date(meta.joinedAt)) : "—"],
    ["Report Downloaded", formatStamp(meta.generatedAt)],
    ["Filters Applied", meta.filtersLabel],
  ];

  for (const [label, value] of facts) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK.muted);
    doc.text(label.toUpperCase(), PAGE.margin, y);

    doc.setFont(FONT, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...INK.text);
    // The filter line can run long; wrap it rather than letting it walk off
    // the right edge of the page.
    const lines = doc.splitTextToSize(value, width - PAGE.margin * 2);
    doc.text(lines, PAGE.margin, y + 15);

    y += 26 + Math.max(1, lines.length) * 14;
  }

  doc.setFont(FONT, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...INK.muted);
  doc.text(
    `All amounts in ${meta.currencyCode}. Figures are shown exactly as recorded.`,
    PAGE.margin,
    doc.internal.pageSize.getHeight() - 60
  );

  // The cover carries no running header — it is the title page.
  doc.setDrawColor(...INK.line);
  doc.setLineWidth(0.5);
  doc.line(PAGE.margin, doc.internal.pageSize.getHeight() - 76, width - PAGE.margin, doc.internal.pageSize.getHeight() - 76);
}

/** Keeps a heading with its table: a title alone at the foot of a page is noise. */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const limit = doc.internal.pageSize.getHeight() - PAGE.footerTop;
  if (y + needed <= limit) return y;
  doc.addPage();
  return PAGE.headerBottom;
}

function drawSectionHeading(doc: jsPDF, y: number, title: string): number {
  doc.setFont(FONT, "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK.brand);
  doc.text(title, PAGE.margin, y);
  return y + 8;
}

function drawDetailLines(doc: jsPDF, y: number, lines: [string, string][]): number {
  let cursor = y + 10;
  doc.setFontSize(9);
  for (const [label, value] of lines) {
    doc.setFont(FONT, "bold");
    doc.setTextColor(...INK.muted);
    doc.text(`${label}:`, PAGE.margin, cursor);

    doc.setFont(FONT, "normal");
    doc.setTextColor(...INK.text);
    const wrapped = doc.splitTextToSize(
      value,
      doc.internal.pageSize.getWidth() - PAGE.margin * 2 - 78
    );
    doc.text(wrapped, PAGE.margin + 78, cursor);
    cursor += Math.max(1, wrapped.length) * 12;
  }
  return cursor;
}

/**
 * Closes an outing's table with what it cost.
 *
 * Drawn as the table's foot so it lands under the last row of that outing —
 * and only there, never repeated at the bottom of every page the table spans.
 */
function totalFootRow(total: number, entryCount: number) {
  return [
    [
      {
        content: "Total Spent",
        colSpan: 3,
        styles: { halign: "right" as const, fontStyle: "bold" as const },
      },
      { content: formatAmount(total), styles: { halign: "right" as const, fontStyle: "bold" as const } },
      { content: `${entryCount} ${entryCount === 1 ? "entry" : "entries"}`, colSpan: 3 },
    ],
  ];
}

function drawRowsTable(
  doc: jsPDF,
  startY: number,
  rows: ExportRow[],
  meta: ExportMeta,
  total: number
): number {
  autoTable(doc, {
    startY,
    head: [TABLE_HEAD(meta.currencyCode)],
    body: tableBody(rows),
    foot: totalFootRow(total, rows.length),
    showFoot: "lastPage",
    theme: "grid",
    // Repeats the header whenever a long outing spills onto the next page.
    showHead: "everyPage",
    margin: { top: PAGE.headerBottom, bottom: PAGE.footerTop, left: PAGE.margin, right: PAGE.margin },
    styles: {
      font: FONT,
      fontSize: 8,
      cellPadding: 5,
      lineColor: INK.line,
      lineWidth: 0.4,
      textColor: INK.text,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: INK.headFill,
      textColor: INK.text,
      fontStyle: "bold",
      lineColor: INK.line,
      lineWidth: 0.4,
    },
    footStyles: {
      fillColor: INK.headFill,
      textColor: INK.text,
      fontStyle: "bold",
      lineColor: INK.line,
      lineWidth: 0.4,
    },
    columnStyles: {
      0: { cellWidth: 62 },
      // Wide enough for "Reimbursement" on one line — the longest type label.
      2: { cellWidth: 68 },
      3: { cellWidth: 62, halign: "right" },
      4: { cellWidth: 54 },
      5: { cellWidth: 74 },
    },
    didDrawPage: () => drawRunningHeader(doc, meta),
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
  return (finalY ?? startY) + 18;
}

function drawEmptyNote(doc: jsPDF, y: number, note: string): number {
  doc.setFont(FONT, "italic");
  doc.setFontSize(9);
  doc.setTextColor(...INK.muted);
  doc.text(note, PAGE.margin, y + 4);
  return y + 24;
}

function drawOutingSection(
  doc: jsPDF,
  y: number,
  index: number,
  section: OutingSection,
  meta: ExportMeta
): number {
  let cursor = ensureSpace(doc, y, 120);
  cursor = drawSectionHeading(doc, cursor, `${index}. ${section.outing.name}`);
  cursor = drawDetailLines(doc, cursor, [
    ["Outing Name", section.outing.name],
    ["Created Date", section.createdDate],
    ["Members", section.members || "—"],
    ["Status", section.statusLabel],
    ["Transactions", String(section.rows.length)],
    ["Total Spent", `${formatAmount(section.total)} ${meta.currencyCode}`],
  ]);

  if (section.rows.length === 0) {
    return drawEmptyNote(doc, cursor, "No transactions recorded for this outing.");
  }
  return drawRowsTable(doc, cursor + 6, section.rows, meta, section.total);
}

/**
 * Builds the whole report: cover, one section per outing in the order they
 * happened, then anything not attached to an outing.
 */
export function buildReportPdf(model: ExportModel, meta: ExportMeta): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setProperties({
    title: `TripSplit Trip & Split Report — ${meta.userName}`,
    subject: "Trip & Split Report",
    creator: "TripSplit",
  });

  drawCover(doc, meta);

  doc.addPage();
  drawRunningHeader(doc, meta);
  let cursor = PAGE.headerBottom + 18;

  if (model.sections.length === 0) {
    cursor = drawEmptyNote(doc, cursor, "No outings match the current report filters.");
  }

  model.sections.forEach((section, i) => {
    cursor = drawOutingSection(doc, cursor, i + 1, section, meta);
  });

  if (model.unlinked.length > 0) {
    cursor = ensureSpace(doc, cursor, 120);
    cursor = drawSectionHeading(doc, cursor, "Normal Transactions");
    cursor = drawDetailLines(doc, cursor, [
      ["Description", "Transactions not linked to any outing"],
      ["Transactions", String(model.unlinked.length)],
    ]);
    cursor = drawRowsTable(doc, cursor + 6, model.unlinked, meta, model.unlinkedTotal);
  }

  stampFooters(doc, meta);
  return doc;
}

export function downloadReportPdf(model: ExportModel, meta: ExportMeta, filename: string) {
  buildReportPdf(model, meta).save(filename);
}
