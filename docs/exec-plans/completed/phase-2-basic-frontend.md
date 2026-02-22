# Plan: Phase 2 — Basic Frontend

**Status:** active
**Created:** 2026-02-21
**Author:** claude-sonnet-4-6

## Context

Phases 0 and 1 are complete: the data pipeline fetches Indiana SoS CSVs and FEC API data weekly, processes ~95K contributions, and outputs aggregate summaries to `data/processed/`. The frontend (`src/js/`, `src/css/`) is completely empty. Phase 2 builds the static GitHub Pages site so voters can explore campaign finance data.

**Key data finding:** Only 14,407 of 95,179 contribution records (15%) have a `candidate_name` field — 262 unique Indiana state candidates. The remaining 85% lack candidate association in the raw CSV export. Phase 2 works with what exists and surfaces this limitation to users.

## Goal

A static GitHub Pages site is live with a homepage showing aggregate stats and charts, a candidates listing page with sort/filter/pagination, and a mobile-responsive layout — all built from existing processed JSON data.

## Steps

- [ ] **Step 1 — Backend prep:** Extend `scripts/generate-summaries.js` to produce `data/processed/candidates-list.json` (262-entry lightweight index: id/name/total\_raised/total\_contributions/source) and per-candidate files in `data/processed/candidates/<slug>.json`. Update `scripts/validate-output.js` to check for the new files.

- [ ] **Step 2 — Build tooling:** Install `vite`, `tailwindcss@4`, `@tailwindcss/vite`, `chart.js`. Create `vite.config.js` (root=`src/`, outDir=`../dist/`, base=`/follow-the-money-in/`). Create `src/css/main.css` (`@import "tailwindcss"`). Add `dev`/`build`/`preview` npm scripts.

- [ ] **Step 3 — Shared JS modules:**
  - `src/js/data-loader.js` — `loadJSON(path)` with in-memory cache
  - `src/js/utils.js` — `formatCurrency`, `formatDate` (date-fns), `formatCompact` (e.g. $42.7M)
  - `src/js/chart-helpers.js` — Chart.js factory functions: `makeDonut(ctx, labels, data)`, `makeBar(ctx, labels, data)`
  - `src/js/filter-engine.js` — pure functions: `filterCandidates`, `sortCandidates`, `paginate`

- [ ] **Step 4 — Homepage** (`src/index.html` + `src/js/main.js`):
  - Status bar: last updated / next update from `metadata.json`
  - Four stat cards: Total raised, Total contributions, % itemized, Unique candidates (262)
  - Contributor type donut chart (Chart.js) from `summary-all-races.json`.by\_contributor\_type
  - Contribution size bar chart from `summary-all-races.json`.by\_contribution\_size
  - Top 10 candidates table from `candidates-list.json`, sorted by total\_raised desc
  - Nav link to candidates listing

- [ ] **Step 5 — Candidates listing page** (`src/candidates.html` + `src/js/candidates.js`):
  - Load `candidates-list.json`; render sortable table (name, total raised, # contributions, source)
  - Search-as-you-type by name; sort by any column; 25 rows/page pagination
  - Note: "Showing candidates with itemized contributions (15% of all records)."

- [ ] **Step 6 — Mobile-responsive layout:**
  - Tailwind responsive classes throughout (single-col → 2-col → 4-col stat cards)
  - Pure CSS hamburger nav for mobile
  - Charts: `responsive: true`, fixed-height containers (`h-48 md:h-64`)
  - Tables: horizontal scroll on small screens

- [ ] **Step 7 — GitHub Actions build + deploy:**
  - Add to `.github/workflows/update-data.yml`: `npm run build`, copy `data/processed/` into `dist/`, deploy `dist/` via `peaceiris/actions-gh-pages@v3`
  - Add a build-validation job to PR/push trigger

## Decisions Log

| Decision | Alternatives considered | Rationale |
|---|---|---|
| Vanilla JS | React, Vue | Static display site; no state management needed; simpler Phase 2 with no framework overhead |
| Chart.js | D3.js | Simpler API, good defaults, adequate for aggregate bar/donut charts in Phase 2 |
| Tailwind CSS v4 via Vite | Bootstrap, hand-written CSS | PRD specifies Tailwind; Vite build from the start avoids CDN limitations in later phases |
| `candidates-list.json` index + per-candidate files | Load 38MB all-contributions.json in browser | 38MB is far too large to serve; pre-aggregated files keep page loads <300KB |
| No Leaflet/mapping in Phase 2 | Include now | PRD defers "Find My Races" to Phase 3; avoids scope creep |
| Per-candidate slug as id | Numeric id | Human-readable URLs; stable if name doesn't change |

## Blockers

None at start. Potential blockers during implementation:

- If `CandidateName` / `Candidate` CSV column names differ across years, candidate association will remain low (15%). This is a data pipeline issue, not a frontend issue.
- GitHub Pages base URL (`/follow-the-money-in/`) must match Vite `base` config exactly to avoid broken asset paths.

## Outcome

_Fill in when completed._
