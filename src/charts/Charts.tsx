import {
  BarController, BarElement, CategoryScale, Chart as ChartJS, Filler, LinearScale, LineController, LineElement, PointElement, Tooltip,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import type { Evaluation } from "../types";

ChartJS.register(BarController, BarElement, CategoryScale, Filler, LinearScale, LineController, LineElement, PointElement, Tooltip);

const options = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: "index" as const },
  plugins: { legend: { display: false }, tooltip: { backgroundColor: "#111615", titleColor: "#f4f7f4", bodyColor: "#c3cbc6", borderColor: "#39423d", borderWidth: 1 } },
  scales: { x: { grid: { display: false }, ticks: { color: "#7f8b84", maxTicksLimit: 7 } }, y: { grid: { color: "rgba(127,139,132,.14)" }, ticks: { color: "#7f8b84" } } },
};

export function EquityChart({ evaluation }: { evaluation: Evaluation }) {
  const curve = evaluation.all.equityCurve;
  return <Line options={options} data={{ labels: curve.map((point) => point.date.slice(0, 10)), datasets: [{ data: curve.map((point) => point.equity), borderColor: "#55d99f", backgroundColor: "rgba(85,217,159,.10)", fill: true, pointRadius: 0, borderWidth: 2, tension: 0.18 }] }} />;
}

export function DrawdownChart({ evaluation }: { evaluation: Evaluation }) {
  const curve = evaluation.all.equityCurve;
  return <Line options={{ ...options, scales: { ...options.scales, y: { ...options.scales.y, reverse: true } } }} data={{ labels: curve.map((point) => point.date.slice(0, 10)), datasets: [{ data: curve.map((point) => -point.drawdownPercent), borderColor: "#f06f67", backgroundColor: "rgba(240,111,103,.14)", fill: true, pointRadius: 0, borderWidth: 1.5 }] }} />;
}

export function MonteCarloChart({ evaluation }: { evaluation: Evaluation }) {
  const labels = evaluation.monteCarlo.paths[0]?.map((_, index) => index) ?? [];
  return <Line options={options} data={{ labels, datasets: evaluation.monteCarlo.paths.slice(0, 50).map((path, index) => ({ data: path, borderColor: index === 0 ? "#f2c14e" : "rgba(112,174,216,.16)", pointRadius: 0, borderWidth: index === 0 ? 1.5 : 1 })) }} />;
}

export function DistributionChart({ evaluation }: { evaluation: Evaluation }) {
  const values = evaluation.monteCarlo.terminalEquities;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = Math.max(1, (max - min) / 18);
  const bins = Array.from({ length: 18 }, () => 0);
  values.forEach((value) => { bins[Math.min(17, Math.floor((value - min) / width))] += 1; });
  return <Bar options={options} data={{ labels: bins.map((_, index) => Math.round(min + index * width).toLocaleString()), datasets: [{ data: bins, backgroundColor: "#70aed8", borderWidth: 0 }] }} />;
}

export function IsoosChart({ evaluation }: { evaluation: Evaluation }) {
  return <Bar options={{ ...options, plugins: { ...options.plugins, legend: { display: true, labels: { color: "#9aa69f", boxWidth: 10 } } } }} data={{ labels: ["Expectancy", "Profit Factor", "Win Rate ×10", "Sortino"], datasets: [{ label: "IS", data: [evaluation.is.expectancy, evaluation.is.profitFactor ?? 0, evaluation.is.winRate * 10, evaluation.is.sortino ?? 0], backgroundColor: "#70aed8" }, { label: "OOS", data: [evaluation.oos.expectancy, evaluation.oos.profitFactor ?? 0, evaluation.oos.winRate * 10, evaluation.oos.sortino ?? 0], backgroundColor: "#f2c14e" }] }} />;
}
