import type { Trade } from "../types";

function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createDemoTrades(count = 140): Trade[] {
  const random = rng(20260827);
  let equity = 10_000;
  const start = Date.UTC(2025, 0, 2, 8);
  return Array.from({ length: count }, (_, index) => {
    const stage = index < 98 ? "Backtest" : "Demo";
    const regime = index % 5 < 3 ? "TREND" : "RANGE";
    const risk = Math.max(45, equity * 0.006);
    const edge = index < 98 ? 0.16 : 0.09;
    const win = random() < (regime === "TREND" ? 0.48 : 0.44);
    const r = win ? 1.25 + random() * 1.25 + edge : -(0.65 + random() * 0.55);
    const grossPnl = risk * r;
    const commission = 3.2 + random() * 1.8;
    const slippage = 1 + random() * 2.5;
    const spreadCost = 1.5 + random() * 2;
    const funding = index % 9 === 0 ? 0.8 : 0;
    const netPnl = grossPnl - commission - slippage - spreadCost - funding;
    equity += netPnl;
    const timestamp = start + index * 36 * 60 * 60 * 1000;
    return {
      orderId: `AZ-${String(index + 1).padStart(4, "0")}`,
      date: new Date(timestamp).toISOString(),
      timestamp,
      equityBalance: equity,
      product: "BTCUSDm",
      positionSize: Math.max(500, equity * 0.12),
      riskPerTrade: risk,
      pnlPercent: (netPnl / (equity - netPnl)) * 100,
      side: index % 3 === 0 ? "Long" : "Short",
      strategy: regime === "TREND" ? "Trend Following" : "Adaptive Range",
      stage,
      strategyVersion: "anna-v1",
      grossPnl,
      commission,
      slippage,
      spreadCost,
      funding,
      netPnl,
      mae: -risk * (0.15 + random() * 0.8),
      mfe: risk * (0.2 + random() * 1.8),
      regime,
      rMultiple: netPnl / risk,
      sourceRow: index + 2,
      costDataComplete: true,
    } as Trade;
  });
}
