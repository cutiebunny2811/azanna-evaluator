# Azanna Strategy Evaluator

Privacy-first Phase 1 implementation of the Trading System Evaluation Dashboard PRD.
Imported trades are local by default. Signed-in users can explicitly save a run
to Supabase for cross-device access.

## Web app

Production URL: <https://cutiebunny2811.github.io/azanna-evaluator/>

The site is an installable PWA designed for iPhone. In Safari, use Share →
Add to Home Screen → Open as Web App. The application shell works offline after
the first successful visit. Imported CSV data is processed in the browser and
cached in IndexedDB on that device. It is never committed to this repository.
Cloud upload happens only after the user signs in and presses **Save current run**.

## Cloud sync

Supabase Auth uses a passwordless email magic link. The same account can load
saved runs on desktop and iPhone. Cloud data is normalized into:

- `azanna_trade_runs` for dataset metadata and evaluation headline metrics
- `azanna_trades` for ordered normalized trades
- `azanna_evaluations` for configuration and compact audit snapshots

All three tables have Row Level Security enabled. Anonymous access is revoked,
and authenticated users can access only rows owned by their `auth.uid()`.
The frontend contains only the Supabase publishable key; no service-role key is
used or committed.

The scanner uploads AI-gate calibration evidence automatically through the
single `azanna_ingest_calibration` RPC. Its scoped token cannot read trade runs
or access any other application in the shared project. Signed-in users read
their own `azanna_calibration_state` and `azanna_calibration_candidates` rows
through RLS. The dashboard reports raw candidate counts alongside independent
market-episode counts so repeated M5 setups do not inflate confidence.

The schema is stored in
`supabase/migrations/20260827142000_azanna_cloud_sync.sql`. Because the selected
Supabase project is shared with other applications and has its own migration
history, apply this migration with:

```powershell
npx supabase db query --linked --file supabase/migrations/20260827142000_azanna_cloud_sync.sql
```

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
