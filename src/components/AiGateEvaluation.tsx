import { BrainCircuit, RefreshCw } from "lucide-react";
import type { CalibrationEvidence, CalibrationLayer } from "../data/calibration";
import type { Language } from "../i18n/strings";

interface Props {
  language: Language;
  signedIn: boolean;
  evidence: CalibrationEvidence | null;
  loading: boolean;
  error: string;
  onRefresh: () => Promise<void>;
}

const rValue = (value: number | null) => value === null ? "N/A" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;

export function AiGateEvaluation(props: Props) {
  const th = props.language === "th";
  const evidence = props.evidence;
  const level = evidence?.episodeLevel;
  const layers: Array<[string, CalibrationLayer | undefined]> = [
    [th ? "Scanner ทั้งหมด" : "Scanner baseline", level?.scanner],
    [th ? "ผ่าน Hard Filter" : "Hard-filter pass", level?.hard_filter],
    [th ? "AI อนุมัติ" : "AI-approved", level?.ai_gate],
  ];
  const reasons = Object.entries(level?.reject_reasons ?? {}).sort((a, b) => b[1] - a[1]);

  return <section className="ai-eval band" id="ai-evaluation" aria-label={th ? "ประเมิน AI Gate" : "AI gate evaluation"}>
    <header className="ai-eval__header">
      <BrainCircuit size={20} />
      <div>
        <strong>{th ? "หลักฐาน AI Gate" : "AI Gate Evidence"}</strong>
        <small>{th ? "ตัดสินจาก Market Episode เป็นหลัก เพื่อลดการนับ Setup ซ้ำ" : "Market episodes are primary to avoid counting repeated setups as independent evidence."}</small>
      </div>
      {props.signedIn && <button className="icon-button" title={th ? "รีเฟรชหลักฐาน" : "Refresh evidence"} disabled={props.loading} onClick={() => void props.onRefresh()}><RefreshCw size={17} /></button>}
    </header>

    {!props.signedIn ? <p className="ai-eval__notice">{th ? "เข้าสู่ระบบด้านบนเพื่อดูหลักฐานที่ Anna ซิงก์อัตโนมัติ" : "Sign in above to view Anna's automatically synced evidence."}</p>
      : props.error ? <p className="ai-eval__notice negative">{props.error}</p>
      : !evidence ? <p className="ai-eval__notice">{props.loading ? (th ? "กำลังโหลดหลักฐาน..." : "Loading evidence...") : (th ? "ยังไม่มีข้อมูลจาก scanner" : "No scanner evidence yet.")}</p>
      : <>
        <div className="ai-eval__metrics">
          <div><span>{th ? "Candidate / Episode" : "Candidates / Episodes"}</span><strong>{evidence.candidateLevel.candidate_count} / {level?.episode_count ?? 0}</strong><small>{th ? "ใช้ Episode เป็นหน่วยหลัก" : "Episodes are the primary unit"}</small></div>
          <div><span>{th ? "หลบขาดทุน" : "Losses avoided"}</span><strong className="positive">{level?.ai_avoided_losses ?? 0}</strong><small>{th ? "REJECT แล้ว SL ถึงก่อน" : "Rejected, then SL hit first"}</small></div>
          <div><span>{th ? "พลาดกำไร" : "Winners missed"}</span><strong className={(level?.ai_missed_winners ?? 0) > 0 ? "negative" : "positive"}>{level?.ai_missed_winners ?? 0}</strong><small>{th ? "REJECT แล้ว TP ถึงก่อน" : "Rejected, then TP hit first"}</small></div>
          <div><span>{th ? "มูลค่า AI สุทธิ" : "AI net value"}</span><strong className={(level?.ai_net_value_r ?? 0) >= 0 ? "positive" : "negative"}>{rValue(level?.ai_net_value_r ?? 0)}</strong><small>{th ? "จากผลที่ตัดสินได้เท่านั้น" : "Resolved outcomes only"}</small></div>
          <div><span>{th ? "รอผล / กำกวม" : "Pending / Ambiguous"}</span><strong>{level?.pending ?? 0} / {level?.ambiguous ?? 0}</strong><small>{th ? "ไม่นับเข้า expectancy" : "Excluded from expectancy"}</small></div>
        </div>

        <div className="ai-eval__body">
          <div className="ai-eval__layers">
            <h3>{th ? "เทียบแต่ละชั้น" : "Layer comparison"}</h3>
            {layers.map(([label, layer]) => <div className="ai-layer" key={label}>
              <strong>{label}</strong><span>{layer?.resolved ?? 0} {th ? "ผล" : "resolved"}</span><b className={(layer?.expectancy_r ?? 0) >= 0 ? "positive" : "negative"}>{rValue(layer?.expectancy_r ?? null)}</b>
              <small>{layer?.wins ?? 0} TP / {layer?.losses ?? 0} SL</small>
            </div>)}
          </div>
          <div className="ai-eval__reasons">
            <h3>{th ? "เหตุผล Reject ระดับ Episode" : "Episode reject reasons"}</h3>
            {reasons.length === 0 ? <p>{th ? "ยังไม่มี" : "None yet"}</p> : reasons.map(([reason, count]) => <div key={reason}><span>{reason.replaceAll("_", " ")}</span><b>{count}</b></div>)}
          </div>
        </div>

        <div className="ai-eval__table table-wrap">
          <table><thead><tr><th>Signal</th><th>{th ? "เวลา" : "Time"}</th><th>Setup</th><th>AI</th><th>Shadow</th><th>R</th></tr></thead>
          <tbody>{evidence.candidates.slice(0, 30).map((candidate) => <tr key={candidate.signal_id}>
            <td>#{candidate.signal_id}{candidate.is_duplicate ? <small className="duplicate-tag">DUP</small> : <small className="episode-tag">EP</small>}</td>
            <td>{new Date(candidate.created_at).toLocaleString(th ? "th-TH" : "en-US", { dateStyle: "short", timeStyle: "short" })}</td>
            <td>{candidate.regime} {candidate.direction}</td>
            <td>{candidate.ai_reused ? "REUSED REJECT" : candidate.ai_final_action ?? "N/A"}</td>
            <td>{candidate.shadow_status ?? "PENDING"}</td>
            <td className={(candidate.hypothetical_r ?? 0) >= 0 ? "positive" : "negative"}>{rValue(candidate.hypothetical_r)}</td>
          </tr>)}</tbody></table>
        </div>
        <footer>{th ? "ซิงก์ล่าสุด" : "Last sync"}: {new Date(evidence.syncedAt).toLocaleString(th ? "th-TH" : "en-US")}</footer>
      </>}
  </section>;
}
