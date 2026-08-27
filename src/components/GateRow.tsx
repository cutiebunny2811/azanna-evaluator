import { Check, CircleAlert, Minus, X } from "lucide-react";
import type { GateResult } from "../types";

export function GateRow({ gate, statusLabel }: { gate: GateResult; statusLabel: string }) {
  const Icon = gate.status === "pass" ? Check : gate.status === "fail" ? X : gate.status === "warn" ? CircleAlert : Minus;
  return <div className={`gate gate--${gate.status}`}><span className="gate__icon"><Icon size={16} /></span><div className="gate__body"><strong>{gate.label}</strong><p>{gate.explanation}</p></div><div className="gate__result"><span>{statusLabel}</span><b>{gate.value}</b></div></div>;
}
