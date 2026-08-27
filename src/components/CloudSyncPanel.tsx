import { Cloud, CloudDownload, CloudUpload, LogIn, LogOut, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import type { CloudRunSummary } from "../data/cloud";
import type { Language } from "../i18n/strings";

interface Props {
  language: Language;
  configured: boolean;
  userEmail: string | null;
  runs: CloudRunSummary[];
  busy: boolean;
  notice: string;
  canSave: boolean;
  onSignIn: (email: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onSave: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onLoad: (runId: string) => Promise<void>;
  onDelete: (runId: string) => Promise<void>;
}

export function CloudSyncPanel(props: Props) {
  const [email, setEmail] = useState("");
  const th = props.language === "th";
  const money = (value: number) => `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return <section className="cloud-sync band" aria-label={th ? "ซิงก์ข้อมูล" : "Cloud sync"}>
    <header className="cloud-sync__header">
      <Cloud size={19} />
      <div><strong>{th ? "ซิงก์ข้อมูลข้ามเครื่อง" : "Cross-device sync"}</strong><small>{props.userEmail ?? (th ? "เข้าสู่ระบบด้วยอีเมลเดียวกันบนคอมและ iPhone" : "Use the same email on desktop and iPhone")}</small></div>
      {props.userEmail && <span className="sync-state"><i />{th ? "เชื่อมต่อแล้ว" : "Connected"}</span>}
    </header>

    {!props.configured ? <p className="cloud-notice cloud-notice--error">{th ? "ยังไม่ได้ตั้งค่า Supabase ใน build นี้" : "Supabase is not configured in this build."}</p>
      : !props.userEmail ? <form className="cloud-auth" onSubmit={(event) => { event.preventDefault(); void props.onSignIn(email); }}>
        <label>{th ? "อีเมลสำหรับรับลิงก์เข้าสู่ระบบ" : "Email for magic link"}<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        <button className="button" disabled={props.busy}><LogIn size={17} />{th ? "ส่งลิงก์เข้าสู่ระบบ" : "Send magic link"}</button>
      </form>
      : <>
        <div className="cloud-actions">
          <button className="button" disabled={!props.canSave || props.busy} onClick={() => void props.onSave()}><CloudUpload size={17} />{th ? "บันทึกชุดปัจจุบัน" : "Save current run"}</button>
          <button className="button button--quiet" disabled={props.busy} onClick={() => void props.onRefresh()}><RefreshCw size={17} />{th ? "รีเฟรช" : "Refresh"}</button>
          <button className="icon-button" title={th ? "ออกจากระบบ" : "Sign out"} disabled={props.busy} onClick={() => void props.onSignOut()}><LogOut size={17} /></button>
        </div>
        <div className="cloud-runs">
          {props.runs.length === 0 ? <p>{th ? "ยังไม่มีชุดข้อมูลบนคลาวด์" : "No cloud datasets yet."}</p> : props.runs.map((run) => <article key={run.id}>
            <div><strong>{run.sourceName}</strong><small>{new Date(run.createdAt).toLocaleString(th ? "th-TH" : "en-US")} · {run.tradeCount} {th ? "ไม้" : "trades"}</small></div>
            <span className={`cloud-verdict cloud-verdict--${run.verdict.toLowerCase().replaceAll(" ", "-").replace("/", "-")}`}>{run.verdict}</span>
            <span className={run.netProfit >= 0 ? "positive" : "negative"}>{money(run.netProfit)}</span>
            <button className="icon-button" title={th ? "โหลดชุดนี้" : "Load run"} disabled={props.busy} onClick={() => void props.onLoad(run.id)}><CloudDownload size={17} /></button>
            <button className="icon-button danger" title={th ? "ลบจากคลาวด์" : "Delete cloud run"} disabled={props.busy} onClick={() => void props.onDelete(run.id)}><Trash2 size={17} /></button>
          </article>)}
        </div>
      </>}
    {props.notice && <p className="cloud-notice" role="status">{props.notice}</p>}
  </section>;
}
