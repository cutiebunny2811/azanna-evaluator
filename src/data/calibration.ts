import { supabase } from "../lib/supabase";

export interface CalibrationLayer {
  candidates: number;
  resolved: number;
  wins: number;
  losses: number;
  total_r: number;
  expectancy_r: number | null;
}

export interface CalibrationLevel {
  candidate_count: number;
  episode_count: number;
  pending: number;
  ambiguous: number;
  time_expired: number;
  ai_avoided_losses: number;
  ai_missed_winners: number;
  ai_net_value_r: number;
  reject_reasons: Record<string, number>;
  scanner: CalibrationLayer;
  hard_filter: CalibrationLayer;
  ai_gate: CalibrationLayer;
}

export interface CalibrationCandidate {
  signal_id: number;
  created_at: string;
  symbol: string;
  timeframe: string;
  regime: string;
  direction: string;
  signal_status: string;
  episode_key: string;
  is_duplicate: boolean;
  ai_final_action: string | null;
  ai_reused: boolean;
  rejection_reason_codes: string[];
  shadow_status: string | null;
  hypothetical_r: number | null;
}

export interface CalibrationEvidence {
  installationId: string;
  generatedAt: string;
  syncedAt: string;
  candidateLevel: CalibrationLevel;
  episodeLevel: CalibrationLevel;
  candidates: CalibrationCandidate[];
}

export async function loadCalibrationEvidence(): Promise<CalibrationEvidence | null> {
  if (!supabase) throw new Error("Cloud sync is not configured");
  const { data: states, error: stateError } = await supabase
    .from("azanna_calibration_state")
    .select("installation_id, summary, generated_at, synced_at")
    .order("synced_at", { ascending: false })
    .limit(1);
  if (stateError) throw stateError;
  const state = states?.[0];
  if (!state) return null;
  const { data: rows, error: candidateError } = await supabase
    .from("azanna_calibration_candidates")
    .select("payload")
    .eq("installation_id", state.installation_id)
    .order("candidate_at", { ascending: false })
    .limit(500);
  if (candidateError) throw candidateError;
  const summary = state.summary as { candidate_level: CalibrationLevel; episode_level: CalibrationLevel };
  return {
    installationId: state.installation_id,
    generatedAt: state.generated_at,
    syncedAt: state.synced_at,
    candidateLevel: summary.candidate_level,
    episodeLevel: summary.episode_level,
    candidates: (rows ?? []).map((row) => row.payload as CalibrationCandidate),
  };
}
