import type { Evaluation, EvaluationConfig, ImportResult, Trade, ValidationIssue } from "../types";
import { supabase } from "../lib/supabase";

export interface CloudRunSummary {
  id: string;
  sourceName: string;
  tradeCount: number;
  issueCount: number;
  verdict: string;
  netProfit: number;
  maxDrawdownPercent: number;
  profitFactor: number | null;
  oosExpectancy: number;
  createdAt: string;
}

export interface LoadedCloudRun {
  dataset: ImportResult;
  config: EvaluationConfig;
}

const requireClient = () => {
  if (!supabase) throw new Error("Cloud sync is not configured");
  return supabase;
};

const compactMetrics = (metrics: Evaluation["all"]) => {
  const summary: Partial<Evaluation["all"]> = { ...metrics };
  delete summary.equityCurve;
  return summary;
};

const compactEvaluation = (evaluation: Evaluation) => ({
  verdict: evaluation.verdict,
  qualityPassed: evaluation.qualityPassed,
  all: compactMetrics(evaluation.all),
  is: compactMetrics(evaluation.is),
  oos: compactMetrics(evaluation.oos),
  gates: evaluation.gates,
  quality: evaluation.quality,
  warnings: evaluation.warnings,
  monteCarlo: {
    medianTerminalEquity: evaluation.monteCarlo.medianTerminalEquity,
    p05TerminalEquity: evaluation.monteCarlo.p05TerminalEquity,
    p95TerminalEquity: evaluation.monteCarlo.p95TerminalEquity,
    medianMaxDrawdown: evaluation.monteCarlo.medianMaxDrawdown,
    p95MaxDrawdown: evaluation.monteCarlo.p95MaxDrawdown,
    ruinProbability: evaluation.monteCarlo.ruinProbability,
    drawdownBreachProbability: evaluation.monteCarlo.drawdownBreachProbability,
  },
});

export async function listCloudRuns(): Promise<CloudRunSummary[]> {
  const client = requireClient();
  const { data, error } = await client
    .from("azanna_trade_runs")
    .select("id, source_name, trade_count, issue_count, verdict, net_profit, max_drawdown_percent, profit_factor, oos_expectancy, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((run) => ({
    id: run.id,
    sourceName: run.source_name,
    tradeCount: run.trade_count,
    issueCount: run.issue_count,
    verdict: run.verdict,
    netProfit: run.net_profit,
    maxDrawdownPercent: run.max_drawdown_percent,
    profitFactor: run.profit_factor,
    oosExpectancy: run.oos_expectancy,
    createdAt: run.created_at,
  }));
}

export async function saveCloudRun(
  userId: string,
  dataset: ImportResult,
  evaluation: Evaluation,
  config: EvaluationConfig,
): Promise<string> {
  const client = requireClient();
  const { data: run, error: runError } = await client
    .from("azanna_trade_runs")
    .insert({
      user_id: userId,
      source_name: dataset.sourceName,
      trade_count: dataset.trades.length,
      issue_count: dataset.issues.length,
      issues: dataset.issues,
      config,
      verdict: evaluation.verdict,
      net_profit: evaluation.all.netProfit,
      max_drawdown_percent: evaluation.all.maxDrawdownPercent,
      profit_factor: evaluation.all.profitFactor,
      oos_expectancy: evaluation.oos.expectancy,
    })
    .select("id")
    .single();
  if (runError || !run) throw runError ?? new Error("Could not create cloud run");

  try {
    const rows = dataset.trades.map((trade, sequence) => ({
      run_id: run.id,
      user_id: userId,
      sequence,
      order_id: trade.orderId,
      payload: trade,
    }));
    for (let index = 0; index < rows.length; index += 250) {
      const { error } = await client.from("azanna_trades").insert(rows.slice(index, index + 250));
      if (error) throw error;
    }
    const { error: evaluationError } = await client.from("azanna_evaluations").insert({
      run_id: run.id,
      user_id: userId,
      config,
      verdict: evaluation.verdict,
      summary: compactEvaluation(evaluation),
    });
    if (evaluationError) throw evaluationError;
    return run.id;
  } catch (error) {
    await client.from("azanna_trade_runs").delete().eq("id", run.id);
    throw error;
  }
}

export async function loadCloudRun(runId: string): Promise<LoadedCloudRun> {
  const client = requireClient();
  const [{ data: run, error: runError }, { data: tradeRows, error: tradeError }] = await Promise.all([
    client.from("azanna_trade_runs").select("source_name, issues, config").eq("id", runId).single(),
    client.from("azanna_trades").select("payload").eq("run_id", runId).order("sequence", { ascending: true }),
  ]);
  if (runError || !run) throw runError ?? new Error("Cloud run not found");
  if (tradeError) throw tradeError;
  return {
    dataset: {
      sourceName: run.source_name,
      issues: (run.issues ?? []) as ValidationIssue[],
      trades: (tradeRows ?? []).map((row) => row.payload as Trade),
    },
    config: run.config as EvaluationConfig,
  };
}

export async function deleteCloudRun(runId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from("azanna_trade_runs").delete().eq("id", runId);
  if (error) throw error;
}
