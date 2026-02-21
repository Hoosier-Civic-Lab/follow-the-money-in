# State Codes Reference

## Canonical Codes

This project normalizes `address_state` to ISO 3166-2:US two-letter uppercase codes.

**Status:** Normalization is a known gap — not yet implemented. `address_state` currently
stores raw source values. See `docs/design-docs/data-quirks.md#state-normalization`.

## Observed Dirty Values from Indiana Source Data

The following non-canonical values have been observed in Indiana campaign finance CSVs.
When normalization is implemented, these should map to the canonical equivalent.

| Raw Value | Canonical | Issue |
|---|---|---|
| `in` | `IN` | lowercase |
| `In` | `IN` | mixed case |
| ` IN` | `IN` | leading space |
| `Indiana` | `IN` | full state name |
| (empty string) | `null` | no state provided |

## All US State + Territory Codes

```
AL, AK, AZ, AR, CA, CO, CT, DE, FL, GA,
HI, ID, IL, IN, IA, KS, KY, LA, ME, MD,
MA, MI, MN, MS, MO, MT, NE, NV, NH, NJ,
NM, NY, NC, ND, OH, OK, OR, PA, RI, SC,
SD, TN, TX, UT, VT, VA, WA, WV, WI, WY,
DC, AS, GU, MP, PR, VI
```

## Implementing Normalization

When this gap is fixed, add a `normalizeState(raw)` function to `scripts/utils/` that:

1. Trims whitespace
2. Uppercases
3. Expands full state names to 2-letter codes (maintain a lookup map)
4. Returns `null` for unrecognized values (log a warning)

Add tests to `tests/processing/field-variants.test.js` and update the KNOWN GAP test block.
