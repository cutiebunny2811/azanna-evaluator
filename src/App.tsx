import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BarChart3, CheckCircle2, Download, FileUp, FlaskConical, Languages, Moon, Settings2, ShieldCheck, Sun, Table2, Trash2, TrendingUp } from "lucide-react";
import { DistributionChart, DrawdownChart, EquityChart, IsoosChart, MonteCarloChart } from "./charts/Charts";
import { CloudSyncPanel } from "./components/CloudSyncPanel";
import { AiGateEvaluation } from "./components/AiGateEvaluation";
import { GateRow } from "./components/GateRow";
import { MetricTile } from "./components/MetricTile";
import { evaluate } from "./core/deployment";
import { inferInitialEquity } from "./core/drawdown";
import { buildMarkdownReport, downloadMarkdown } from "./core/report";
import { deleteCloudRun, listCloudRuns, loadCloudRun, saveCloudRun, type CloudRunSummary } from "./data/cloud";
import { loadCalibrationEvidence, type CalibrationEvidence } from "./data/calibration";
import { createDemoTrades } from "./data/demo";
import { readCsvFile } from "./data/csv";
import { clearCachedState, loadCachedState, saveCachedState } from "./data/localCache";
import { localizeGate, translator, type Language } from "./i18n/strings";
import { isCloudConfigured, supabase } from "./lib/supabase";
import type { Evaluation, EvaluationConfig, ImportResult, MonteCarloResult } from "./types";

