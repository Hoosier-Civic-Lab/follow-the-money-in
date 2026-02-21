# FEC API Reference

Source split from `docs/data-sources.md`.

## Overview

**Base URL:** `https://api.open.fec.gov/v1`
**Documentation:** `https://api.open.fec.gov/developers/`
**Key required:** Yes (free). Set `FEC_API_KEY` in `.env`.
**Rate limit:** 1,000 requests/hour.

## Authentication

All requests require `api_key` query parameter:
```
GET /v1/candidates/?api_key=YOUR_KEY&state=IN
```

Get a free key at: `https://api.open.fec.gov/developers/`

## Endpoints Used

### `GET /candidates/`

Returns candidate records. Filter to Indiana with `state=IN`.

Key response fields:
- `candidate_id` — FEC identifier (e.g. `S2IN00364`)
- `name` — Last, First format
- `office` — `S` (Senate), `H` (House), `P` (President)
- `party` — Party abbreviation
- `state` — 2-letter state code
- `cycles` — Election cycles the candidate was active

### `GET /schedules/schedule_a/`

Itemized contributions to federal committees. Filter with `contributor_state=IN`.

Key response fields:
- `contributor_name`
- `contributor_employer`
- `contributor_occupation`
- `contribution_receipt_amount`
- `contribution_receipt_date`
- `committee_id`

### `GET /committee/{id}/`

Committee details by FEC committee ID.

## Pagination

Results are paginated. Use `page` and `per_page` parameters.
Default `per_page` is 20; max is 100.

```js
// Fetch all pages
let page = 1;
while (true) {
  const res = await fetch(`/v1/candidates/?api_key=KEY&state=IN&per_page=100&page=${page}`);
  const data = await res.json();
  if (data.results.length === 0) break;
  page++;
}
```

## Sample Response: Candidate

```json
{
  "candidate_id": "S2IN00364",
  "name": "ALVAREZ, ANTONIO XAVIER",
  "office": "S",
  "office_full": "Senate",
  "party": "W",
  "party_full": "WRITE-IN",
  "state": "IN",
  "cycles": [2022, 2024],
  "has_raised_funds": false,
  "incumbent_challenge": "C",
  "incumbent_challenge_full": "Challenger"
}
```

## Implementation

See `scripts/fetch-fec-data.js`. Requires `FEC_API_KEY` environment variable.
