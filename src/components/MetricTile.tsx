import type { Health } from "../types";

export function MetricTile({ label, value, note, health = "pass" }: { label: string; value: string; note: string; health?: Health }) {
  return <article className={`metric metric--${health}`}><span className="metric__label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
