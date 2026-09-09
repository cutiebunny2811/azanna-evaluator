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
  missing_shadow?: number;
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
  historyCandidates?: CalibrationCandidate[];
}

export interface CalibrationInstallation {
  installationId: string;
  generatedAt: string;
  syncedAt: string;
  candidateCount: number;
  episodeCount: number;
}

interface CalibrationStateRow {
  installation_id: string;
  summary: { candidate_level: CalibrationLevel; episode_level: CalibrationLevel };
  generated_at: string;
  synced_at: string;
}

const HISTORY_PAGE_SIZE = 500;

async function loadCandidateHistory(installationId: string): Promise<CalibrationCandidate[]> {
  if (!supabase) return [];
  const candidates: CalibrationCandidate[] = [];

  for (let offset = 0; ; offset += HISTORY_PAGE_SIZE) {
    const { data: rows, error } = await supabase
      .from("azanna_calibration_candidates")
      .select("payload")
      .eq("installation_id", installationId)
      .order("candidate_at", { ascending: false })
      .order("signal_id", { ascending: false })
      .range(offset, offset + HISTORY_PAGE_SIZE - 1);
    if (error) throw error;

    const page = (rows ?? []).map((row) => row.payload as CalibrationCandidate);
    candidates.push(...page);
    if (page.length < HISTORY_PAGE_SIZE) break;
  }

  return candidates;
}

export function calibrationInstallationLabel(installationId: string): string {
  const normalized = installationId.toLowerCase();
  if (normalized.includes("karina") || normalized.includes("gold")) return "Karina / XAUUSDm";
  if (normalized.includes("anna") || normalized.includes("btc")) return "Anna / BTCUSDm";
  return installationId;
}

export async function listCalibrationInstallations(): Promise<CalibrationInstallation[]> {
  if (!supabase) throw new Error("Cloud sync is not configured");
  const { data: states, error: stateError } = await supabase
    .from("azanna_calibration_state")
    .select("installation_id, summary, generated_at, synced_at")
    .order("synced_at", { ascending: false });
  if (stateError) throw stateError;

  return ((states ?? []) as CalibrationStateRow[]).map((state) => ({
    installationId: state.installation_id,
    generatedAt: state.generated_at,
    syncedAt: state.synced_at,
    candidateCount: state.summary.candidate_level?.candidate_count ?? 0,
    episodeCount: state.summary.episode_level?.episode_count ?? 0,
  }));
}

export async function loadCalibrationEvidence(installationId: string): Promise<CalibrationEvidence | null> {
  if (!supabase) throw new Error("Cloud sync is not configured");
  const { data: states, error: stateError } = await supabase
    .from("azanna_calibration_state")
    .select("installation_id, summary, generated_at, synced_at")
    .eq("installation_id", installationId)
    .limit(1);
  if (stateError) throw stateError;
  const state = states?.[0] as CalibrationStateRow | undefined;
  if (!state) return null;
  const summary = state.summary;
  const historyCandidates = await loadCandidateHistory(state.installation_id);
  return {
    installationId: state.installation_id,
    generatedAt: state.generated_at,
    syncedAt: state.synced_at,
    candidateLevel: summary.candidate_level,
    episodeLevel: summary.episode_level,
    candidates: historyCandidates.slice(0, summary.candidate_level.candidate_count),
    historyCandidates,
  };
}