const defaultConfig: EvaluationConfig = { oosPercent: 30, simulations: 1000, seed: 20260827, ruinThresholdPercent: 50, drawdownTolerancePercent: 20, minTrades: 100, lowFrequencyOverride: false };
const money = (value: number) => `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const ratio = (value: number | null) => value === null ? "N/A" : Number.isFinite(value) ? value.toFixed(2) : "∞";
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);

export default function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("azanna-language") as Language) || "th");
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("azanna-theme") as "dark" | "light") || "dark");
  const [config, setConfig] = useState<EvaluationConfig>(defaultConfig);
  const [dataset, setDataset] = useState<ImportResult | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [running, setRunning] = useState(false);
  const [cacheReady, setCacheReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [cloudRuns, setCloudRuns] = useState<CloudRunSummary[]>([]);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudNotice, setCloudNotice] = useState("");
  const [calibration, setCalibration] = useState<CalibrationEvidence | null>(null);
  const [calibrationBusy, setCalibrationBusy] = useState(false);
  const [calibrationError, setCalibrationError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const t = translator(language);

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("azanna-theme", theme); }, [theme]);
  useEffect(() => { document.documentElement.lang = language; localStorage.setItem("azanna-language", language); }, [language]);

  useEffect(() => {
    let active = true;
    loadCachedState()
      .then((cached) => {
        if (!active || !cached) return;
        setDataset(cached.dataset);
        setConfig(cached.config);
      })
      .finally(() => { if (active) setCacheReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!cacheReady) return;
    if (dataset) void saveCachedState(dataset, config);
    else void clearCachedState();
  }, [cacheReady, config, dataset]);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!dataset?.trades.length) { setEvaluation(null); return; }
    setRunning(true);
    const worker = new Worker(new URL("./workers/monteCarlo.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<MonteCarloResult>) => {
      setEvaluation(evaluate(dataset, config, event.data));
      setRunning(false);
      worker.terminate();
    };
    worker.onerror = () => { setRunning(false); worker.terminate(); };
    worker.postMessage({ pnl: dataset.trades.map((trade) => trade.netPnl), initialEquity: inferInitialEquity(dataset.trades), config });
    return () => worker.terminate();
  }, [dataset, config]);

  const loadDemo = useCallback(() => setDataset({ trades: createDemoTrades(), issues: [], sourceName: "Azanna demo / anna-v1" }), []);
  const importFile = async (file?: File) => { if (file) setDataset(await readCsvFile(file)); };
  const updateConfig = <K extends keyof EvaluationConfig>(key: K, value: EvaluationConfig[K]) => setConfig((current) => ({ ...current, [key]: value }));
  const statusText = (status: string) => status === "pass" ? t("pass") : status === "fail" ? t("fail") : status === "warn" ? t("warn") : t("na");
  const report = useMemo(() => dataset && evaluation ? buildMarkdownReport(dataset, evaluation, config, language) : "", [dataset, evaluation, config, language]);
  const cloudText = (thai: string, english: string) => language === "th" ? thai : english;

  const refreshCloudRuns = useCallback(async () => {
    if (!session) { setCloudRuns([]); return; }
    setCloudRuns(await listCloudRuns());
  }, [session]);

  const refreshCalibration = useCallback(async () => {
    if (!session) { setCalibration(null); return; }
    setCalibrationBusy(true);
    setCalibrationError("");
    try {
      setCalibration(await loadCalibrationEvidence());
    } catch (error) {
      setCalibrationError(errorText(error));
    } finally {
      setCalibrationBusy(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) { setCloudRuns([]); return; }
    void refreshCloudRuns().catch((error) => setCloudNotice(errorText(error)));
  }, [refreshCloudRuns, session]);

  useEffect(() => {
    if (!session) { setCalibration(null); return; }
    void refreshCalibration();
  }, [refreshCalibration, session]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => { void refreshCalibration(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [refreshCalibration, session]);

  const signInToCloud = async (email: string) => {
    if (!supabase) return;
    setCloudBusy(true);
    setCloudNotice("");
    try {
      const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).href;
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      if (error) throw error;
      setCloudNotice(cloudText("ส่งลิงก์เข้าสู่ระบบแล้ว กรุณาเปิดอีเมล", "Magic link sent. Check your email."));
    } catch (error) {
      setCloudNotice(errorText(error));
    } finally {
      setCloudBusy(false);
    }
  };

  const signOutOfCloud = async () => {
    if (!supabase) return;
    setCloudBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setCloudRuns([]);
      setCloudNotice(cloudText("ออกจากระบบแล้ว", "Signed out."));
    } catch (error) {
      setCloudNotice(errorText(error));
    } finally {
      setCloudBusy(false);
    }
  };

  const saveCurrentToCloud = async () => {
    if (!session || !dataset || !evaluation) return;
    setCloudBusy(true);
    setCloudNotice(cloudText("กำลังบันทึก...", "Saving..."));
    try {
      await saveCloudRun(session.user.id, dataset, evaluation, config);
      await refreshCloudRuns();
      setCloudNotice(cloudText("บันทึกขึ้นคลาวด์เรียบร้อย", "Saved to cloud."));
    } catch (error) {
      setCloudNotice(errorText(error));
    } finally {
      setCloudBusy(false);
    }
  };

  const loadFromCloud = async (runId: string) => {
    setCloudBusy(true);
    setCloudNotice(cloudText("กำลังโหลด...", "Loading..."));
    try {
      const loaded = await loadCloudRun(runId);
      setConfig(loaded.config);
      setDataset(loaded.dataset);
      setCloudNotice(cloudText("โหลดชุดข้อมูลแล้ว", "Cloud run loaded."));
    } catch (error) {
      setCloudNotice(errorText(error));
    } finally {
      setCloudBusy(false);
    }
  };

  const removeFromCloud = async (runId: string) => {
    if (!window.confirm(cloudText("ลบชุดข้อมูลนี้จากคลาวด์ถาวรหรือไม่?", "Permanently delete this cloud run?"))) return;
    setCloudBusy(true);
    try {
      await deleteCloudRun(runId);
      await refreshCloudRuns();
      setCloudNotice(cloudText("ลบชุดข้อมูลแล้ว", "Cloud run deleted."));
    } catch (error) {
      setCloudNotice(errorText(error));
    } finally {
      setCloudBusy(false);
    }
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand__mark">A</span><div><strong>{t("brand")}</strong><small><ShieldCheck size={12} /> {t("privacy")}</small></div></div>
      <nav aria-label="Dashboard sections">
        <a href="#overview"><BarChart3 size={17} />{t("overview")}</a>
        <a href="#performance"><TrendingUp size={17} />{t("performance")}</a>
        <a href="#risk"><ShieldCheck size={17} />{t("risk")}</a>
        <a href="#validation"><FlaskConical size={17} />{t("validation")}</a>
        <a href="#deployment"><CheckCircle2 size={17} />{t("deployment")}</a>
        <a href="#trades"><Table2 size={17} />{t("trades")}</a>
      </nav>
      <div className="sidebar__meta"><span>{t("phase")}</span><b>CALC v0.1.0</b><small>{t("updated")}</small></div>
    </aside>

    <main>
      <header className="topbar">
        <div><p className="eyebrow">SYSTEM / STRATEGY / VERSION</p><h1>{t("title")}</h1><p>{t("subtitle")}</p></div>
        <div className="toolbar">
          <button className="icon-button" title="Language" onClick={() => setLanguage(language === "th" ? "en" : "th")}><Languages size={18} /><span>{language.toUpperCase()}</span></button>
          <button className="icon-button" title="Theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button className="button button--quiet" title={t("loadDemo")} onClick={loadDemo}><FlaskConical size={17} /><span className="demo-button-label">{language === "th" ? "ตัวอย่าง" : "Demo"}</span></button>
          <button className="button" onClick={() => fileInput.current?.click()}><FileUp size={17} />{t("importCsv")}</button>
          <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={(event) => importFile(event.target.files?.[0])} />
        </div>
      </header>

      <section className="ingest band" id="overview">
        <button className="dropzone" onClick={() => fileInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); importFile(event.dataTransfer.files[0]); }}>
          <FileUp size={25} /><span><strong>{t("drop")}</strong><small>{t("dropHint")}</small></span>
        </button>
        <div className="source-status">
          <span>{t("dataSource")}</span><strong>{dataset?.sourceName ?? "—"}</strong><small>{dataset ? `${dataset.trades.length} ${t("tradesCount")} · ${dataset.issues.length} notices` : t("noData")}</small>
        </div>
        {dataset && <button className="icon-button danger" title={t("clear")} onClick={() => setDataset(null)}><Trash2 size={18} /></button>}
      </section>

      <CloudSyncPanel
        language={language}
        configured={isCloudConfigured}
        userEmail={session?.user.email ?? null}
        runs={cloudRuns}
        busy={cloudBusy}
        notice={cloudNotice}
        canSave={Boolean(dataset && evaluation && !running)}
        onSignIn={signInToCloud}
        onSignOut={signOutOfCloud}
        onSave={saveCurrentToCloud}
        onRefresh={refreshCloudRuns}
        onLoad={loadFromCloud}
        onDelete={removeFromCloud}
      />

      <AiGateEvaluation
        language={language}
        signedIn={Boolean(session)}
        evidence={calibration}
        loading={calibrationBusy}
        error={calibrationError}
        anchorMode={!evaluation}
        onRefresh={refreshCalibration}
      />

      {dataset && <details className="settings-panel">
        <summary><Settings2 size={18} /><span>{t("config")}</span><small>OOS {config.oosPercent}% · DD {config.drawdownTolerancePercent}%</small></summary>
      <section className="settings band" aria-label={t("config")}>
        <div className="section-label"><Settings2 size={17} /><span>{t("config")}</span></div>
        <label>{t("oosSplit")}<span>{config.oosPercent}%</span><input type="range" min="20" max="50" step="5" value={config.oosPercent} onChange={(event) => updateConfig("oosPercent", Number(event.target.value))} /></label>
        <label>{t("simulations")}<input type="number" min="100" max="10000" step="100" value={config.simulations} onChange={(event) => updateConfig("simulations", Math.max(100, Number(event.target.value)))} /></label>
        <label>{t("seed")}<input type="number" value={config.seed} onChange={(event) => updateConfig("seed", Number(event.target.value))} /></label>
        <label>{t("ddTolerance")}<span>{config.drawdownTolerancePercent}%</span><input type="range" min="5" max="60" step="1" value={config.drawdownTolerancePercent} onChange={(event) => updateConfig("drawdownTolerancePercent", Number(event.target.value))} /></label>
        <label>{t("ruinLevel")}<span>{config.ruinThresholdPercent}%</span><input type="range" min="20" max="100" step="5" value={config.ruinThresholdPercent} onChange={(event) => updateConfig("ruinThresholdPercent", Number(event.target.value))} /></label>
        <label>{t("minTrades")}<input type="number" min="10" max="1000" value={config.minTrades} onChange={(event) => updateConfig("minTrades", Number(event.target.value))} /></label>
        <label className="checkbox"><input type="checkbox" checked={config.lowFrequencyOverride} onChange={(event) => updateConfig("lowFrequencyOverride", event.target.checked)} /><span>{t("lowFreq")}</span></label>
      </section>
      </details>}

      {running && <div className="loading"><span />{t("running")}</div>}
      {!evaluation && !calibration && !running && <section className="empty-state"><BarChart3 size={34} /><p>{t("noData")}</p></section>}

      {evaluation && <>
        <section className={`verdict verdict--${evaluation.verdict.toLowerCase().replaceAll(" ", "-").replace("/", "-")}`}>
          <div><span>DEPLOYMENT VERDICT</span><strong>{evaluation.verdict}</strong></div>
          <p>{evaluation.gates.filter((gate) => gate.status === "pass").length}/6 HARD GATES · {evaluation.qualityPassed}/6 QUALITY · {evaluation.oos.totalTrades} OOS TRADES</p>
          <button className="button button--report" onClick={() => downloadMarkdown(report, `azanna-audit-${Date.now()}.md`)}><Download size={17} />{t("exportReport")}</button>
        </section>

        <section className="metrics-grid" id="performance">
          <MetricTile label={t("netProfit")} value={money(evaluation.all.netProfit)} note={`After ${money(evaluation.all.totalCosts)} costs`} health={evaluation.all.netProfit > 0 ? "pass" : "fail"} />
          <MetricTile label={t("expectancy")} value={money(evaluation.all.expectancy)} note={`OOS ${money(evaluation.oos.expectancy)}`} health={evaluation.oos.expectancy > 0 ? "pass" : "fail"} />
          <MetricTile label={t("profitFactor")} value={ratio(evaluation.all.profitFactor)} note={`OOS ${ratio(evaluation.oos.profitFactor)}`} health={(evaluation.all.profitFactor ?? 0) >= 1.3 ? "pass" : "fail"} />
          <MetricTile label={t("maxDrawdown")} value={`${evaluation.all.maxDrawdownPercent.toFixed(2)}%`} note={`MC95 ${evaluation.monteCarlo.p95MaxDrawdown.toFixed(2)}%`} health={evaluation.monteCarlo.p95MaxDrawdown <= config.drawdownTolerancePercent ? "pass" : "fail"} />
          <MetricTile label={t("riskOfRuin")} value={`${(evaluation.monteCarlo.ruinProbability * 100).toFixed(2)}%`} note={`Threshold −${config.ruinThresholdPercent}%`} health={evaluation.monteCarlo.ruinProbability < 0.01 ? "pass" : "fail"} />
          <MetricTile label={t("qualityScore")} value={`${evaluation.qualityPassed} / 6`} note="Unassessed metrics never pass" health={evaluation.qualityPassed >= 5 ? "pass" : evaluation.qualityPassed >= 3 ? "warn" : "fail"} />
        </section>

        <section className="chart-grid band" aria-label={t("performance")}>
          <figure className="chart chart--wide"><figcaption><span>{t("equity")}</span><b>{money(evaluation.all.finalEquity)}</b></figcaption><div><EquityChart evaluation={evaluation} /></div></figure>
          <figure className="chart"><figcaption><span>{t("drawdown")}</span><b>−{evaluation.all.maxDrawdownPercent.toFixed(2)}%</b></figcaption><div><DrawdownChart evaluation={evaluation} /></div></figure>
          <figure className="chart" id="validation"><figcaption><span>{t("isoos")}</span><b>{100 - config.oosPercent}/{config.oosPercent}</b></figcaption><div><IsoosChart evaluation={evaluation} /></div></figure>
        </section>

        <section className="chart-grid band" id="risk">
          <figure className="chart chart--wide"><figcaption><span>{t("monteCarlo")}</span><b>{config.simulations.toLocaleString()} RUNS / SEED {config.seed}</b></figcaption><div><MonteCarloChart evaluation={evaluation} /></div></figure>
          <figure className="chart chart--wide"><figcaption><span>{t("distribution")}</span><b>P05 {money(evaluation.monteCarlo.p05TerminalEquity)}</b></figcaption><div><DistributionChart evaluation={evaluation} /></div></figure>
        </section>

        <section className="deployment-grid band" id="deployment">
          <div><header className="section-heading"><span>01</span><div><h2>{t("gates")}</h2><p>{language === "th" ? "ไม่ผ่านข้อใดข้อหนึ่งจะยังเป็น READY ไม่ได้" : "Any failure blocks READY."}</p></div></header>{evaluation.gates.map((gate) => <GateRow key={gate.id} gate={localizeGate(gate, language)} statusLabel={statusText(gate.status)} />)}</div>
          <div><header className="section-heading"><span>02</span><div><h2>{t("quality")}</h2><p>{language === "th" ? "เริ่มนับคะแนนเมื่อผ่าน Hard gates ครบ" : "Scored only after hard gates pass."}</p></div></header>{evaluation.quality.map((gate) => <GateRow key={gate.id} gate={localizeGate(gate, language)} statusLabel={statusText(gate.status)} />)}</div>
        </section>

        {(evaluation.warnings.length > 0 || (dataset?.issues.length ?? 0) > 0) && <section className="warnings band"><header><h2>{t("warnings")}</h2><span>{evaluation.warnings.length + (dataset?.issues.filter((issue) => issue.severity === "error").length ?? 0)}</span></header><ul>{dataset?.issues.filter((issue) => issue.severity === "error").map((issue, index) => <li key={`e-${index}`}><b>ERROR{issue.row ? ` / ROW ${issue.row}` : ""}</b>{issue.message}</li>)}{evaluation.warnings.map((warning, index) => <li key={`w-${index}`}><b>NOTICE</b>{warning}</li>)}</ul></section>}

        <section className="trade-section band" id="trades"><header className="section-heading"><span>03</span><div><h2>{t("tradeLog")}</h2><p>Chronological · Net PnL after costs · first 200 rows</p></div></header><div className="table-wrap"><table><thead><tr><th>{t("order")}</th><th>{t("date")}</th><th>{t("side")}</th><th>{t("stage")}</th><th>{t("regime")}</th><th>{t("netPnl")}</th><th>{t("r")}</th></tr></thead><tbody>{dataset?.trades.slice(0, 200).map((trade) => <tr key={trade.orderId}><td>{trade.orderId}</td><td>{trade.date.slice(0, 10)}</td><td>{trade.side}</td><td>{trade.stage}</td><td>{trade.regime}</td><td className={trade.netPnl >= 0 ? "positive" : "negative"}>{money(trade.netPnl)}</td><td>{trade.rMultiple?.toFixed(2) ?? "N/A"}</td></tr>)}</tbody></table></div></section>
      </>}
    </main>
  </div>;
}
