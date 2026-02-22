# Data Quirks

Known gotchas in Indiana campaign finance source data. Every entry follows the same
structure so agents can scan them quickly.

---

## date-field-name-varies

**Symptom:** `date` field is null on all records after processing a particular year's CSV.

**Years affected:** Observed difference between 2023 (uses `Date`) and 2024 (uses `ContributionDate`).
Other years unknown — check actual headers before assuming.

**Current handling:** `scripts/process-data.js` line 22 uses `row.Date || row.ContributionDate`
fallback. If both are absent, date becomes `null` silently.

**Test coverage:** `tests/processing/field-variants.test.js` — "contribution date" describe block.

**Risk if ignored:** Silent null dates inflate the "null date" warning in `validate-output.js`.
Downstream date-range filtering on the frontend will silently exclude all such records.

**See also:** `docs/references/indiana-field-variants.md`

---

## state-normalization {#state-normalization}

**Symptom:** `validate-output.js` warns about a high count of distinct state values (e.g. 15+
when only ~50 ISO codes are expected).

**Years affected:** All years observed so far.

**Current handling:** None. `address_state` is stored as-is from `row.State`.
Known dirty values observed in source data: `in`, `In`, `IN`, `Indiana`, ` IN` (leading space).

**Test coverage:** `tests/processing/field-variants.test.js` — "state normalization (KNOWN GAP)" block
intentionally documents the unfixed state.

**Risk if ignored:** `by_state` aggregations in `summary-all-races.json` will have duplicated
state entries under different keys, making state-level analysis incorrect.

**Fix:** Add a normalizer step in `process-data.js` after extracting `address_state`. Reference
canonical codes + dirty-value map in `docs/references/state-codes.md`.

**See also:** `docs/references/state-codes.md`

---

## unitemized-bulk {#unitemized-bulk}

**Symptom:** ~90% of records have `contributor_type: "unitemized"`.

**Years affected:** All years. This is expected behavior, not a bug.

**Current handling:** `scripts/utils/contributor-classifier.js` returns `'unitemized'` for rows
where `ContributorName` is null or contains the word "unitemized". Indiana bulk CSVs include a
large row that aggregates all small/anonymous contributions into a single unitemized line.

**Test coverage:** `tests/processing/contributor-classifier.test.js` — "unitemized" tests.

**Risk if ignored:** None at current phase. However if `validate-output.js` reports 100%
unitemized, that indicates a real classification regression — not expected behavior.

**Threshold:** `validate-output.js` fails hard if unitemized ≥ 99% (configurable).

---

## amount-float-string

**Symptom:** Decimal precision errors in totals, or `NaN` amounts after parsing.

**Years affected:** All years observed.

**Current handling:** Indiana CSVs store amounts as float strings with 4 decimal places,
e.g. `"300.0000"`. `process-data.js` uses `parseFloat()` to convert. `generate-summaries.js`
wraps in `new Decimal(contrib.amount)` for all aggregation arithmetic.

**Test coverage:** `tests/processing/field-variants.test.js` — "amount, 4-decimal-place format" test.

**Risk if ignored:** Using native `+` or `+=` on amounts will accumulate floating-point errors
across thousands of records. `scripts/lint/check-conventions.js` warns on detected bare arithmetic.

**See also:** `docs/design-docs/data-pipeline.md#financial-precision`

---

## entity-type-column-absent

**Symptom:** All contributions classified as `individual` instead of `corporate`/`committee`
for a particular year's CSV.

**Years affected:** Unknown — `EntityType` column may not exist in all CSV exports.

**Current handling:** `scripts/utils/contributor-classifier.js` falls back to name-pattern
matching when `EntityType` is absent. This is fragile for edge cases.

**Test coverage:** `tests/processing/contributor-classifier.test.js` — EntityType tests.

**Risk if ignored:** Corporate and committee contributions misclassified as individual
will distort `by_contributor_type` aggregation.

---

## negative-amounts {#negative-amounts}

**Symptom:** A small number of records have `amount < 0` after Amended=1 filtering.

**Years affected:** 2025 observed. Likely all years.

**Root cause:** Indiana uses two different negative-amount patterns:

1. **Data correction triple** — original error (Amended=1) + reversal (Amended=1) + corrected amount (Amended=0).
   Our Amended=1 filter removes both old records, leaving only the corrected positive amount. No negatives survive.

2. **Genuine refund/rescission pair** — original contribution (Amended=1) + refund record (Amended=0).
   The refund IS the current valid record; there is no replacement positive. The negative survives the filter correctly.
   Examples: self-contributions later rescinded, ActBlue chargebacks.

**Current handling:** Negative amounts on Amended=0 records are kept as-is. `validate-output.js`
warns (not fails) when any are present. They correctly reduce `totals.total_raised`.

**Test coverage:** None yet (low priority given small count — 7 records out of 95K in 2025).

**Risk if ignored:** `contribution_size` classifies negative amounts as `"small"` (amount < 100),
which is semantically wrong. Frontend display should guard against showing negative sizes.

---

## candidate-office-enrichment-gap {#candidate-office-enrichment-gap}

**Symptom:** Most candidates in `candidates-list.json` have `office: null`, `district: null`, `party: null`
even after running `fetch:indiana:candidates`.

**Root cause:** The Indiana SoS Primary/General Excel files only list candidates for the **current
election cycle**. `all-contributions.json` accumulates contributions across multiple years, so the
majority of named candidates are from prior cycles and will not appear in the current Excel.

**Current handling:** `generate-summaries.js` builds the lookup via a three-layer merge (lowest → highest priority):

1. `data/reference/indiana-candidates-historical.json` — prior-cycle baseline (committed, updated ≤once/cycle)
2. `data/raw/indiana-candidates.json` — current-cycle auto-fetch (overrides historical)
3. `data/manual/candidate-overrides.json` — human corrections (wins over everything)

Each layer is independently optional; missing files are silently skipped. Fresh clones with no
`data/raw/` still get enrichment from `data/reference/` and `data/manual/`. Unmatched candidates
silently get `null` fields — not an error. `validate-output.js` warns (not fails) when >50% of
candidates lack an `office` value.

**Name matching:** Lookup key is `name.toUpperCase().trim().replace(/\s+/g, ' ')`. A "Last, First"
→ "First Last" rearrangement is attempted as a fallback. Names with middle initials or suffixes
(Jr., III) that differ between the contribution CSV and the Excel will still fail to match.

**Test coverage:** None (runtime-only — depends on network fetch of live SoS Excel files).

**Risk if ignored:** None for data integrity. The `[WARN]` in validate-output.js fires if
>50% missing, signaling a complete fetch failure rather than expected partial coverage.

**See also:** `scripts/fetch-indiana-candidates.js`, `scripts/generate-summaries.js`,
`data/reference/indiana-candidates-historical.json`, `data/manual/candidate-overrides.json`,
`scripts/build-reference-indiana.js` — builds historical reference lookup from prior-cycle election CSVs

---

## newline-in-text-columns

**Symptom:** CSV parsing produces records with unexpected newlines in string fields
(address, description), potentially splitting one logical record into two rows.

**Years affected:** All years. Noted in Indiana SoS documentation as a known issue.

**Current handling:** PapaParse (via `scripts/utils/csv-parser.js`) handles quoted newlines
correctly by default. If a field is unquoted and contains a newline, the record will be malformed.

**Test coverage:** None yet.

**Risk if ignored:** Silently malformed records with null/partial field values that appear
valid until scrutinized.
