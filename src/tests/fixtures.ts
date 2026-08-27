import type { Trade } from "../types";

export function tradesFromPnl(values: number[], options: { risk?: number | null; cost?: number; startEquity?: number } = {}): Trade[] {
  const risk = options.risk === undefined ? 100 : options.risk;
  const cost = options.cost ?? 2;
  let equity = options.startEquity ?? 10_000;
  return values.map((netPnl, index) => {
    equity += netPnl;
    const timestamp = Date.UTC(2025, 0, 1 + index);
    return {
      orderId: `T-${index}`,
      date: new Date(timestamp).toISOString(),
      timestamp,
      equityBalance: equity,
      product: "BTCUSDm",
      positionSize: 1_000,
      riskPerTrade: risk,
      pnlPercent: netPnl / 100,
      side: index % 2 ? "Short" : "Long",
      strategy: "Test",
      stage: index < Math.floor(values.length * 0.7) ? "Backtest" : "Demo",
      strategyVersion: "test-v1",
      grossPnl: netPnl + cost,
      commission: cost,
      slippage: 0,
      spreadCost: 0,
      funding: 0,
      netPnl,
      regime: "TREND",
      rMultiple: risk && risk > 0 ? netPnl / risk : null,
      sourceRow: index + 2,
      costDataComplete: true,
    } as Trade;
  });
}
