import type { Metrics, Trade } from "../types";
import { analyzeDrawdown, inferInitialEquity } from "./drawdown";
import { mean, median, percentile, sampleStd } from "./statistics";

const nullableRatio = (numerator: number, denominator: number): number | null => denominator === 0 ? null : numerator / denominator;

function maxStreak(values: number[], predicate: (value: number) => boolean): number {
  let best = 0;
  let current = 0;
  for (const value of values) {
    current = predicate(value) ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

export function computeMetrics(trades: Trade[], initialEquityOverride?: number): Metrics {
  const initialEquity = initialEquityOverride ?? inferInitialEquity(trades);
  const pnl = trades.map((trade) => trade.netPnl);
  const wins = pnl.filter((value) => value > 0);
  const losses = pnl.filter((value) => value < 0);
  const rValues = trades.map((trade) => trade.rMultiple).filter((value): value is number => value !== null && Number.isFinite(value));
  const grossProfit = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = losses.reduce((sum, value) => sum + value, 0);
  const netProfit = pnl.reduce((sum, value) => sum + value, 0);
  const averageWin = mean(wins);
  const averageLoss = mean(losses);
  const drawdown = analyzeDrawdown(trades, initialEquity);
  const returns: number[] = [];
  let priorEquity = initialEquity;
  for (const value of pnl) {
    returns.push(priorEquity > 0 ? value / priorEquity : 0);
    priorEquity += value;
  }
  const returnMean = mean(returns);
  const returnStd = sampleStd(returns);
  const downside = returns.filter((value) => value < 0);
  const downsideDeviation = downside.length ? Math.sqrt(mean(downside.map((value) => value ** 2))) : 0;
  const annualFactor = Math.sqrt(Math.max(1, trades.length));
  const start = trades[0]?.timestamp ?? 0;
  const end = trades.at(-1)?.timestamp ?? 0;
  const years = (end - start) / (365.25 * 24 * 60 * 60 * 1000);
  const finalEquity = initialEquity + netProfit;
  const cagr = years >= 0.5 && initialEquity > 0 && finalEquity > 0 ? (finalEquity / initialEquity) ** (1 / years) - 1 : null;
  const var95 = pnl.length ? percentile(pnl, 0.05) : 0;
  const tail = pnl.filter((value) => value <= var95);
  const totalCosts = trades.reduce((sum, trade) => sum + trade.commission + trade.slippage + trade.spreadCost + trade.funding, 0);
  return {
    initialEquity,
    finalEquity,
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: pnl.filter((value) => value === 0).length,
    winRate: trades.length ? wins.length / trades.length : 0,
    lossRate: trades.length ? losses.length / trades.length : 0,
    grossProfit,
    grossLoss,
    netProfit,
    totalCosts,
    averageWin,
    averageLoss,
    payoffRatio: nullableRatio(averageWin, Math.abs(averageLoss)),
    profitFactor: grossLoss === 0 ? (grossProfit > 0 ? Infinity : null) : grossProfit / Math.abs(grossLoss),
    expectancy: mean(pnl),
    expectancyPercent: mean(returns) * 100,
    averageR: rValues.length ? mean(rValues) : null,
    medianR: rValues.length ? median(rValues) : null,
    gainToPain: grossLoss === 0 ? (grossProfit > 0 ? Infinity : null) : netProfit / Math.abs(grossLoss),
    maxDrawdown: drawdown.maxDrawdown,
    maxDrawdownPercent: drawdown.maxDrawdownPercent,
    drawdownDurationTrades: drawdown.durationTrades,
    recoveryFactor: nullableRatio(netProfit, drawdown.maxDrawdown),
    maxSingleLoss: losses.length ? Math.min(...losses) : 0,
    maxConsecutiveLosses: maxStreak(pnl, (value) => value < 0),
    maxConsecutiveWins: maxStreak(pnl, (value) => value > 0),
    var95,
    cvar95: mean(tail),
    ulcerIndex: drawdown.ulcerIndex,
    sharpe: returnStd > 0 ? (returnMean / returnStd) * annualFactor : null,
    sortino: downsideDeviation > 0 ? (returnMean / downsideDeviation) * annualFactor : null,
    calmar: cagr !== null && drawdown.maxDrawdownPercent > 0 ? cagr / (drawdown.maxDrawdownPercent / 100) : null,
    martin: drawdown.ulcerIndex > 0 ? (mean(returns) * trades.length) / (drawdown.ulcerIndex / 100) : null,
    sqn: rValues.length >= 2 && sampleStd(rValues) > 0 ? (mean(rValues) / sampleStd(rValues)) * Math.sqrt(rValues.length) : null,
    cagr,
    equityCurve: drawdown.curve,
  };
}

export function stressCosts(trades: Trade[], multiplier: number): Trade[] | null {
  if (!trades.length || trades.some((trade) => !trade.costDataComplete)) return null;
  return trades.map((trade) => {
    const baselineCosts = trade.commission + trade.slippage + trade.spreadCost + trade.funding;
    const netPnl = trade.grossPnl - baselineCosts * multiplier;
    return { ...trade, netPnl, pnlPercent: trade.equityBalance ? (netPnl / trade.equityBalance) * 100 : 0, rMultiple: trade.riskPerTrade && trade.riskPerTrade > 0 ? netPnl / trade.riskPerTrade : null };
  });
}
