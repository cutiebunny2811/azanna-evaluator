export type Language = "th" | "en";

const strings = {
  en: {
    brand: "AZANNA / EDGE AUDIT", privacy: "LOCAL ANALYSIS", overview: "Overview", performance: "Performance", risk: "Risk", validation: "Validation", deployment: "Deployment", trades: "Trades",
    title: "Trading system evaluation", subtitle: "Evidence before capital. All trade data stays in this browser.", loadDemo: "Load demo", importCsv: "Import CSV", exportReport: "Export audit", dataSource: "Dataset", tradesCount: "trades", config: "Evaluation settings",
    oosSplit: "OOS split", simulations: "Simulations", seed: "Random seed", ddTolerance: "Max DD tolerance", ruinLevel: "Ruin loss level", minTrades: "Minimum trades", lowFreq: "Documented low-frequency override",
    netProfit: "Net profit", expectancy: "Expectancy / trade", profitFactor: "Profit factor", maxDrawdown: "Max drawdown", riskOfRuin: "Risk of ruin", qualityScore: "Quality checks",
    equity: "Equity curve", drawdown: "Drawdown", monteCarlo: "Monte Carlo paths", distribution: "Terminal equity distribution", isoos: "IS / OOS evidence", gates: "Mandatory hard-fail gates", quality: "Scored quality metrics", warnings: "Evidence warnings", tradeLog: "Normalized trade log",
    pass: "PASS", fail: "FAIL", warn: "WARN", na: "NOT ASSESSED", phase: "Phase 1 evaluation", updated: "Calculated locally", drop: "Choose a CSV trade log", dropHint: "Required: Order ID, Date, Equity, Product, Position Size, Risk, PnL and PnL %", noData: "Load the demo or import a valid CSV to start.", running: "Running deterministic Monte Carlo…",
    order: "Order", date: "Date", side: "Side", stage: "Stage", regime: "Regime", netPnl: "Net PnL", r: "R", all: "All", is: "In-sample", oos: "Out-of-sample", clear: "Clear data",
  },
  th: {
    brand: "AZANNA / EDGE AUDIT", privacy: "วิเคราะห์ในเครื่อง", overview: "ภาพรวม", performance: "ผลตอบแทน", risk: "ความเสี่ยง", validation: "การทดสอบ", deployment: "ความพร้อม", trades: "รายการเทรด",
    title: "ประเมินความแข็งแรงของระบบเทรด", subtitle: "ดูหลักฐานก่อนเพิ่มทุน ข้อมูลการเทรดอยู่ในเบราว์เซอร์นี้เท่านั้น", loadDemo: "เปิดข้อมูลตัวอย่าง", importCsv: "นำเข้า CSV", exportReport: "ส่งออกรายงาน", dataSource: "ชุดข้อมูล", tradesCount: "ไม้", config: "ตั้งค่าการประเมิน",
    oosSplit: "สัดส่วน OOS", simulations: "จำนวนการจำลอง", seed: "Random seed", ddTolerance: "เพดาน Drawdown", ruinLevel: "ระดับที่ถือว่า Ruin", minTrades: "จำนวนไม้ขั้นต่ำ", lowFreq: "ยกเว้นสำหรับระบบความถี่ต่ำที่มีเอกสาร",
    netProfit: "กำไรสุทธิ", expectancy: "กำไรคาดหวังต่อไม้", profitFactor: "Profit factor", maxDrawdown: "Drawdown สูงสุด", riskOfRuin: "โอกาสทุนเสียหายหนัก", qualityScore: "คุณภาพที่ผ่าน",
    equity: "เส้น Equity", drawdown: "ช่วงเงินทุนลดลง", monteCarlo: "เส้นทาง Monte Carlo", distribution: "การกระจาย Equity ปลายทาง", isoos: "เปรียบเทียบ IS / OOS", gates: "ด่านบังคับก่อนเพิ่มทุน", quality: "ตัวชี้วัดคุณภาพ", warnings: "คำเตือนด้านหลักฐาน", tradeLog: "รายการเทรดที่ปรับรูปแบบแล้ว",
    pass: "ผ่าน", fail: "ไม่ผ่าน", warn: "เตือน", na: "ยังไม่ประเมิน", phase: "การประเมิน Phase 1", updated: "คำนวณในเครื่อง", drop: "เลือกไฟล์ CSV ของการเทรด", dropHint: "ต้องมี Order ID, Date, Equity, Product, Position Size, Risk, PnL และ PnL %", noData: "เปิดข้อมูลตัวอย่างหรือนำเข้า CSV ที่ถูกต้องเพื่อเริ่ม", running: "กำลังรัน Monte Carlo แบบทำซ้ำได้…",
    order: "ออเดอร์", date: "วันที่", side: "ฝั่ง", stage: "ช่วง", regime: "สภาวะ", netPnl: "PnL สุทธิ", r: "R", all: "ทั้งหมด", is: "In-sample", oos: "Out-of-sample", clear: "ล้างข้อมูล",
  },
} as const;

