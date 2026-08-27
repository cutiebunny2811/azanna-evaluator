import { describe, expect, it } from "vitest";
import { evaluate } from "../core/deployment";
import { runMonteCarlo } from "../core/monteCarlo";
import { tradesFromPnl } from "./fixtures";

describe("deployment evaluation", () => {
  it("hard-fails apparent overfit with OOS degradation", () => {
    const trades = tradesFromPnl([...Array(70).fill(40), ...Array(30).fill(-30)]);
    const config = { oosPercent: 30, simulations: 200, seed: 3, ruinThresholdPercent: 50, drawdownTolerancePercent: 20, minTrades: 100, lowFrequencyOverride: false };
    const mc = runMonteCarlo(trades.map((trade) => trade.netPnl), 10_000, config);
    const result = evaluate({ trades, issues: [], sourceName: "oos-degradation.csv" }, config, mc);
    expect(result.oos.expectancy).toBe(-30);
    expect(result.gates.find((gate) => gate.id === "oos")?.status).toBe("fail");
    expect(result.verdict).toBe("NOT READY");
  });

  it("does not classify a high profit factor as overfitting by itself", () => {
    const trades = tradesFromPnl(Array.from({ length: 100 }, (_, index) => index % 5 === 0 ? -5 : 50));
    const config = { oosPercent: 30, simulations: 200, seed: 4, ruinThresholdPercent: 50, drawdownTolerancePercent: 20, minTrades: 100, lowFrequencyOverride: false };
    const mc = runMonteCarlo(trades.map((trade) => trade.netPnl), 10_000, config);
    const result = evaluate({ trades, issues: [], sourceName: "high-pf.csv" }, config, mc);
    expect(result.all.profitFactor).toBeGreaterThan(2);
    expect(result.quality.find((metric) => metric.id === "pf")?.status).toBe("pass");
  });
});
