import type { Evaluation, EvaluationConfig, ImportResult } from "../types";
import { localizeGate, type Language } from "../i18n/strings";

const money = (value: number) => `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
const metric = (value: number | null) => value === null ? "N/A" : Number.isFinite(value) ? value.toFixed(3) : "Infinity";

export function buildMarkdownReport(result: ImportResult, evaluation: Evaluation, config: EvaluationConfig, language: Language = "en"): string {
  const trades = result.trades;
  const stages = [...new Set(trades.map((trade) => trade.stage))].join(", ");
  const versions = [...new Set(trades.map((trade) => trade.strategyVersion))].join(", ");
  const status = (value: string) => language === "th" ? ({ pass: "ผ่าน", fail: "ไม่ผ่าน", warn: "เตือน", na: "ยังไม่ประเมิน" }[value] ?? value) : value.toUpperCase();
  const gateRows = evaluation.gates.map((raw) => { const gate = localizeGate(raw, language); return `| ${gate.label} | ${status(gate.status)} | ${gate.value} | ${gate.explanation} |`; }).join("\n");
  const qualityRows = evaluation.quality.map((raw) => { const item = localizeGate(raw, language); return `| ${item.label} | ${status(item.status)} | ${item.value} | ${item.explanation} |`; }).join("\n");
  const title = language === "th" ? "รายงานตรวจสอบระบบเทรด" : "Trading System Evaluation Audit";
  const verdictHeading = language === "th" ? "ผลการประเมิน" : "Verdict";
  const coreHeading = language === "th" ? "ตัวชี้วัดหลัก" : "Core Metrics";
  const gateHeading = language === "th" ? "ด่านบังคับ" : "Mandatory Gates";
  const qualityHeading = language === "th" ? "ตัวชี้วัดคุณภาพ" : "Quality Metrics";
  const limitationsHeading = language === "th" ? "ข้อจำกัดที่ทราบ" : "Known Limitations";
  return `# ${title}\n\n` +
    `- **Source:** ${result.sourceName}\n- **Strategy version(s):** ${versions || "Unspecified"}\n- **Evaluated:** ${new Date().toISOString()}\n` +
    `- **Calculation version:** azanna-evaluator/0.1.0\n- **Date range:** ${trades[0]?.date ?? "N/A"} to ${trades.at(-1)?.date ?? "N/A"}\n` +
    `- **Trades:** ${trades.length}\n- **Stages:** ${stages || "N/A"}\n- **IS/OOS:** ${100 - config.oosPercent}% / ${config.oosPercent}% chronological\n` +
    `- **Monte Carlo:** ${config.simulations} bootstrap paths, seed ${config.seed}\n- **Drawdown tolerance:** ${config.drawdownTolerancePercent}%\n\n` +
    `## ${verdictHeading}\n\n**${evaluation.verdict}** (${evaluation.qualityPassed}/6 quality metrics pass; unassessed metrics do not pass)\n\n` +
    `## ${coreHeading}\n\n| Metric | All | IS | OOS |\n|---|---:|---:|---:|\n` +
    `| Net profit | ${money(evaluation.all.netProfit)} | ${money(evaluation.is.netProfit)} | ${money(evaluation.oos.netProfit)} |\n` +
    `| Expectancy | ${money(evaluation.all.expectancy)} | ${money(evaluation.is.expectancy)} | ${money(evaluation.oos.expectancy)} |\n` +
    `| Profit Factor | ${metric(evaluation.all.profitFactor)} | ${metric(evaluation.is.profitFactor)} | ${metric(evaluation.oos.profitFactor)} |\n` +
    `| Win Rate | ${(evaluation.all.winRate * 100).toFixed(1)}% | ${(evaluation.is.winRate * 100).toFixed(1)}% | ${(evaluation.oos.winRate * 100).toFixed(1)}% |\n` +
    `| Max Drawdown | ${evaluation.all.maxDrawdownPercent.toFixed(2)}% | ${evaluation.is.maxDrawdownPercent.toFixed(2)}% | ${evaluation.oos.maxDrawdownPercent.toFixed(2)}% |\n` +
    `| Sortino | ${metric(evaluation.all.sortino)} | ${metric(evaluation.is.sortino)} | ${metric(evaluation.oos.sortino)} |\n` +
    `| SQN | ${metric(evaluation.all.sqn)} | ${metric(evaluation.is.sqn)} | ${metric(evaluation.oos.sqn)} |\n\n` +
    `## Monte Carlo Risk\n\n- Median terminal equity: ${money(evaluation.monteCarlo.medianTerminalEquity)}\n` +
    `- 5th / 95th terminal equity: ${money(evaluation.monteCarlo.p05TerminalEquity)} / ${money(evaluation.monteCarlo.p95TerminalEquity)}\n` +
    `- 95th percentile max drawdown: ${evaluation.monteCarlo.p95MaxDrawdown.toFixed(2)}%\n- Estimated Risk of Ruin: ${(evaluation.monteCarlo.ruinProbability * 100).toFixed(2)}%\n\n` +
    `## ${gateHeading}\n\n| Gate | Status | Value | Reason |\n|---|---|---|---|\n${gateRows}\n\n` +
    `## ${qualityHeading}\n\n| Metric | Status | Value | Reason |\n|---|---|---|---|\n${qualityRows}\n\n` +
    `## ${limitationsHeading}\n\n${evaluation.warnings.length ? evaluation.warnings.map((warning) => `- ${warning}`).join("\n") : "- None reported by automated validation."}\n` +
    `- Monte Carlo resamples historical trade PnL with replacement and does not model future regime changes.\n- Automated checks cannot prove the absence of look-ahead or survivorship bias.\n`;
}

export function downloadMarkdown(markdown: string, filename = "strategy-evaluation.md"): void {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
