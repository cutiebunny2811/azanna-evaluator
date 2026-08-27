# Azanna Strategy Evaluator

Privacy-first Phase 1 implementation of the Trading System Evaluation Dashboard PRD.
All imported trades and calculations stay inside the browser.

## Web app

Production URL: <https://cutiebunny2811.github.io/azanna-evaluator/>

The site is an installable PWA designed for iPhone. In Safari, use Share →
Add to Home Screen → Open as Web App. The application shell works offline after
the first successful visit. Imported CSV data is processed in the browser and
is never committed to this repository or uploaded by the application.

## Run

```powershell
cd evaluator
npm install
npm run dev
```

Open `http://127.0.0.1:4173` and load the deterministic demo dataset or import a
CSV. The UI supports Thai/English and dark/light modes.

## Export confirmed Azanna Demo trades

From the `azanna-trader` directory:

```powershell
.\.venv\Scripts\python.exe -m azanna_trader.evaluation_export --initial-equity 300
```

This writes `data/evaluator/azanna-demo-trades.csv`. Import that file in the
dashboard. Only confirmed broker closes are exported; rejected shadow candidates
are intentionally excluded from realized performance.

The current MT5 reconciliation stores confirmed net PnL but not itemized broker
fees and slippage. The exported rows therefore leave those fields blank, and the
dashboard correctly marks the 1.5x execution-cost gate as unverifiable rather
than inventing cost data.

## Verification

```powershell
npm test
npm run lint
npm run build
```

Phase 1 implements CSV validation, normalized cost-aware PnL, core profitability
and risk metrics, R-multiples, Sharpe/Sortino/SQN/Recovery Factor, chronological
IS/OOS, deterministic Monte Carlo in a Web Worker, deployment gates, transparent
quality scoring, responsive charts, localization, and Markdown audit export.

Walk-forward analysis, regime/cost stress matrices, bootstrap confidence
intervals, stage degradation, parameter sensitivity, DSR/PBO, and live drift are
reserved for Phase 2/3 and are never represented by placeholder values.
