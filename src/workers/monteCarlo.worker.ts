/// <reference lib="webworker" />
import { runMonteCarlo } from "../core/monteCarlo";
import type { MonteCarloConfig } from "../types";

self.onmessage = (event: MessageEvent<{ pnl: number[]; initialEquity: number; config: MonteCarloConfig }>) => {
  const { pnl, initialEquity, config } = event.data;
  self.postMessage(runMonteCarlo(pnl, initialEquity, config));
};

export {};
