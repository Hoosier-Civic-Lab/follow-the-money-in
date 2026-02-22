# Indiana CSV Field Variants

Indiana campaign finance bulk CSVs use different column headers depending on the export year.
This table maps each logical field to its known CSV header variants.

See `docs/design-docs/data-quirks.md#date-field-name-varies` for root cause context.
Current fallback logic lives in `scripts/process-data.js`.

---

## Field Variant Table

| Logical Field | Known CSV Headers | Format / Notes |
|---|---|---|
| `contribution_date` | `ContributionDate`, `Date` | `YYYY-MM-DD HH:mm:ss`; year-dependent header |
| `amount` | `Amount`, `ContributionAmount` | Float string, 4 decimal places: `"300.0000"` |
| `candidate_name` | `CandidateName`, `Candidate` | Free text |
| `contributor_name` | `ContributorName`, `Contributor`, `Name` | Null for unitemized rows |
| `contributor_type` | `ContributorType` | Values: `individual`, `corporation`, etc. |
| `entity_type` | `EntityType` | May be absent; values: `corporation`, `committee`, `pac`, `party`, `individual` |
| `committee` | `Committee` | Name of contributing committee |
| `committee_type` | `CommitteeType` | Free text |
| `address_city` | `City` | Free text |
| `address_state` | `State` | Mixed case; see `docs/references/state-codes.md` |
| `address_zip` | `Zip` | 5-digit or ZIP+4 |
| `occupation` | `Occupation` | Free text; see `scripts/utils/occupation-parser.js` |
| `contribution_type` | `Type` | Values: `Direct`, `unitemized`, `misc` |
| `description` | `Description` | Free text; may contain newlines |
| `received_by` | `Received_By` | Free text |
| `file_number` | `FileNumber` | Numeric identifier |
| `amended` | `Amended` | `"0"` = current/valid record; `"1"` = superseded. Two patterns exist: (a) **data correction triple**: original (Amended=1) + reversal (Amended=1) + corrected (Amended=0) — all negatives are filtered; (b) **genuine refund pair**: original (Amended=1) + refund negative (Amended=0) — the negative survives as a legitimate current record. See `docs/design-docs/data-quirks.md#negative-amounts`. |

---

## Notes

- Headers are inferred from observed data. Not all variants have been confirmed across every year.
- When adding a new year's data, compare actual CSV headers against this table and update if new variants are found.
- Process-data fallback pattern: `row.PrimaryName || row.FallbackName || defaultValue`
