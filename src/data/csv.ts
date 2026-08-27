import Papa from "papaparse";
import type { ImportResult, Side, Stage, Trade, ValidationIssue } from "../types";

const aliases: Record<string, string[]> = {
  orderId: ["order id", "orderid", "trade id", "ticket", "id"],
  date: ["date", "close date", "exit date", "time"],
  equityBalance: ["equity balance ($)", "equity balance", "equity", "balance"],
  product: ["product", "symbol", "instrument", "market"],
  positionSize: ["position size ($)", "position size", "size", "notional", "volume"],
  riskPerTrade: ["riskpertrade ($)", "riskpertrade", "risk per trade", "risk ($)", "risk"],
  pnl: ["profit/loss ($)", "profit/loss", "pnl", "p&l", "profit", "net profit"],
  pnlPercent: ["profit/loss (%)", "pnl (%)", "pnl %", "return %", "return"],
  side: ["side", "direction", "type"],
  strategy: ["strategy / setup", "strategy", "setup"],
  stage: ["stage", "environment", "mode"],
  strategyVersion: ["strategy version", "version"],
  entryTimestamp: ["entry timestamp", "entry time", "open time"],
  exitTimestamp: ["exit timestamp", "exit time", "close time"],
  entryPrice: ["entry price", "open price"],
  exitPrice: ["exit price", "close price"],
  grossPnl: ["gross pnl ($)", "gross pnl", "gross profit"],
  commission: ["commission / fee ($)", "commission", "fee", "fees"],
  slippage: ["slippage ($)", "slippage"],
  spreadCost: ["spread cost ($)", "spread cost", "spread"],
  funding: ["funding / carry ($)", "funding", "carry", "swap"],
  netPnl: ["net pnl ($)", "net pnl", "net profit ($)"],
  mae: ["mae", "maximum adverse excursion"],
  mfe: ["mfe", "maximum favorable excursion"],
  regime: ["market regime", "regime"],
};

const cleanHeader = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

function resolveHeaders(headers: string[]): Record<string, string | undefined> {
  const byClean = new Map(headers.map((header) => [cleanHeader(header), header]));
  return Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => [key, names.map(cleanHeader).map((name) => byClean.get(name)).find(Boolean)]),
  );
}

