# Docs Index

All documentation for follow-the-money-in. ≤2 hops from any question about data behavior.

## Start here

- `CLAUDE.md` — agent navigation map, commands, conventions
- `docs/prd.md` — product requirements and project goals
- `docs/technical-architecture.md` — entity definitions, data model, system design

## Data behavior questions

| Question | Where to look |
|---|---|
| Why is my field null? | `docs/design-docs/data-quirks.md` |
| What are the CSV column headers? | `docs/references/indiana-field-variants.md` |
| Why are state values inconsistent? | `docs/references/state-codes.md` + `docs/design-docs/data-quirks.md#state-normalization` |
| Why is ~90% unitemized? | `docs/design-docs/data-quirks.md#unitemized-bulk` |
| How does amount parsing work? | `docs/design-docs/data-quirks.md#amount-float-string` |
| Why do most candidates have `office: null`? | `docs/design-docs/data-quirks.md#candidate-office-enrichment-gap` |

## Reference

- `docs/data-sources.md` — source overview (Indiana SoS + FEC)
- `docs/references/fec-api.md` — FEC API endpoints, auth, rate limits
- `docs/references/frontend-verification.md` — when + how to verify frontend changes in a browser (Playwright MCP tools)
- `docs/references/indiana-field-variants.md` — logical field → CSV header mapping
- `docs/references/state-codes.md` — canonical state codes + dirty variant table

## Design docs

- `docs/design-docs/data-quirks.md` — known data gotchas with symptom/handling/risk entries

## Data directories

| Directory | Gitignored? | Purpose |
|---|---|---|
| `data/raw/` | Yes | Auto-fetched every pipeline run; never committed |
| `data/processed/` | No | Pipeline output; committed |
| `data/reference/` | No | Semi-static; script-fetchable but updated ≤once/cycle; committed |
| `data/manual/` | No | Hand-maintained corrections/overrides; never auto-touched; committed |

Key files:
- `data/reference/indiana-candidates-historical.json` — prior-cycle candidate lookup (office/district/party)
- `data/manual/candidate-overrides.json` — human-curated candidate corrections (applied last; wins over all other sources)

## Active work

- `docs/exec-plans/active/` — in-flight plans
- `docs/exec-plans/completed/` — archived completed plans
- `docs/exec-plans/_template.md` — plan template
