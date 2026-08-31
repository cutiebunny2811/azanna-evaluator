import type { CalibrationCandidate, CalibrationEvidence } from "../data/calibration";

export interface CalibrationPoint {
  label: string;
  equityR: number;
  drawdownR: number;
}

export interface CalibrationReadinessGate {
  id: string;
  passed: boolean;
  current: number;
  target: number;
}

export interface CalibrationAnalysis {
  episodes: CalibrationCandidate[];
  resolved: CalibrationCandidate[];
  curve: CalibrationPoint[];
  maxDrawdownR: number;
  maxConsecutiveLosses: number;
  outcomeCoverage: number;
  duplicateRate: number;
  lossRate: number;
  outcomes: Record<string, number>;
  regimes: Array<{ label: string; tp: number; sl: number; pending: number; missing: number }>;
  gates: CalibrationReadinessGate[];
}

export function analyzeCalibration(evidence: CalibrationEvidence): CalibrationAnalysis {
  const episodes = evidence.candidates
    .filter((candidate) => !candidate.is_duplicate)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const resolved = episodes.filter((candidate) => candidate.shadow_status === "SL_FIRST" || candidate.shadow_status === "TP_FIRST");
  let equityR = 0;
  let peakR = 0;
  let maxDrawdownR = 0;
  let lossStreak = 0;
  let maxConsecutiveLosses = 0;
  const curve = resolved.map((candidate) => {
    equityR += candidate.hypothetical_r ?? 0;
    peakR = Math.max(peakR, equityR);
    const drawdownR = equityR - peakR;
    maxDrawdownR = Math.min(maxDrawdownR, drawdownR);
    if (candidate.shadow_status === "SL_FIRST") {
      lossStreak += 1;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, lossStreak);
    } else {
      lossStreak = 0;
    }
    return {
      label: `#${candidate.signal_id}`,
      equityR: Number(equityR.toFixed(4)),
      drawdownR: Number(drawdownR.toFixed(4)),
    };
  });

  const outcomes: Record<string, number> = { TP_FIRST: 0, SL_FIRST: 0, PENDING: 0, MISSING: 0, AMBIGUOUS: 0, TIME_EXPIRED: 0 };
  const regimeMap = new Map<string, { label: string; tp: number; sl: number; pending: number; missing: number }>();
  for (const candidate of episodes) {
    const status = candidate.shadow_status ?? "MISSING";
    outcomes[status] = (outcomes[status] ?? 0) + 1;
    const label = `${candidate.regime} ${candidate.direction}`;
    const regime = regimeMap.get(label) ?? { label, tp: 0, sl: 0, pending: 0, missing: 0 };
    if (status === "TP_FIRST") regime.tp += 1;
    else if (status === "SL_FIRST") regime.sl += 1;
    else if (status === "MISSING") regime.missing += 1;
    else regime.pending += 1;
    regimeMap.set(label, regime);
  }
  const approvedResolved = resolved.filter((candidate) => candidate.ai_final_action === "APPROVE").length;
  const ambiguousRate = episodes.length ? (outcomes.AMBIGUOUS ?? 0) / episodes.length : 0;
  return {
    episodes,
    resolved,
    curve,
    maxDrawdownR: Math.abs(maxDrawdownR),
    maxConsecutiveLosses,
    outcomeCoverage: episodes.length ? resolved.length / episodes.length : 0,
    duplicateRate: evidence.candidateLevel.candidate_count ? 1 - episodes.length / evidence.candidateLevel.candidate_count : 0,
    lossRate: resolved.length ? (outcomes.SL_FIRST ?? 0) / resolved.length : 0,
    outcomes,
    regimes: [...regimeMap.values()].sort((a, b) => (b.tp + b.sl + b.pending) - (a.tp + a.sl + a.pending)),
    gates: [
      { id: "episodes", passed: episodes.length >= 30, current: episodes.length, target: 30 },
      { id: "resolved", passed: resolved.length >= 30, current: resolved.length, target: 30 },
      { id: "approved", passed: approvedResolved >= 10, current: approvedResolved, target: 10 },
      { id: "coverage", passed: episodes.length > 0 && resolved.length / episodes.length >= 0.8, current: Math.round((episodes.length ? resolved.length / episodes.length : 0) * 100), target: 80 },
      { id: "ambiguity", passed: ambiguousRate <= 0.1, current: Math.round(ambiguousRate * 100), target: 10 },
    ],
  };
}
