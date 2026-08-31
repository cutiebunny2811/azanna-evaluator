import { describe, expect, it } from "vitest";
import { analyzeCalibration } from "../core/calibration";
import type { CalibrationCandidate, CalibrationEvidence, CalibrationLevel } from "../data/calibration";

const layer = { candidates: 0, resolved: 0, wins: 0, losses: 0, total_r: 0, expectancy_r: null };
const level: CalibrationLevel = { candidate_count: 4, episode_count: 3, pending: 0, missing_shadow: 0, ambiguous: 0, time_expired: 0, ai_avoided_losses: 2, ai_missed_winners: 0, ai_net_value_r: 2, reject_reasons: {}, scanner: layer, hard_filter: layer, ai_gate: layer };

const candidate = (signal: number, status: string | null, r: number | null, duplicate = false): CalibrationCandidate => ({
  signal_id: signal,
  created_at: `2026-08-28T00:0${signal}:00Z`,
  symbol: "BTCUSDm",
  timeframe: "M5",
  regime: "RANGE",
  direction: "SHORT",
  signal_status: "AI_REJECTED",
  episode_key: `ep-${duplicate ? 1 : signal}`,
  is_duplicate: duplicate,
  ai_final_action: "REJECT",
  ai_reused: duplicate,
  rejection_reason_codes: [],
  shadow_status: status,
  hypothetical_r: r,
});

describe("calibration analysis", () => {
  it("uses independent episodes and calculates R drawdown", () => {
    const evidence: CalibrationEvidence = {
      installationId: "anna-local",
      generatedAt: "2026-08-28T00:10:00Z",
      syncedAt: "2026-08-28T00:10:00Z",
      candidateLevel: level,
      episodeLevel: level,
      candidates: [
        candidate(1, "SL_FIRST", -1),
        candidate(2, "SL_FIRST", -1, true),
        candidate(3, "TP_FIRST", 2),
        candidate(4, "SL_FIRST", -1),
      ],
    };
    const result = analyzeCalibration(evidence);
    expect(result.episodes).toHaveLength(3);
    expect(result.curve.map((point) => point.equityR)).toEqual([-1, 1, 0]);
    expect(result.maxDrawdownR).toBe(1);
    expect(result.maxConsecutiveLosses).toBe(1);
    expect(result.duplicateRate).toBe(0.25);
    expect(result.outcomeCoverage).toBe(1);
  });

  it("separates pending outcomes from missing shadow records", () => {
    const evidence: CalibrationEvidence = {
      installationId: "anna-local",
      generatedAt: "2026-08-28T00:10:00Z",
      syncedAt: "2026-08-28T00:10:00Z",
      candidateLevel: { ...level, candidate_count: 5, episode_count: 5, pending: 1, missing_shadow: 1 },
      episodeLevel: { ...level, candidate_count: 5, episode_count: 5, pending: 1, missing_shadow: 1 },
      candidates: [
        candidate(1, "SL_FIRST", -1),
        candidate(2, "TP_FIRST", 1.5),
        candidate(3, "SL_FIRST", -1),
        candidate(4, "PENDING", null),
        candidate(5, null, null),
      ],
    };

    const result = analyzeCalibration(evidence);
    expect(result.resolved).toHaveLength(3);
    expect(result.outcomes.PENDING).toBe(1);
    expect(result.outcomes.MISSING).toBe(1);
    expect(result.outcomeCoverage).toBe(0.6);
  });
});
