import type { MonteCarloConfig, MonteCarloResult } from "../types";
import { mulberry32, percentile } from "./statistics";

export function runMonteCarlo(pnl: number[], initialEquity: number, config: MonteCarloConfig): MonteCarloResult {
  const random = mulberry32(config.seed);
  const terminalEquities: number[] = [];
  const maxDrawdowns: number[] = [];
  const paths: number[][] = [];
  let ruined = 0;
  let drawdownBreached = 0;
  const ruinLevel = initialEquity * (1 - config.ruinThresholdPercent / 100);
  for (let simulation = 0; simulation < config.simulations; simulation += 1) {
    let equity = initialEquity;
    let peak = initialEquity;
    let maxDrawdownPercent = 0;
    let wasRuined = false;
    const path = [equity];
    for (let index = 0; index < pnl.length; index += 1) {
      equity += pnl[Math.floor(random() * pnl.length)] ?? 0;
      peak = Math.max(peak, equity);
      maxDrawdownPercent = Math.max(maxDrawdownPercent, peak > 0 ? ((peak - equity) / peak) * 100 : 100);
      if (equity <= ruinLevel || equity <= 0) wasRuined = true;
      if (simulation < 50) path.push(equity);
    }
    if (wasRuined) ruined += 1;
    if (maxDrawdownPercent > config.drawdownTolerancePercent) drawdownBreached += 1;
    terminalEquities.push(equity);
    maxDrawdowns.push(maxDrawdownPercent);
    if (simulation < 50) paths.push(path);
  }
  return {
    terminalEquities,
    maxDrawdowns,
    paths,
    medianTerminalEquity: percentile(terminalEquities, 0.5),
    p05TerminalEquity: percentile(terminalEquities, 0.05),
    p95TerminalEquity: percentile(terminalEquities, 0.95),
    medianMaxDrawdown: percentile(maxDrawdowns, 0.5),
    p95MaxDrawdown: percentile(maxDrawdowns, 0.95),
    ruinProbability: config.simulations ? ruined / config.simulations : 0,
    drawdownBreachProbability: config.simulations ? drawdownBreached / config.simulations : 0,
  };
}
