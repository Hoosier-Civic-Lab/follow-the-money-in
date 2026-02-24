# Frontend Verification Workflow

How to use the Playwright MCP tools to verify frontend changes in a running browser.

## When to verify

Verify in a browser after any change that affects rendering, data loading, or visual output:

- Any change to `src/js/*.js` (rendering logic, data loading, chart output)
- Any change to `src/**/*.html` (layout, new elements, new pages)
- Any change to `src/css/main.css` (Tailwind utility changes)
- Any change to `scripts/generate-summaries.js` that alters output shape

**Not required for:** docs-only changes, pipeline-only changes, linting fixes.

## Step 1 — Start the dev server

```bash
npm run dev   # Starts Vite on http://localhost:5173/
```

The `localDataPlugin` middleware in `vite.config.js` intercepts `/data/processed/*` requests and serves them from the filesystem — real data loads automatically without a build step.

## Step 2 — Verify with Playwright MCP tools

### Basic page check

1. `mcp__playwright__browser_navigate` → target URL
2. `mcp__playwright__browser_snapshot` — confirm expected elements/text are present
3. `mcp__playwright__browser_take_screenshot` — visual confirmation
4. `mcp__playwright__browser_console_messages` (level: `"error"`) — check for JS errors
5. `mcp__playwright__browser_network_requests` — confirm data endpoints return 200

### Interactive features

- `mcp__playwright__browser_click` — click buttons, links, sort headers
- `mcp__playwright__browser_type` — fill search/filter inputs
- `mcp__playwright__browser_wait_for` — wait for async content to appear

## Page URLs (dev server)

| Page | URL |
|------|-----|
| Homepage | `http://localhost:5173/` |
| Candidates list | `http://localhost:5173/candidates.html` |
| Candidate detail | `http://localhost:5173/candidate.html?slug=<slug>` |
| Races list | `http://localhost:5173/races.html` |
| Race detail | `http://localhost:5173/race.html?slug=<slug>` |

## Common checks per page

- Stat cards/numbers render (not `undefined`, `NaN`, or `$0`)
- Charts render (canvas element is visible and non-empty)
- No JS errors in browser console
- Data endpoints return 200 (not 404)
- Interactive features (search, sort, pagination) respond correctly

## Production build verification

Use `npm run preview:local` instead of `npm run dev` when you need to verify the **production build** specifically — for example, checking base URL handling (`/follow-the-money-in/` prefix) or confirming build output correctness. For most changes, `npm run dev` is sufficient.
