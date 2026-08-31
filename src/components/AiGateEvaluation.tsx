import { BrainCircuit, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { CalibrationDrawdownChart, CalibrationEquityChart, CalibrationOutcomeChart, CalibrationRegimeChart } from "../charts/CalibrationCharts";
import { analyzeCalibration } from "../core/calibration";
import type { CalibrationEvidence, CalibrationLayer } from "../data/calibration";
import type { Language } from "../i18n/strings";

interface Props {
  language: Language;
  signedIn: boolean;
  evidence: CalibrationEvidence | null;
  loading: boolean;
  error: string;
  anchorMode: boolean;
  onRefresh: () => Promise<void>;
}

const rValue = (value: number | null) => value === null ? "N/A" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;

export function AiGateEvaluation(props: Props) {
  const th = props.language === "th";
  const evidence = props.evidence;
  const level = evidence?.episodeLevel;
  const analysis = evidence ? analyzeCalibration(evidence) : null;
  const missingShadow = level?.missing_shadow ?? analysis?.outcomes.MISSING ?? 0;
  const anchors = {
    performance: props.anchorMode ? "performance" : "ai-performance",
    risk: props.anchorMode ? "risk" : "ai-risk",
    validation: props.anchorMode ? "validation" : "ai-validation",
    deployment: props.anchorMode ? "deployment" : "ai-deployment",
    trades: props.anchorMode ? "trades" : "ai-trades",
  };
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
        <div className="ai-eval__metrics" id={anchors.performance}>
          <div><span>{th ? "Candidate / Episode" : "Candidates / Episodes"}</span><strong>{evidence.candidateLevel.candidate_count} / {level?.episode_count ?? 0}</strong><small>{th ? "ใช้ Episode เป็นหน่วยหลัก" : "Episodes are the primary unit"}</small></div>
          <div><span>{th ? "หลบขาดทุน" : "Losses avoided"}</span><strong className="positive">{level?.ai_avoided_losses ?? 0}</strong><small>{th ? "REJECT แล้ว SL ถึงก่อน" : "Rejected, then SL hit first"}</small></div>
          <div><span>{th ? "พลาดกำไร" : "Winners missed"}</span><strong className={(level?.ai_missed_winners ?? 0) > 0 ? "negative" : "positive"}>{level?.ai_missed_winners ?? 0}</strong><small>{th ? "REJECT แล้ว TP ถึงก่อน" : "Rejected, then TP hit first"}</small></div>
          <div><span>{th ? "มูลค่า AI สุทธิ" : "AI net value"}</span><strong className={(level?.ai_net_value_r ?? 0) >= 0 ? "positive" : "negative"}>{rValue(level?.ai_net_value_r ?? 0)}</strong><small>{th ? "จากผลที่ตัดสินได้เท่านั้น" : "Resolved outcomes only"}</small></div>
          <div><span>{th ? "รอผล / ไม่มี Shadow / กำกวม" : "Pending / Missing / Ambiguous"}</span><strong>{level?.pending ?? 0} / {missingShadow} / {level?.ambiguous ?? 0}</strong><small>{th ? "ไม่นับเข้า expectancy" : "Excluded from expectancy"}</small></div>
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

        {analysis && <>
          <section className="calibration-charts chart-grid band" aria-label={th ? "กราฟผล Shadow" : "Shadow performance charts"}>
            <figure className="chart chart--wide"><figcaption><span>{th ? "ผลสะสมระดับ Episode" : "Episode cumulative result"}</span><b>{rValue(analysis.curve.at(-1)?.equityR ?? 0)}</b></figcaption><div><CalibrationEquityChart analysis={analysis} /></div></figure>
            <figure className="chart"><figcaption><span>{th ? "Drawdown สมมติ" : "Hypothetical drawdown"}</span><b>-{analysis.maxDrawdownR.toFixed(2)}R</b></figcaption><div><CalibrationDrawdownChart analysis={analysis} /></div></figure>
            <figure className="chart"><figcaption><span>{th ? "การกระจายผล" : "Outcome distribution"}</span><b>{analysis.resolved.length}/{analysis.episodes.length} {th ? "จบผล" : "resolved"}</b></figcaption><div><CalibrationOutcomeChart analysis={analysis} /></div></figure>
          </section>

          <section className="calibration-risk band" id={anchors.risk}>
            <header className="section-heading"><span>R</span><div><h2>{th ? "ความเสี่ยงจาก Shadow" : "Shadow Risk"}</h2><p>{th ? "วัดเป็นหน่วย R จาก Episode ไม่ใช่เงินจริงหรือบัญชี MT5" : "Measured in R per episode, not actual MT5 account equity."}</p></div></header>
            <div className="calibration-risk__metrics">
              <div><span>MAX DRAWDOWN</span><strong className="negative">-{analysis.maxDrawdownR.toFixed(2)}R</strong><small>{th ? "จากลำดับผลที่เกิดจริง" : "Observed sequence"}</small></div>
              <div><span>{th ? "แพ้ติดต่อกันสูงสุด" : "MAX LOSS STREAK"}</span><strong className="negative">{analysis.maxConsecutiveLosses}</strong><small>Episode</small></div>
              <div><span>{th ? "อัตรา SL" : "SL RATE"}</span><strong className="negative">{(analysis.lossRate * 100).toFixed(1)}%</strong><small>{analysis.outcomes.SL_FIRST}/{analysis.resolved.length} {th ? "ผลที่จบ" : "resolved"}</small></div>
              <div><span>{th ? "ความครอบคลุมผล" : "OUTCOME COVERAGE"}</span><strong>{(analysis.outcomeCoverage * 100).toFixed(1)}%</strong><small>{analysis.resolved.length}/{analysis.episodes.length} Episode</small></div>
            </div>
          </section>

          <section className="calibration-validation band" id={anchors.validation}>
            <header className="section-heading"><span>V</span><div><h2>{th ? "การทดสอบและคุณภาพ Sample" : "Validation & Sample Quality"}</h2><p>{th ? "แสดงความซ้ำ ความครบของผล และโครงสร้าง Regime ที่มีจริง" : "Observed duplication, outcome coverage, and regime mix."}</p></div></header>
            <div className="calibration-validation__body">
              <div className="calibration-validation__metrics">
                <div><span>{th ? "Candidate ซ้ำ" : "DUPLICATE RATE"}</span><strong>{(analysis.duplicateRate * 100).toFixed(1)}%</strong><small>{evidence.candidateLevel.candidate_count - analysis.episodes.length} {th ? "แถวไม่นับเป็น Sample อิสระ" : "rows excluded as independent samples"}</small></div>
                <div><span>{th ? "ผลกำกวม" : "AMBIGUOUS"}</span><strong>{analysis.outcomes.AMBIGUOUS}</strong><small>{th ? "ไม่รวมใน Expectancy" : "Excluded from expectancy"}</small></div>
                <div><span>{th ? "หมดเวลาก่อนแตะ" : "TIME EXPIRED"}</span><strong>{analysis.outcomes.TIME_EXPIRED}</strong><small>{th ? "ไม่จัดเป็น TP หรือ SL" : "Neither TP nor SL"}</small></div>
                <div><span>{th ? "ไม่มี Shadow record" : "MISSING SHADOW"}</span><strong>{analysis.outcomes.MISSING}</strong><small>{th ? "ตรวจ pipeline แยกจาก Pending" : "Pipeline gap, not pending market data"}</small></div>
              </div>
              <figure className="calibration-regime-chart"><figcaption><span>{th ? "ผลตาม Regime / Direction" : "Regime / Direction outcomes"}</span><b>{analysis.regimes.length} SETUPS</b></figcaption><div><CalibrationRegimeChart analysis={analysis} /></div></figure>
            </div>
          </section>

          <section className="calibration-readiness band" id={anchors.deployment}>
            <header className="section-heading"><span>D</span><div><h2>{th ? "ความพร้อมของหลักฐาน" : "Evidence Readiness"}</h2><p>{th ? "ยังไม่อนุญาตให้สรุประยะยาวจนผ่าน Sample gates" : "Long-run conclusions remain blocked until sample gates pass."}</p></div></header>
            <div className="calibration-readiness__summary"><strong>{analysis.gates.filter((gate) => gate.passed).length}/{analysis.gates.length}</strong><span>{th ? "ผ่านแล้ว" : "gates passed"}</span><b>{th ? "กำลังเก็บข้อมูล" : "COLLECTING"}</b></div>
            <div className="calibration-gates">{analysis.gates.map((gate) => {
              const labels: Record<string, [string, string]> = {
                episodes: ["Episode อิสระอย่างน้อย 30", "At least 30 independent episodes"],
                resolved: ["ผลที่จบแล้วอย่างน้อย 30", "At least 30 resolved outcomes"],
                approved: ["AI APPROVE ที่จบผลอย่างน้อย 10", "At least 10 resolved AI approvals"],
                coverage: ["Outcome coverage อย่างน้อย 80%", "At least 80% outcome coverage"],
                ambiguity: ["ผลกำกวมไม่เกิน 10%", "Ambiguity no higher than 10%"],
              };
              const percent = gate.id === "coverage" || gate.id === "ambiguity";
              return <div className={`calibration-gate calibration-gate--${gate.passed ? "pass" : "fail"}`} key={gate.id}>
                {gate.passed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                <strong>{labels[gate.id][th ? 0 : 1]}</strong>
                <span>{gate.current}{percent ? "%" : ""} / {gate.target}{percent ? "%" : ""}</span>
              </div>;
            })}</div>
          </section>
        </>}

        <div className="ai-eval__table table-wrap" id={anchors.trades}>
          <table><thead><tr><th>Signal</th><th>{th ? "เวลา" : "Time"}</th><th>Setup</th><th>AI</th><th>Shadow</th><th>R</th></tr></thead>
          <tbody>{evidence.candidates.slice(0, 30).map((candidate) => <tr key={candidate.signal_id}>
            <td>#{candidate.signal_id}{candidate.is_duplicate ? <small className="duplicate-tag">DUP</small> : <small className="episode-tag">EP</small>}</td>
            <td>{new Date(candidate.created_at).toLocaleString(th ? "th-TH" : "en-US", { dateStyle: "short", timeStyle: "short" })}</td>
            <td>{candidate.regime} {candidate.direction}</td>
            <td>{candidate.ai_reused ? "REUSED REJECT" : candidate.ai_final_action ?? "N/A"}</td>
            <td>{candidate.shadow_status ?? "NO_SHADOW"}</td>
            <td className={(candidate.hypothetical_r ?? 0) >= 0 ? "positive" : "negative"}>{rValue(candidate.hypothetical_r)}</td>
          </tr>)}</tbody></table>
        </div>
        <footer>{th ? "ซิงก์ล่าสุด" : "Last sync"}: {new Date(evidence.syncedAt).toLocaleString(th ? "th-TH" : "en-US")}</footer>
      </>}
  </section>;
}
