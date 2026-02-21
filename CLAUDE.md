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

## Commands

```bash
npm run fetch:indiana      # Download Indiana state campaign finance CSVs
npm run fetch:fec          # Query FEC API for federal candidates/committees
npm run process            # Parse, classify, and normalize raw data
npm run aggregate          # Generate summary statistics
npm run metadata           # Update timestamps and metadata
npm run update:all         # Full pipeline: fetch → process → aggregate → metadata
npm run validate:output    # Validate data/processed/ structure and quality
npm run lint               # ESLint on scripts/
npm run lint:conventions   # Custom structural checks (require(), float arithmetic, file size)
npm test                   # Run all Node.js tests (unit + integration)
```

## Conventions (hard rules)

1. **ES Modules only** — `import`/`export`, never `require()`. (`"type": "module"` in package.json)
2. **Decimal.js for all financial arithmetic** — no native `+`/`-` on amounts.
3. **Raw data → `data/raw/`** (gitignored). Only `data/processed/` is committed.
4. **Contribution size thresholds:** small < $100, medium < $1,000, large < $10,000, mega ≥ $10,000.

## Architecture

```
Indiana SoS / FEC API
       ↓  (scripts/fetch-*.js)
data/raw/        ← gitignored, not committed
       ↓  (scripts/process-data.js)
       ↓  (scripts/generate-summaries.js)
       ↓  (scripts/update-metadata.js)
data/processed/  ← committed, served from GitHub Pages
```

CI runs the full pipeline every Sunday at 2 AM UTC (`.github/workflows/update-data.yml`).

## Environment

Copy `.env.example` to `.env`:
- `FEC_API_KEY` — free key from `https://api.open.fec.gov/developers/`
- `DEBUG=true` — optional verbose logging
