import type { DrawdownPoint, Trade } from "../types";

export interface DrawdownAnalysis {
  curve: DrawdownPoint[];
  maxDrawdown: number;
  maxDrawdownPercent: number;
  durationTrades: number;
  ulcerIndex: number;
}

export function inferInitialEquity(trades: Trade[]): number {
  if (!trades.length) return 0;
  const inferred = trades[0].equityBalance - trades[0].netPnl;
  return inferred > 0 ? inferred : Math.max(1, trades[0].equityBalance);
}

export function analyzeDrawdown(trades: Trade[], initialEquity = inferInitialEquity(trades)): DrawdownAnalysis {
  let equity = initialEquity;
  let peak = initialEquity;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  let currentDuration = 0;
  let durationTrades = 0;
  const curve: DrawdownPoint[] = [{ date: trades[0]?.date ?? new Date(0).toISOString(), equity, drawdown: 0, drawdownPercent: 0 }];
  for (const trade of trades) {
    equity += trade.netPnl;
    peak = Math.max(peak, equity);
    const drawdown = Math.max(0, peak - equity);
    const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 100;
    if (drawdown > 0) currentDuration += 1;
    else currentDuration = 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    maxDrawdownPercent = Math.max(maxDrawdownPercent, drawdownPercent);
    durationTrades = Math.max(durationTrades, currentDuration);
    curve.push({ date: trade.date, equity, drawdown, drawdownPercent });
  }
  const ulcerIndex = Math.sqrt(curve.reduce((sum, point) => sum + point.drawdownPercent ** 2, 0) / Math.max(1, curve.length));
  return { curve, maxDrawdown, maxDrawdownPercent, durationTrades, ulcerIndex };
}