export type StringKey = keyof typeof strings.en;
export const translator = (language: Language) => (key: StringKey): string => strings[language][key];

const gateThai: Record<string, [string, string]> = {
  data: ["ความเพียงพอของข้อมูล", "จำนวนตัวอย่างต้องถึงเกณฑ์และต้องไม่มีข้อผิดพลาดร้ายแรงในข้อมูล"],
  oos: ["Edge ใน Out-of-Sample", "OOS ต้องมีกำไรคาดหวังหลังต้นทุนเป็นบวก, PF อย่างน้อย 1.15 และ Drawdown ไม่เกินเพดาน"],
  ror: ["Risk of Ruin", "ความน่าจะเป็นจาก Bootstrap ที่ Equity ลดถึงระดับ Ruin ต้องต่ำกว่า 1%"],
  drawdown: ["เพดาน Drawdown", "Drawdown ในอดีตและค่า Monte Carlo เปอร์เซ็นไทล์ 95 ต้องไม่เกินเพดานที่กำหนด"],
  costs: ["ความทนทานต่อต้นทุน", "ระบบต้องยังมีกำไรเมื่อต้นทุนธุรกรรมเพิ่มเป็น 1.5 เท่า ถ้าข้อมูลต้นทุนไม่ครบจะถือว่ายังพิสูจน์ไม่ได้"],
  bias: ["Bias / Data Leakage", "ตรวจเวลาและรายการซ้ำอัตโนมัติแล้ว แต่ยังต้องให้มนุษย์ยืนยันว่าไม่มี Look-ahead และ Survivorship bias"],
  pf: ["Profit Factor ≥ 1.30", "คำนวณจาก Net PnL หลังต้นทุน"],
  recovery: ["Recovery Factor > 2.00", "กำไรสุทธิหารด้วย Drawdown สูงสุด"],
  sqn: ["SQN ≥ 1.00", "System Quality Number ระดับรายไม้จากค่า R ที่มีอยู่"],
  sortino: ["Sortino ≥ 1.50", "ผลตอบแทนปรับความเสี่ยงระดับรายไม้ โดยใช้เฉพาะ Downside deviation"],
  walkforward: ["ความเสถียรแบบ Walk-Forward", "ยังไม่นับคะแนนจนกว่าจะทดสอบหน้าต่าง Out-of-Sample ตามลำดับเวลาใน Phase 2"],
  parameters: ["ความเสถียรของพารามิเตอร์", "สรุปจาก Trade log เดียวไม่ได้ ต้องมีข้อมูล Parameter grid รอบค่าที่เลือก"],
};

export function localizeGate<T extends { id: string; label: string; explanation: string }>(gate: T, language: Language): T {
  if (language !== "th" || !gateThai[gate.id]) return gate;
  const [label, explanation] = gateThai[gate.id];
  return { ...gate, label, explanation };
}
