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

## newline-in-text-columns

**Symptom:** CSV parsing produces records with unexpected newlines in string fields
(address, description), potentially splitting one logical record into two rows.

**Years affected:** All years. Noted in Indiana SoS documentation as a known issue.

**Current handling:** PapaParse (via `scripts/utils/csv-parser.js`) handles quoted newlines
correctly by default. If a field is unquoted and contains a newline, the record will be malformed.

**Test coverage:** None yet.

**Risk if ignored:** Silently malformed records with null/partial field values that appear
valid until scrutinized.
