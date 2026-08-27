export type Stage = "Backtest" | "Demo" | "Paper" | "Live";
export type Side = "Long" | "Short";
export type Verdict = "READY" | "CONDITIONAL" | "NOT READY" | "SUSPEND / REVIEW";
export type Health = "pass" | "warn" | "fail" | "na";

export interface Trade {
  orderId: string;
  date: string;
  timestamp: number;
  equityBalance: number;
  product: string;
  positionSize: number;
  riskPerTrade: number | null;
  pnlPercent: number;
  side: Side;
  strategy: string;
  stage: Stage;
  strategyVersion: string;
  entryTimestamp?: string;
  exitTimestamp?: string;
  entryPrice?: number;
  exitPrice?: number;
  grossPnl: number;
  commission: number;
  slippage: number;
  spreadCost: number;
  funding: number;
  netPnl: number;
  mae?: number;
  mfe?: number;
  regime: string;
  rMultiple: number | null;
  sourceRow: number;
  costDataComplete: boolean;
}

export interface ValidationIssue {
  severity: "error" | "warning";
  row?: number;
  code: string;
  message: string;
}

export interface ImportResult {
  trades: Trade[];
  issues: ValidationIssue[];
  sourceName: string;
}

export interface DrawdownPoint {
  date: string;
  equity: number;
  drawdown: number;
  drawdownPercent: number;
}

export interface Metrics {
  initialEquity: number;
  finalEquity: number;
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  lossRate: number;
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  totalCosts: number;
  averageWin: number;
  averageLoss: number;
  payoffRatio: number | null;
  profitFactor: number | null;
  expectancy: number;
  expectancyPercent: number;
  averageR: number | null;
  medianR: number | null;
  gainToPain: number | null;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  drawdownDurationTrades: number;
  recoveryFactor: number | null;
  maxSingleLoss: number;
  maxConsecutiveLosses: number;
  maxConsecutiveWins: number;
  var95: number;
  cvar95: number;
  ulcerIndex: number;
  sharpe: number | null;
  sortino: number | null;
  calmar: number | null;
  martin: number | null;
  sqn: number | null;
  cagr: number | null;
  equityCurve: DrawdownPoint[];
}

export interface MonteCarloConfig {
  simulations: number;
  seed: number;
  ruinThresholdPercent: number;
  drawdownTolerancePercent: number;
}

export interface MonteCarloResult {
  terminalEquities: number[];
  maxDrawdowns: number[];
  paths: number[][];
  medianTerminalEquity: number;
  p05TerminalEquity: number;
  p95TerminalEquity: number;
  medianMaxDrawdown: number;
  p95MaxDrawdown: number;
  ruinProbability: number;
  drawdownBreachProbability: number;
}

export interface EvaluationConfig extends MonteCarloConfig {
  oosPercent: number;
  minTrades: number;
  lowFrequencyOverride: boolean;
}

export interface GateResult {
  id: string;
  label: string;
  status: Health;
  value: string;
  explanation: string;
}

export interface Evaluation {
  all: Metrics;
  is: Metrics;
  oos: Metrics;
  oosStartIndex: number;
  monteCarlo: MonteCarloResult;
  gates: GateResult[];
  quality: GateResult[];
  verdict: Verdict;
  qualityPassed: number;
  warnings: string[];
  stressedMetrics: Metrics | null;
}
