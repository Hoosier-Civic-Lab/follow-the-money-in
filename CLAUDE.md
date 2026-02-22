# CLAUDE.md

Agent navigation map for follow-the-money-in. All details are one hop away via the links below.

## Navigation Map

| Question | Where to look |
|---|---|
| Data quirks, field variants, unitemized behavior | `docs/design-docs/data-quirks.md` |
| Indiana CSV header variants by year | `docs/references/indiana-field-variants.md` |
| State code variants / normalization gap | `docs/references/state-codes.md` |
| FEC API endpoints, auth, rate limits | `docs/references/fec-api.md` |
| Active in-flight plans | `docs/exec-plans/active/` |
| All docs (master index) | `docs/index.md` |

## Known Footguns

- ~90% unitemized is **expected** — not a bug. ([details](docs/design-docs/data-quirks.md#unitemized-bulk))
- State abbreviations are **not normalized** (known gap). ([details](docs/design-docs/data-quirks.md#state-normalization))
- Date column name **varies by year** (`Date` vs `ContributionDate`). ([details](docs/design-docs/data-quirks.md#date-field-name-varies))
- Amounts are float strings with 4 decimal places — always wrap in `new Decimal()`. ([details](docs/design-docs/data-quirks.md#amount-float-string))
- Most candidates have `office: null` — expected; SoS Excel covers current cycle only. ([details](docs/design-docs/data-quirks.md#candidate-office-enrichment-gap))

## Commands

```bash
npm run fetch:indiana             # Download Indiana state campaign finance CSVs
npm run fetch:indiana:candidates  # Scrape SoS elections page → download Primary/General Excel → data/raw/indiana-candidates.json
npm run fetch:fec                 # Query FEC API for federal candidates/committees
npm run process                   # Parse, classify, and normalize raw data
npm run aggregate                 # Generate summary statistics (enriches office/district/party if lookup present)
npm run metadata                  # Update timestamps and metadata
npm run update:all                # Full pipeline: fetch → fetch:indiana:candidates → fetch:fec → process → aggregate → metadata
npm run build:reference:indiana   # Parse historical election CSVs → data/reference/indiana-candidates-historical.json
npm run suggest:aliases           # Suggest name-aliases.json entries from last-name matching; review ambiguous cases manually
npm run validate:output    # Validate data/processed/ structure and quality
npm run lint               # ESLint on scripts/
npm run lint:conventions   # Custom structural checks (require(), float arithmetic, file size)
npm test                   # Run all Node.js tests (unit + integration)
npm run dev                # Start Vite dev server (serves src/ + proxies data/processed/)
npm run build              # Build frontend to dist/
npm run preview:local      # Build + copy data/processed/ into dist/ + preview locally
npm run preview            # Preview an already-built dist/ (requires data already copied)
```

## Conventions (hard rules)

1. **ES Modules only** — `import`/`export`, never `require()`. (`"type": "module"` in package.json)
2. **Decimal.js for all financial arithmetic** — no native `+`/`-` on amounts.
3. **Raw data → `data/raw/`** (gitignored). Only `data/processed/` is committed.
4. **Contribution size thresholds:** small < $100, medium < $1,000, large < $10,000, mega ≥ $10,000.
5. **Pipeline step parity** — Adding or removing a pipeline step requires updating **both** `package.json` scripts **and** `.github/workflows/update-data.yml`. They must stay in sync.

## Architecture

```
Indiana SoS / FEC API
       ↓  (scripts/fetch-*.js)
data/raw/        ← gitignored, not committed (auto-fetched every pipeline run)
       ↓  (scripts/process-data.js)
       ↓  (scripts/generate-summaries.js)  ← merges raw + reference + manual lookups
       ↓  (scripts/update-metadata.js)
data/processed/  ← committed to Git (pipeline output)
data/reference/  ← committed to Git (semi-static, script-fetchable, updated ≤once/cycle)
data/manual/     ← committed to Git (hand-maintained corrections/overrides, never auto-touched)
src/             ← Vite frontend (HTML/JS/CSS)
       ↓  (npm run build → vite build, then cp data/processed dist/data/processed)
dist/            ← built frontend + data, deployed to GitHub Pages
```

CI (`.github/workflows/update-data.yml`) runs the full pipeline every Sunday at 2 AM UTC, then builds + deploys to GitHub Pages via `peaceiris/actions-gh-pages`. PR CI (`.github/workflows/ci.yml`) runs lint + tests + build on every push.

## Environment

Copy `.env.example` to `.env`:
- `FEC_API_KEY` — free key from `https://api.open.fec.gov/developers/`
- `DEBUG=true` — optional verbose logging
