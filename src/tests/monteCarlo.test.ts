import { describe, expect, it } from "vitest";
import { runMonteCarlo } from "../core/monteCarlo";

describe("Monte Carlo", () => {
  it("is reproducible with a fixed seed", () => {
    const config = { simulations: 250, seed: 42, ruinThresholdPercent: 50, drawdownTolerancePercent: 20 };
    expect(runMonteCarlo([20, -10, 30, -15], 1000, config)).toEqual(runMonteCarlo([20, -10, 30, -15], 1000, config));
  });

  it("reports material ruin risk for oversized losses", () => {
    const result = runMonteCarlo([30, -600, 20, -500], 1000, { simulations: 500, seed: 7, ruinThresholdPercent: 50, drawdownTolerancePercent: 20 });
    expect(result.ruinProbability).toBeGreaterThan(0.5);
    expect(result.p95MaxDrawdown).toBeGreaterThan(20);
  });
});
