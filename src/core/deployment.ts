import type { Evaluation, EvaluationConfig, GateResult, ImportResult, MonteCarloResult, Trade, Verdict } from "../types";
import { computeMetrics, stressCosts } from "./metrics";

const finite = (value: number | null): value is number => value !== null && Number.isFinite(value);
const num = (value: number | null, digits = 2) => value === null ? "N/A" : Number.isFinite(value) ? value.toFixed(digits) : "∞";

export function evaluate(
  importResult: ImportResult,
  config: EvaluationConfig,
  monteCarlo: MonteCarloResult,
): Evaluation {
  const trades = importResult.trades;
  const oosCount = Math.max(1, Math.ceil(trades.length * config.oosPercent / 100));
  const oosStartIndex = Math.max(0, trades.length - oosCount);
  const initial = trades.length ? trades[0].equityBalance - trades[0].netPnl : 0;
  const isTrades = trades.slice(0, oosStartIndex);
  const oosTrades = trades.slice(oosStartIndex);
  const all = computeMetrics(trades, initial);
  const isMetrics = computeMetrics(isTrades, initial);
  const oosInitial = isMetrics.finalEquity;
  const oos = computeMetrics(oosTrades, oosInitial);
  const stressedTrades = stressCosts(trades, 1.5);
  const stressedMetrics = stressedTrades ? computeMetrics(stressedTrades, initial) : null;
  const criticalIssues = importResult.issues.filter((issue) => issue.severity === "error");
  const adequate = trades.length >= config.minTrades || config.lowFrequencyOverride;
  const gates: GateResult[] = [
    {
      id: "data",
      label: "Data & Sample Adequacy",
      status: !criticalIssues.length && adequate ? "pass" : "fail",
      value: `${trades.length} trades / ${criticalIssues.length} critical errors`,
      explanation: adequate ? "Sample threshold and data-integrity checks pass." : `Requires ${config.minTrades} trades unless a documented low-frequency override is enabled.`,
    },
    {
      id: "oos",
      label: "Out-of-Sample Edge",
      status: oos.expectancy > 0 && (oos.profitFactor ?? 0) >= 1.15 && oos.maxDrawdownPercent <= config.drawdownTolerancePercent ? "pass" : "fail",
      value: `Exp ${num(oos.expectancy)} / PF ${num(oos.profitFactor)}`,
      explanation: "OOS expectancy must be positive after costs, PF at least 1.15, and drawdown within tolerance.",
    },
    {
      id: "ror",
      label: "Risk of Ruin",
      status: monteCarlo.ruinProbability < 0.01 ? "pass" : "fail",
      value: `${(monteCarlo.ruinProbability * 100).toFixed(2)}%`,
      explanation: `Bootstrap probability of equity falling ${config.ruinThresholdPercent}% from initial capital must remain below 1%.`,
    },
    {
      id: "drawdown",
      label: "Drawdown Tolerance",
      status: all.maxDrawdownPercent <= config.drawdownTolerancePercent && monteCarlo.p95MaxDrawdown <= config.drawdownTolerancePercent ? "pass" : "fail",
      value: `Hist ${num(all.maxDrawdownPercent)}% / MC95 ${num(monteCarlo.p95MaxDrawdown)}%`,
      explanation: `Historical and Monte Carlo 95th-percentile drawdowns must stay within ${config.drawdownTolerancePercent}%.`,
    },
    {
      id: "costs",
      label: "Execution Robustness",
      status: stressedMetrics === null ? "fail" : stressedMetrics.expectancy > 0 ? "pass" : "fail",
      value: stressedMetrics ? `1.5x Exp ${num(stressedMetrics.expectancy)}` : "Unverifiable",
      explanation: stressedMetrics ? "Strategy must remain profitable at 1.5x baseline transaction costs." : "Gross PnL plus itemized costs are required; missing data cannot pass this hard gate.",
    },
    {
      id: "bias",
      label: "Bias / Leakage",
      status: criticalIssues.some((issue) => ["CHRONOLOGY", "DUPLICATE_ID"].includes(issue.code)) ? "fail" : "pass",
      value: criticalIssues.length ? `${criticalIssues.length} unresolved` : "No detected critical issue",
      explanation: "Automated checks cover chronology and duplicates; human look-ahead and survivorship-bias review is still required.",
    },
  ];
  const quality: GateResult[] = [
    { id: "pf", label: "Profit Factor ≥ 1.30", status: (all.profitFactor ?? 0) >= 1.3 ? "pass" : "fail", value: num(all.profitFactor), explanation: "Measured from net PnL after costs." },
    { id: "recovery", label: "Recovery Factor > 2.00", status: (all.recoveryFactor ?? -Infinity) > 2 ? "pass" : "fail", value: num(all.recoveryFactor), explanation: "Net profit divided by maximum drawdown." },
    { id: "sqn", label: "SQN ≥ 1.00", status: finite(all.sqn) && all.sqn >= 1 ? "pass" : "fail", value: num(all.sqn), explanation: "Trade-level System Quality Number using available R-multiples." },
    { id: "sortino", label: "Sortino ≥ 1.50", status: finite(all.sortino) && all.sortino >= 1.5 ? "pass" : "fail", value: num(all.sortino), explanation: "Trade-level risk-adjusted return using downside deviation." },
    { id: "walkforward", label: "Walk-Forward Stability", status: "na", value: "Phase 2", explanation: "Not scored until chronological walk-forward windows are implemented." },
    { id: "parameters", label: "Parameter Stability", status: "na", value: "Phase 3 / grid required", explanation: "Cannot be inferred from one trade log; neighboring parameter-grid data is required." },
  ];
  const hardFail = gates.some((gate) => gate.status !== "pass");
  const qualityPassed = quality.filter((metric) => metric.status === "pass").length;
  let verdict: Verdict = hardFail || qualityPassed < 3 ? "NOT READY" : qualityPassed >= 5 ? "READY" : "CONDITIONAL";
  if (trades.some((trade) => trade.stage === "Live") && (oos.expectancy <= 0 || all.maxDrawdownPercent > config.drawdownTolerancePercent)) verdict = "SUSPEND / REVIEW";
  const warnings = importResult.issues.filter((issue) => issue.severity === "warning").map((issue) => issue.message);
  if (quality.some((item) => item.status === "na")) warnings.push("Phase 1 cannot issue READY while Walk-Forward and Parameter Stability remain unassessed.");
  return { all, is: isMetrics, oos, oosStartIndex, monteCarlo, gates, quality, verdict, qualityPassed, warnings, stressedMetrics };
}

export function datasetPnl(trades: Trade[]): number[] {
  return trades.map((trade) => trade.netPnl);
}