function numberValue(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const normalized = String(value).replace(/[$,%\s]/g, "").replace(/\((.+)\)/, "-$1");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

const cell = (row: Record<string, unknown>, header?: string) => (header ? row[header] : undefined);

function normalizeStage(value: unknown): Stage {
  const stage = String(value ?? "Demo").trim().toLowerCase();
  if (stage.includes("back")) return "Backtest";
  if (stage.includes("paper")) return "Paper";
  if (stage.includes("live")) return "Live";
  return "Demo";
}

function normalizeSide(value: unknown): Side {
  const side = String(value ?? "Long").trim().toLowerCase();
  return side.includes("short") || side.includes("sell") ? "Short" : "Long";
}

export function parseCsv(csv: string, sourceName = "trades.csv"): ImportResult {
  const parsed = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  const issues: ValidationIssue[] = parsed.errors.map((error) => ({
    severity: "error",
    row: error.row === undefined ? undefined : error.row + 2,
    code: "CSV_PARSE",
    message: error.message,
  }));
  const headers = parsed.meta.fields ?? [];
  const resolved = resolveHeaders(headers);
  const required = ["orderId", "date", "equityBalance", "product", "positionSize", "riskPerTrade", "pnl", "pnlPercent"];
  for (const key of required) {
    if (!resolved[key] && !(key === "pnl" && resolved.netPnl)) {
      issues.push({ severity: "error", code: "MISSING_HEADER", message: `Missing required column: ${key}` });
    }
  }
  if (issues.some((issue) => issue.severity === "error" && issue.code === "MISSING_HEADER")) {
    return { trades: [], issues, sourceName };
  }

  const seenIds = new Set<string>();
  const trades: Trade[] = [];
  parsed.data.forEach((row, index) => {
    const sourceRow = index + 2;
    const orderId = String(cell(row, resolved.orderId) ?? "").trim();
    const dateRaw = String(cell(row, resolved.date) ?? "").trim();
    const timestamp = Date.parse(dateRaw);
    const equityBalance = numberValue(cell(row, resolved.equityBalance));
    const positionSize = numberValue(cell(row, resolved.positionSize));
    const riskPerTrade = numberValue(cell(row, resolved.riskPerTrade));
    const pnlFallback = numberValue(cell(row, resolved.pnl));
    const explicitNet = numberValue(cell(row, resolved.netPnl));
    const explicitGross = numberValue(cell(row, resolved.grossPnl));
    const commission = Math.abs(numberValue(cell(row, resolved.commission)) ?? 0);
    const slippage = Math.abs(numberValue(cell(row, resolved.slippage)) ?? 0);
    const spreadCost = Math.abs(numberValue(cell(row, resolved.spreadCost)) ?? 0);
    const fundingRaw = numberValue(cell(row, resolved.funding)) ?? 0;
    const totalCosts = commission + slippage + spreadCost + Math.abs(fundingRaw);
    const grossPnl = explicitGross ?? (explicitNet !== null ? explicitNet + totalCosts : pnlFallback);
    const netPnl = explicitNet ?? (explicitGross !== null ? explicitGross - totalCosts : pnlFallback);
    const pnlPercent = numberValue(cell(row, resolved.pnlPercent));
    const rowErrors: string[] = [];
    if (!orderId) rowErrors.push("Order ID");
    if (!Number.isFinite(timestamp)) rowErrors.push("Date");
    if (equityBalance === null) rowErrors.push("Equity Balance");
    if (positionSize === null) rowErrors.push("Position Size");
    if (pnlPercent === null) rowErrors.push("Profit/Loss (%)");
    if (grossPnl === null || netPnl === null) rowErrors.push("Profit/Loss ($)");
    if (rowErrors.length) {
      issues.push({ severity: "error", row: sourceRow, code: "MALFORMED_ROW", message: `Invalid ${rowErrors.join(", ")}` });
      return;
    }
    if (seenIds.has(orderId)) {
      issues.push({ severity: "error", row: sourceRow, code: "DUPLICATE_ID", message: `Duplicate Order ID: ${orderId}` });
      return;
    }
    seenIds.add(orderId);
    const entryTimestamp = String(cell(row, resolved.entryTimestamp) ?? "").trim() || undefined;
    const exitTimestamp = String(cell(row, resolved.exitTimestamp) ?? "").trim() || undefined;
    if (entryTimestamp && exitTimestamp && Date.parse(entryTimestamp) > Date.parse(exitTimestamp)) {
      issues.push({ severity: "error", row: sourceRow, code: "CHRONOLOGY", message: "Entry time is after exit time" });
    }
    if (riskPerTrade === null || riskPerTrade <= 0) {
      issues.push({ severity: "warning", row: sourceRow, code: "MISSING_RISK", message: "R-multiple unavailable: RiskPerTrade must be positive" });
    }
    const costDataComplete = Boolean(resolved.grossPnl && (resolved.netPnl || resolved.commission || resolved.slippage || resolved.spreadCost || resolved.funding));
    trades.push({
      orderId,
      date: new Date(timestamp).toISOString(),
      timestamp,
      equityBalance: equityBalance!,
      product: String(cell(row, resolved.product) ?? "Unknown").trim(),
      positionSize: positionSize!,
      riskPerTrade,
      pnlPercent: pnlPercent!,
      side: normalizeSide(cell(row, resolved.side)),
      strategy: String(cell(row, resolved.strategy) ?? "Unspecified").trim(),
      stage: normalizeStage(cell(row, resolved.stage)),
      strategyVersion: String(cell(row, resolved.strategyVersion) ?? "v1").trim(),
      entryTimestamp,
      exitTimestamp,
      entryPrice: numberValue(cell(row, resolved.entryPrice)) ?? undefined,
      exitPrice: numberValue(cell(row, resolved.exitPrice)) ?? undefined,
      grossPnl: grossPnl!,
      commission,
      slippage,
      spreadCost,
      funding: Math.abs(fundingRaw),
      netPnl: netPnl!,
      mae: numberValue(cell(row, resolved.mae)) ?? undefined,
      mfe: numberValue(cell(row, resolved.mfe)) ?? undefined,
      regime: String(cell(row, resolved.regime) ?? "Unspecified").trim(),
      rMultiple: riskPerTrade && riskPerTrade > 0 ? netPnl! / riskPerTrade : null,
      sourceRow,
      costDataComplete,
    });
  });
  trades.sort((a, b) => a.timestamp - b.timestamp);
  if (trades.length < 30) issues.push({ severity: "warning", code: "SPARSE", message: "Fewer than 30 trades: insufficient evidence" });
  else if (trades.length < 100) issues.push({ severity: "warning", code: "EXPLORATORY", message: "30-99 trades: exploratory evidence only" });
  if (trades.some((trade, index) => index > 0 && trade.equityBalance <= 0)) {
    issues.push({ severity: "error", code: "NON_POSITIVE_EQUITY", message: "Equity must remain positive" });
  }
  if (trades.length && trades.every((trade) => !trade.costDataComplete)) {
    issues.push({ severity: "warning", code: "COSTS_UNVERIFIED", message: "Cost breakdown is missing; 1.5x execution-cost gate cannot be verified" });
  }
  return { trades, issues, sourceName };
}

export function readCsvFile(file: File): Promise<ImportResult> {
  return file.text().then((text) => parseCsv(text, file.name));
}
