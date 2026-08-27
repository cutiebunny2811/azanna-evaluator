import { describe, expect, it } from "vitest";
import { computeMetrics, stressCosts } from "../core/metrics";
import { tradesFromPnl } from "./fixtures";

describe("quantitative metrics", () => {
  it("scores a profitable reference system", () => {
    const metrics = computeMetrics(tradesFromPnl([120, -50, 150, -60, 110]));
    expect(metrics.netProfit).toBe(270);
    expect(metrics.expectancy).toBe(54);
    expect(metrics.profitFactor).toBeCloseTo(380 / 110);
    expect(metrics.winRate).toBe(0.6);
  });

  it("scores a losing reference system", () => {
    const metrics = computeMetrics(tradesFromPnl([-100, 30, -80, 20]));
    expect(metrics.netProfit).toBe(-130);
    expect(metrics.expectancy).toBeLessThan(0);
    expect(metrics.profitFactor).toBeLessThan(1);
  });

  it("handles zero gross loss without division errors", () => {
    const metrics = computeMetrics(tradesFromPnl([10, 20, 30]));
    expect(metrics.profitFactor).toBe(Infinity);
    expect(metrics.payoffRatio).toBeNull();
    expect(metrics.maxDrawdown).toBe(0);
  });

  it("handles zero wins", () => {
    const metrics = computeMetrics(tradesFromPnl([-10, -20, -30]));
    expect(metrics.profitFactor).toBe(0);
    expect(metrics.averageWin).toBe(0);
    expect(metrics.maxConsecutiveLosses).toBe(3);
  });

  it("detects high win-rate but poor payoff", () => {
    const metrics = computeMetrics(tradesFromPnl([10, 10, 10, 10, 10, 10, 10, 10, 10, -150]));
    expect(metrics.winRate).toBe(0.9);
    expect(metrics.expectancy).toBeLessThan(0);
    expect(metrics.payoffRatio).toBeLessThan(0.1);
  });

  it("detects low win-rate but high payoff edge", () => {
    const metrics = computeMetrics(tradesFromPnl([-20, -20, -20, -20, 160]));
    expect(metrics.winRate).toBe(0.2);
    expect(metrics.expectancy).toBeGreaterThan(0);
    expect(metrics.profitFactor).toBe(2);
  });

  it("measures severe peak-to-trough drawdown", () => {
    const metrics = computeMetrics(tradesFromPnl([500, -300, -400, 100]));
    expect(metrics.maxDrawdown).toBe(700);
    expect(metrics.maxDrawdownPercent).toBeCloseTo((700 / 10500) * 100);
  });

  it("exposes execution-cost sensitivity", () => {
    const trades = tradesFromPnl([2, 2, 2], { cost: 10 });
    const stressed = stressCosts(trades, 1.5)!;
    expect(computeMetrics(trades).expectancy).toBe(2);
    expect(computeMetrics(stressed).expectancy).toBe(-3);
  });

  it("leaves R metrics unavailable when risk is missing", () => {
    const metrics = computeMetrics(tradesFromPnl([10, -5], { risk: null }));
    expect(metrics.averageR).toBeNull();
    expect(metrics.sqn).toBeNull();
  });
});
