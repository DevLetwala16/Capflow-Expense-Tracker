"use client";

export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  HardDrive,
  Upload,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { db } from "@/lib/db";
import { useAuthStore } from "@/lib/store/authStore";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useCategoryStore } from "@/lib/store/categoryStore";
import { useBudgetStore } from "@/lib/store/budgetStore";
import { useEMIStore } from "@/lib/store/emiStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── CSV serializer (no PapaParse) ───────────────────────────────────────────

function escapeCsvCell(val: unknown): string {
  const str = val == null ? "" : String(val);
  // Wrap in quotes if contains comma, newline or quote
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines: string[] = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  return lines.join("\r\n");
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

function buildExcelXml(headers: string[], rows: (string | number)[][]): string {
  const xmlHeaders = headers
    .map(
      (h) =>
        `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`
    )
    .join("");

  const xmlRows = rows
    .map((row) => {
      const cells = row
        .map((cell) => {
          const isNum = typeof cell === "number";
          const type = isNum ? "Number" : "String";
          const val = escapeXml(String(cell));
          return `<Cell><Data ss:Type="${type}">${val}</Data></Cell>`;
        })
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("\r\n");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#10B981" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Transactions">
  <Table>
   <Row>${xmlHeaders}</Row>
   ${xmlRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

// ─── Toast (lightweight inline) ──────────────────────────────────────────────

type ToastState = { message: string; type: "success" | "error" } | null;

// ─── Action card ─────────────────────────────────────────────────────────────

function ActionCard({
  icon,
  iconBg,
  title,
  description,
  onClick,
  loading,
  noBorder = false,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  onClick: () => void;
  loading: boolean;
  noBorder?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-[var(--bg-card-hover)] transition-colors text-left disabled:opacity-60 ${
        noBorder ? "" : "border-t border-[var(--border-color)]"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {loading ? (
          <Loader2 size={18} className="animate-spin text-current" />
        ) : (
          icon
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          {loading ? "Processing…" : description}
        </p>
      </div>
    </button>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  label,
  children,
  delay,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  delay: number;
  danger?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="space-y-1.5"
    >
      <p className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </p>
      <div
        className={`rounded-2xl border overflow-hidden ${
          danger
            ? "border-[#EF4444]/40 bg-[#EF4444]/5"
            : "bg-[var(--bg-card)] border-[var(--border-color)]"
        }`}
      >
        {children}
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExportPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [loadingState, setLoadingState] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<ToastState>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearInput, setClearInput] = useState("");
  const [clearing, setClearing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const setLoading = (key: string, val: boolean) =>
    setLoadingState((prev) => ({ ...prev, [key]: val }));

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── JSON Export ──────────────────────────────────────────────────────────

  const exportJSON = async () => {
    const userId = user?.id ?? "guest";
    setLoading("json", true);
    try {
      const [transactions, categories, budgets, goals, emis] = await Promise.all([
        db.transactions.where("userId").equals(userId).toArray(),
        db.categories.where("userId").equals(userId).toArray(),
        db.budgets.where("userId").equals(userId).toArray(),
        db.goals.where("userId").equals(userId).toArray(),
        db.emis.where("userId").equals(userId).toArray(),
      ]);
      const data = {
        userId,
        userEmail: user?.email,
        transactions,
        categories,
        budgets,
        goals,
        emis,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      triggerDownload(blob, `capflow-export-${todayStr()}.json`);
      showToast("JSON exported successfully", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to export JSON", "error");
    } finally {
      setLoading("json", false);
    }
  };

  // ── CSV Export ───────────────────────────────────────────────────────────

  const exportCSV = async () => {
    const userId = user?.id ?? "guest";
    setLoading("csv", true);
    try {
      const transactions = await db.transactions.where("userId").equals(userId).toArray();
      const headers = ["Date", "Type", "Category", "Amount", "Currency", "PaymentMethod", "Notes"];
      const rows = transactions.map((tx) => [
        tx.date,
        tx.type,
        tx.categoryId,
        tx.amount,
        tx.currency,
        tx.paymentMethod,
        tx.notes ?? "",
      ]);
      const csv = buildCsv(headers, rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      triggerDownload(blob, `capflow-transactions-${todayStr()}.csv`);
      showToast("CSV exported successfully", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to export CSV", "error");
    } finally {
      setLoading("csv", false);
    }
  };

  // ── Excel (.xlsx) Export ───────────────────────────────────────────────────

  const exportExcel = async () => {
    const userId = user?.id ?? "guest";
    setLoading("excel", true);
    try {
      const transactions = await db.transactions.where("userId").equals(userId).toArray();
      const headers = ["Date", "Type", "Category", "Amount", "Currency", "PaymentMethod", "Notes"];
      const rows = transactions.map((tx) => [
        tx.date,
        tx.type,
        tx.categoryId,
        tx.amount,
        tx.currency,
        tx.paymentMethod,
        tx.notes ?? "",
      ]);
      const xml = buildExcelXml(headers, rows);
      const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
      triggerDownload(blob, `capflow-transactions-${todayStr()}.xlsx`);
      showToast("Excel (.xlsx) exported successfully", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to export Excel", "error");
    } finally {
      setLoading("excel", false);
    }
  };

  // ── PDF Export ───────────────────────────────────────────────────────────

  const exportPDF = async () => {
    const userId = user?.id ?? "guest";
    setLoading("pdf", true);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");

      const transactions = await db.transactions.where("userId").equals(userId).toArray();
      const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const PAGE_W = 595;
      const PAGE_H = 842;
      const MARGIN = 50;
      const LINE_H = 18;
      const COL_DATE = MARGIN;
      const COL_CAT = MARGIN + 80;
      const COL_TYPE = MARGIN + 220;
      const COL_AMOUNT = PAGE_W - MARGIN - 80;

      let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      let y = PAGE_H - MARGIN;

      const newPage = () => {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      };

      const checkY = (needed = LINE_H + 4) => {
        if (y - needed < MARGIN) newPage();
      };

      // ── Header ────────────────────────────────────────────────────────────
      page.drawText("CapFlow – Transaction Statement", {
        x: MARGIN,
        y,
        size: 16,
        font: boldFont,
        color: rgb(0.388, 0.4, 0.945),
      });
      y -= 24;

      const dateRange =
        sorted.length > 0
          ? `${sorted[sorted.length - 1].date} → ${sorted[0].date}`
          : "No transactions";
      page.drawText(`Period: ${dateRange}`, { x: MARGIN, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
      y -= 10;
      page.drawText(`Generated: ${new Date().toLocaleString()}`, {
        x: MARGIN,
        y,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= 20;

      // Divider
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
      y -= 14;

      // ── Column headers ────────────────────────────────────────────────────
      const colColor = rgb(0.3, 0.3, 0.3);
      page.drawText("Date", { x: COL_DATE, y, size: 8, font: boldFont, color: colColor });
      page.drawText("Category", { x: COL_CAT, y, size: 8, font: boldFont, color: colColor });
      page.drawText("Type", { x: COL_TYPE, y, size: 8, font: boldFont, color: colColor });
      page.drawText("Amount", { x: COL_AMOUNT, y, size: 8, font: boldFont, color: colColor });
      y -= 6;
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.4, color: rgb(0.85, 0.85, 0.85) });
      y -= 10;

      // ── Rows ──────────────────────────────────────────────────────────────
      for (const tx of sorted) {
        checkY();
        const isExp = tx.type === "expense";
        const amtColor = isExp ? rgb(0.94, 0.27, 0.27) : rgb(0.06, 0.72, 0.51);
        const amtStr = `${isExp ? "-" : "+"}${tx.currency} ${tx.amount.toLocaleString()}`;
        page.drawText(tx.date, { x: COL_DATE, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(String(tx.categoryId), { x: COL_CAT, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(tx.type, { x: COL_TYPE, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
        page.drawText(amtStr, { x: COL_AMOUNT, y, size: 8, font: boldFont, color: amtColor });
        if (tx.notes) {
          y -= LINE_H - 4;
          checkY();
          page.drawText(`  ${tx.notes}`, { x: COL_DATE + 8, y, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
        }
        y -= LINE_H;
      }

      const pdfBytes = await pdfDoc.save();
      // pdf-lib returns Uint8Array<ArrayBufferLike>; Blob requires ArrayBuffer-backed view
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      triggerDownload(blob, `capflow-statement-${todayStr()}.pdf`);
      showToast("PDF exported successfully", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to generate PDF", "error");
    } finally {
      setLoading("pdf", false);
    }
  };

  // ── Backup Download ──────────────────────────────────────────────────────

  const downloadBackup = async () => {
    if (!user?.id) {
      showToast("Sign in to access backup", "error");
      return;
    }
    const userId = user.id;
    setLoading("backup", true);
    try {
      const [transactions, categories, budgets, goals, emis] = await Promise.all([
        db.transactions.where("userId").equals(userId).toArray(),
        db.categories.where("userId").equals(userId).toArray(),
        db.budgets.where("userId").equals(userId).toArray(),
        db.goals.where("userId").equals(userId).toArray(),
        db.emis.where("userId").equals(userId).toArray(),
      ]);
      const data = {
        version: 1,
        userId,
        userEmail: user.email,
        transactions,
        categories,
        budgets,
        goals,
        emis,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      triggerDownload(blob, `capflow-backup-${todayStr()}.json`);
      showToast("Backup downloaded", "success");
    } catch (err) {
      console.error(err);
      showToast("Backup failed", "error");
    } finally {
      setLoading("backup", false);
    }
  };

  // ── Restore ──────────────────────────────────────────────────────────────

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setLoading("restore", true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const userId = user.id;

      // Clear existing user data
      const existingTxIds = (await db.transactions.where("userId").equals(userId).toArray()).map((r) => r.id!);
      const existingCatIds = (await db.categories.where("userId").equals(userId).toArray()).map((r) => r.id!);
      const existingBudIds = (await db.budgets.where("userId").equals(userId).toArray()).map((r) => r.id!);
      const existingGoalIds = (await db.goals.where("userId").equals(userId).toArray()).map((r) => r.id!);
      const existingEmiIds = (await db.emis.where("userId").equals(userId).toArray()).map((r) => r.id!);

      await Promise.all([
        db.transactions.bulkDelete(existingTxIds),
        db.categories.bulkDelete(existingCatIds),
        db.budgets.bulkDelete(existingBudIds),
        db.goals.bulkDelete(existingGoalIds),
        db.emis.bulkDelete(existingEmiIds),
      ]);

      // Re-import with current userId (strip ids so Dexie auto-assigns)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapForUser = (items: any[]) =>
        items.map(({ id: _id, ...rest }: { id?: number; [k: string]: unknown }) => ({ ...rest, userId }));

      await Promise.all([
        data.transactions?.length && db.transactions.bulkAdd(mapForUser(data.transactions) as import("@/lib/db").Transaction[]),
        data.categories?.length  && db.categories.bulkAdd(mapForUser(data.categories)   as import("@/lib/db").Category[]),
        data.budgets?.length     && db.budgets.bulkAdd(mapForUser(data.budgets)           as import("@/lib/db").Budget[]),
        data.goals?.length       && db.goals.bulkAdd(mapForUser(data.goals)               as import("@/lib/db").Goal[]),
        data.emis?.length        && db.emis.bulkAdd(mapForUser(data.emis)                 as import("@/lib/db").EMI[]),
      ]);

      // Reset in-memory stores
      useTransactionStore.setState({ transactions: [], loading: false, loadedMonth: null });
      useCategoryStore.setState({ categories: [], loading: false, initialized: false });
      useBudgetStore.setState({ budgets: [], goals: [], loading: false, loadedMonth: null, goalsLoaded: false });
      useEMIStore.setState({ emis: [], loading: false, loaded: false });

      showToast("Restore completed successfully", "success");
    } catch (err) {
      console.error(err);
      showToast("Restore failed — invalid file?", "error");
    } finally {
      setLoading("restore", false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Clear All Data ───────────────────────────────────────────────────────

  const handleClearData = async () => {
    if (!user?.id) return;
    setClearing(true);
    try {
      const userId = user.id;
      const [txIds, catIds, budIds, goalIds, emiIds] = await Promise.all([
        db.transactions.where("userId").equals(userId).primaryKeys(),
        db.categories.where("userId").equals(userId).primaryKeys(),
        db.budgets.where("userId").equals(userId).primaryKeys(),
        db.goals.where("userId").equals(userId).primaryKeys(),
        db.emis.where("userId").equals(userId).primaryKeys(),
      ]);

      await Promise.all([
        db.transactions.bulkDelete(txIds as number[]),
        db.categories.bulkDelete(catIds as number[]),
        db.budgets.bulkDelete(budIds as number[]),
        db.goals.bulkDelete(goalIds as number[]),
        db.emis.bulkDelete(emiIds as number[]),
      ]);

      useTransactionStore.setState({ transactions: [], loading: false, loadedMonth: null });
      useCategoryStore.setState({ categories: [], loading: false, initialized: false });
      useBudgetStore.setState({ budgets: [], goals: [], loading: false, loadedMonth: null, goalsLoaded: false });
      useEMIStore.setState({ emis: [], loading: false, loaded: false });

      // Wipe user local storage settings & cache completely
      if (typeof window !== "undefined") {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith("capflow-") && k !== "capflow-auth") {
            localStorage.removeItem(k);
          }
        });
      }

      setShowClearDialog(false);
      setClearInput("");
      showToast("All data cleared", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to clear data", "error");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-color)]">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          <ArrowLeft size={20} className="text-[var(--text-secondary)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Export &amp; Backup</h1>
      </header>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`mx-4 mt-3 px-4 py-2.5 rounded-xl text-sm font-medium ${
            toast.type === "success"
              ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"
              : "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20"
          }`}
        >
          {toast.message}
        </motion.div>
      )}

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto pb-10">
        {/* ── Export Data ── */}
        <Section label="Export Data" delay={0}>
          <ActionCard
            icon={<FileJson size={18} className="text-[#6366F1]" />}
            iconBg="bg-[#6366F1]/10"
            title="Export as JSON"
            description="Full export of all your data"
            onClick={exportJSON}
            loading={!!loadingState.json}
            noBorder
          />
          <ActionCard
            icon={<FileSpreadsheet size={18} className="text-[#10B981]" />}
            iconBg="bg-[#10B981]/10"
            title="Export as CSV"
            description="Transactions as a spreadsheet"
            onClick={exportCSV}
            loading={!!loadingState.csv}
          />
          <ActionCard
            icon={<FileSpreadsheet size={18} className="text-[#059669]" />}
            iconBg="bg-[#059669]/10"
            title="Export as Excel (.xlsx)"
            description="Formatted Microsoft Excel workbook"
            onClick={exportExcel}
            loading={!!loadingState.excel}
          />
          <ActionCard
            icon={<FileText size={18} className="text-[#F59E0B]" />}
            iconBg="bg-[#F59E0B]/10"
            title="Export as PDF"
            description="Transaction statement document"
            onClick={exportPDF}
            loading={!!loadingState.pdf}
          />
        </Section>

        {/* ── Backup & Sync ── */}
        <Section label="Backup & Sync" delay={0.08}>
          {!user ? (
            <div className="px-4 py-4 flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#F59E0B]" />
              <p className="text-sm text-[var(--text-secondary)]">Sign in to access backup & restore</p>
            </div>
          ) : (
            <>
              <ActionCard
                icon={<HardDrive size={18} className="text-[#6366F1]" />}
                iconBg="bg-[#6366F1]/10"
                title="Download Backup File"
                description="Full IndexedDB backup as .json"
                onClick={downloadBackup}
                loading={!!loadingState.backup}
                noBorder
              />
              <div
                className={`flex items-center gap-4 px-4 py-4 border-t border-[var(--border-color)] ${
                  loadingState.restore ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
                  {loadingState.restore ? (
                    <Loader2 size={18} className="animate-spin text-[#10B981]" />
                  ) : (
                    <Upload size={18} className="text-[#10B981]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Restore From File</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {loadingState.restore ? "Restoring…" : "Import a capflow backup .json"}
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!!loadingState.restore}
                  className="px-3 py-1.5 rounded-xl bg-[#10B981]/10 text-[#10B981] text-xs font-semibold border border-[#10B981]/20 hover:bg-[#10B981]/20 transition-colors disabled:opacity-50"
                >
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleRestoreFile}
                />
              </div>
            </>
          )}
        </Section>

        {/* ── Danger Zone ── */}
        <Section label="Danger Zone" delay={0.16} danger>
          <div className="px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EF4444]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash2 size={18} className="text-[#EF4444]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#EF4444]">Clear All Data</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Permanently delete all your transactions, categories, budgets, and EMIs from this device.
                </p>
                <button
                  onClick={() => setShowClearDialog(true)}
                  disabled={!user}
                  className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold bg-[#EF4444] text-white hover:bg-[#DC2626] transition-colors disabled:opacity-40"
                >
                  Clear All Data
                </button>
                {!user && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Sign in to use this feature</p>
                )}
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* ── Clear Data Dialog ── */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent showCloseButton={false} className="bg-[var(--bg-card)] border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle className="text-[#EF4444] flex items-center gap-2">
              <AlertTriangle size={16} />
              Clear All Data
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">
            This will permanently delete <strong className="text-[var(--text-primary)]">all your data</strong> on this device. This action cannot be undone.
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Type <strong className="text-[#EF4444]">DELETE</strong> to confirm:
          </p>
          <input
            type="text"
            value={clearInput}
            onChange={(e) => setClearInput(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] outline-none focus:border-[#EF4444] transition-colors"
          />
          <DialogFooter className="bg-transparent border-[var(--border-color)]">
            <DialogClose
              render={
                <button className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors border border-[var(--border-color)]" />
              }
            >
              Cancel
            </DialogClose>
            <button
              onClick={handleClearData}
              disabled={clearInput !== "DELETE" || clearing}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#EF4444] text-white hover:bg-[#DC2626] transition-colors disabled:opacity-40"
            >
              {clearing ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Clearing…
                </span>
              ) : (
                "Clear All Data"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
