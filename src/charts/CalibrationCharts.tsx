import { Bar, Line } from "react-chartjs-2";
import type { CalibrationAnalysis } from "../core/calibration";

const options = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: "index" as const },
  plugins: { legend: { display: false }, tooltip: { backgroundColor: "#111615", titleColor: "#f4f7f4", bodyColor: "#c3cbc6", borderColor: "#39423d", borderWidth: 1 } },
  scales: { x: { grid: { display: false }, ticks: { color: "#7f8b84", maxTicksLimit: 8 } }, y: { grid: { color: "rgba(127,139,132,.14)" }, ticks: { color: "#7f8b84" } } },
};

export function CalibrationEquityChart({ analysis }: { analysis: CalibrationAnalysis }) {
  return <Line options={options} data={{ labels: analysis.curve.map((point) => point.label), datasets: [{ data: analysis.curve.map((point) => point.equityR), borderColor: "#55d99f", backgroundColor: "rgba(85,217,159,.10)", fill: true, pointRadius: 3, pointBackgroundColor: "#55d99f", borderWidth: 2, tension: 0.16 }] }} />;
}

export function CalibrationDrawdownChart({ analysis }: { analysis: CalibrationAnalysis }) {
  return <Line options={options} data={{ labels: analysis.curve.map((point) => point.label), datasets: [{ data: analysis.curve.map((point) => point.drawdownR), borderColor: "#f06f67", backgroundColor: "rgba(240,111,103,.14)", fill: true, pointRadius: 2, borderWidth: 1.5 }] }} />;
}

export function CalibrationOutcomeChart({ analysis }: { analysis: CalibrationAnalysis }) {
  const labels = ["TP", "SL", "Pending", "Ambiguous", "Expired"];
  const values = [analysis.outcomes.TP_FIRST, analysis.outcomes.SL_FIRST, analysis.outcomes.PENDING, analysis.outcomes.AMBIGUOUS, analysis.outcomes.TIME_EXPIRED];
  return <Bar options={options} data={{ labels, datasets: [{ data: values, backgroundColor: ["#55d99f", "#f06f67", "#f2c14e", "#70aed8", "#89958e"], borderWidth: 0 }] }} />;
}

export function CalibrationRegimeChart({ analysis }: { analysis: CalibrationAnalysis }) {
  return <Bar options={{ ...options, plugins: { ...options.plugins, legend: { display: true, labels: { color: "#9aa69f", boxWidth: 10 } } }, scales: { ...options.scales, x: { ...options.scales.x, stacked: true }, y: { ...options.scales.y, stacked: true } } }} data={{ labels: analysis.regimes.map((item) => item.label), datasets: [{ label: "TP", data: analysis.regimes.map((item) => item.tp), backgroundColor: "#55d99f" }, { label: "SL", data: analysis.regimes.map((item) => item.sl), backgroundColor: "#f06f67" }, { label: "Pending", data: analysis.regimes.map((item) => item.pending), backgroundColor: "#f2c14e" }] }} />;
}
