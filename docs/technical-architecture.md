# Technical Architecture Document: Indiana Campaign Finance Transparency Platform
## 1. Executive Summary
The Indiana Campaign Finance Transparency Platform uses a serverless, static web application architecture designed for zero-cost operation using GitHub's free tier services.

### 1.1 Key Architectural Decisions
- Serverless Static Architecture (no backend servers)
- JAMstack Pattern (pre-computed JSON + client-side JS)
- Node.js Processing Pipeline (runs in GitHub Actions)
- Progressive Enhancement (accessible without JS)
- Lazy Loading Strategy (on-demand data loading)

### 1.2 Design Principles
1. Zero Operating Cost
2. Automation First
3. Performance by Default
### 1.3 High-Level Flow
```
Data Sources (IN State + FEC API)
    ↓ (Weekly GitHub Actions)
Processing Pipeline (Node.js scripts)
    ↓ (Transform, Aggregate, Output)
Git Repository (processed JSON files)
    ↓ (Auto-deploy)
GitHub Pages CDN
    ↓ (HTTPS)
Client Browser (SPA with lazy loading)
```

### 1.4 Component Layers
- *Presentation Layer* - HTML pages (homepage, race detail, find my races)
- *Visualization Layer* - Chart.js charts, Leaflet maps, data tables
- *Application Logic* - State management, filter engine, data aggregation
- *Data Access Layer* - JSON loader, cache manager, geocoding, geospatial queries

## 2. Data Architecture
### 2.1 Data Flow (5 Phases)
1. *Ingestion* - GitHub Actions fetches raw CSVs/API data weekly
2. *Transformation* - Parse, normalize, classify contributors, parse occupations
3. *Aggregation* - Generate summaries by race/type/time/geography
4. *Storage* - Write JSON to /data/processed/, commit to Git
5. *Delivery* - GitHub Pages CDN serves files, client lazy-loads

### 2.2 Core Data Entities
#### Race Entity
```js
{
  id: "us-senate-in-2024-general",
  name: "U.S. Senate - Indiana",
  year: 2024,
  date: "2024-11-05",
  level: "federal",  // federal|state|county|municipal
  phase: "general",  // primary|general
  status: "active",  // active|completed
  candidates: [Candidate],
**This completes sections 6-10. Would you like me to continue with the remaining sections (11-13: Maintenance, Documentation, and Appendix)?**
}
```
#### Candidate Entity
```js
{
  id: "us-senate-in-2024-general",
  name: "U.S. Senate - Indiana",
  year: 2024,
  date: "2024-11-05",
  level: "federal",  // federal|state|county|municipal
  phase: "general",  // primary|general
  status: "active",  // active|completed
  candidates: [Candidate],
  summary: { total_raised, total_contributors, ... }
}
```
#### Contribution Entity
```js
{
  id: "contrib-12345",
  date: "2024-03-15",
  amount: 2500,
  candidate_id: "mike-braun",
  contributor_name: "John Smith",
  contributor_type: "individual",  // individual|corporate|committee|self|unitemized
  contribution_size: "large",  // small|medium|large|mega
  is_in_district: true,
  is_in_state: true,
  occupation_category: "business",
  phase: "primary"
}
```
#### File Structure
```
/data/processed/
  ├─ metadata.json (~5KB)
  ├─ races-taxonomy.json (~150KB - all races)
  ├─ summary-all-races.json (~50KB - aggregates)
  └─ /races/
      └─ [race-id].json (~400KB each - full details)
/data/geo/
  └─ [district].geojson (~200-400KB each)
```
### 2.3 Data Size Estimates

- Raw data per update: ~25-30 MB (gitignored)
- Processed data: ~45 MB (committed)
- Initial page load: ~300 KB
- Typical session: 1-2 MB

## 3. Processing Pipeline Architecture
### 3.1 Pipeline Stages (~25-30 min total)
```
FETCH (5 min) → TRANSFORM (10 min) → AGGREGATE (8 min) → OUTPUT (2 min)
```
1. Fetch Phase
   - `fetch-indiana-data.js` - Downloads IN campaign finance CSVs
   - `fetch-fec-data.js` - Queries FEC API for federal candidates
   - Validates file integrity, retries on failure
2. Transform Phase
   - `process-data.js` -  Parses CSVs, normalizes data
   - Classifies contributors (individual/corporate/committee/self/unitemized)
   - Parses occupations into categories (legal/medical/business/etc.)
   - Assigns geographic flags (in-district/in-state/out-of-state)
   - Tags contributions with race phase (primary/general)
  - Key Functions
```js
classifyContributor(row) 
  // Returns: individual|corporate|committee|self|unitemized

parseOccupation(occupation)
  // Returns: legal|medical|business|education|retired|etc.

assignRacesAndPhases(contributions)
  // Matches contribs to races, determines primary vs general
```
3. Aggregate Phase
   - `generate-summaries.js` - Creates race-level summaries
   - Groups by candidate, type, size, geography, phase
   - Generates timelines, top donors, occupation breakdowns
   - Creates system-wide summary (all races combined)
4. Output Phase
   - update-metadata.js - Updates timestamps, stats
   - Writes JSON files to /data/processed/
   - Commits to Git, triggers deployment

### 3.2 GitHub Actions Workflow
```yaml
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly Sunday 2 AM UTC
  workflow_dispatch:      # Manual trigger option

steps:
  - Checkout, setup Node.js 18
  - Install dependencies
  - Fetch Indiana data
  - Fetch FEC data (with API key from secrets)
  - Process and transform
  - Generate summaries
  - Update metadata
  - Run data quality checks
  - Commit and push
  - Create issue on failure
```

### 3.3 Manual Fallback
```bash
npm install
echo "FEC_API_KEY=your_key" > .env
npm run update:all  # Runs all scripts locally
git add data/processed/
git commit -m "Manual data update"
git push
```

## 4. Frontend Architecture
### 4.1 Tech Stack
- HTML5, CSS (Tailwind), JavaScript ES6+
- Chart.js (charts), Leaflet.js (maps), Turf.js (geospatial)
- date-fns (dates), Papa Parse (CSV export)
- Vite (optional build tool)
### 4.2 Application Structure (Module Pattern)
#### DataLoader Module
```js
class DataLoader {
  async loadRacesTaxonomy()  // Loads all races metadata
  async loadRaceDetail(id)   // Loads specific race data
  async loadGeoJSON(file)    // Loads district boundaries
  // Includes caching for performance
}
```
#### StateManager Module
```js
class StateManager {
  state = {
    selectedLevel: 'all',      // federal|state|county|municipal
    selectedPhase: 'all',       // primary|general|all
    scopeToggle: 'active',      // active|completed|all
    filters: { dateRange, contributorType, amountRange, geography }
  }
  setState(updates)  // Updates state, notifies listeners
  subscribe(callback)  // Subscribe to state changes
}
```
#### FilterEngine Module
```js
class FilterEngine {
  applyFilters(contributions, filters)
    // Filters by date, type, amount, geography
  
  aggregateFiltered(contributions)
    // Returns totals, counts, averages, breakdowns
}
```
### 4.3 Page Architecture
#### Homepage (`index.html`)
- Status bar (last updated, next update)
- Scope toggle (Active/Completed/All)
- Overview stats (4 stat cards: total raised, contributors, races, candidates)
- Featured visualizations (pie chart by type, timeline)
- Top races list

#### Race Detail Page
- Race header with metadata
- Phase toggle (Primary / General / Full Cycle)
- Candidate comparison cards
- Multiple visualizations (total by candidate, type breakdown, timeline, geography, top donors, occupations)
- Collapsible filter panel
- Lazy-loaded raw data table
- CSV export button

### 4.4 Visualization Components
#### Chart Builder (Chart.js wrappers)
```js
createPieChart(canvasId, data, options)
  // Pie chart with tooltips showing $amount and %

createTimelineChart(canvasId, datasets, options)
  // Line chart with primary date marker
  // Time-based x-axis, currency y-axis

createBarChart(canvasId, data, options)
  // For occupation categories, contribution sizes
```
#### Map Builder (Leaflet wrapper)
```js
class MapBuilder {
  async loadDistricts(geojsonUrl)
    // Loads and renders district boundaries
  
  findDistrictAtPoint(lat, lng, geojson)
    // Uses Turf.js point-in-polygon
    // Returns district properties
  
  highlightDistrict(districtId)
    // Visual highlight for selected district
}
```
### 4.5 Performance Optimizations
1. *Lazy Loading* - Intersection Observer loads charts/tables when visible
2. *Caching* - Memory cache + localStorage for frequently accessed data
3. *Virtual Scrolling* - For large data tables (render only visible rows)
4. *Progressive Loading* - Load summary first, details on demand
5. *Code Splitting* - Separate bundles for each page (if using Vite)

## 5. Deployment Architecture

### 5.1 GitHub Pages Configuration

**Repository Settings:**
- **Pages Source:** Deploy from `main` branch, `/` (root) folder
- **Build and Deployment:** Automatic via GitHub Actions
- **URL:** `hoosier-data.github.io/donor-data`
- **HTTPS:** Enforced automatically
- **Custom Domain:** Optional future enhancement

**Deployment Workflow:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
    paths:
      - 'src/**'
      - 'data/processed/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build (if using Vite)
        run: npm run build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist  # Or ./src if not using build
          cname: hoosierdata.org  # If using custom domain
```

### 5.2 CDN and Caching Strategy

**GitHub Pages CDN:**
- Automatic edge caching via Fastly
- Global distribution (100+ Points of Presence)
- Automatic gzip compression
- Free bandwidth and traffic

**Cache Headers:**

```
# Recommended cache directives (via meta tags or .headers file)

/data/processed/*.json
  Cache-Control: public, max-age=3600, s-maxage=7200
  # 1 hour browser, 2 hours CDN

/src/js/*.js
  Cache-Control: public, max-age=604800, immutable
  # 1 week, immutable

/src/css/*.css
  Cache-Control: public, max-age=604800, immutable
  # 1 week, immutable

/data/geo/*.geojson
  Cache-Control: public, max-age=86400
  # 1 day
```

**Cache Busting Strategies:**

1. **Version in Filename:**
   ```
   races-taxonomy.v20240211.json
   summary-all-races.v20240211.json
   ```

2. **Query Parameter:**
   ```
   races-taxonomy.json?v=1707616800
   ```

3. **Content Hash (if using Vite):**
   ```
   main.a8f3b2c9.js
   styles.d4e5f6a7.css
   ```

### 5.3 Monitoring and Observability

**GitHub Actions Monitoring:**
- View workflow runs in Actions tab
- Email notifications on failure
- Status badge in README:
  ```markdown
  ![Data Update](https://github.com/hoosier-data/donor-data/workflows/Update%20Campaign%20Finance%20Data/badge.svg)
  ```

**Uptime Monitoring:**
- **Tool:** UptimeRobot (free tier) or similar
- **Frequency:** Ping every 5 minutes
- **Endpoints:**
  - Homepage: `https://hoosier-data.github.io/donor-data/`
  - API health: `https://hoosier-data.github.io/donor-data/data/processed/metadata.json`
- **Alerts:** Email/SMS on downtime

**Client-Side Error Tracking (Optional):**
```js
// Simple error tracking
window.addEventListener('error', (event) => {
  // Log to console or send to tracking service
  console.error('Client error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
  
  // Optional: Send to Sentry or similar service
  // if (window.Sentry) {
  //   Sentry.captureException(event.error);
  // }
});

// Track failed data loads
async function loadDataWithTracking(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      logError('Data load failed', { url, status: response.status });
    }
    return response.json();
  } catch (error) {
    logError('Data load error', { url, error: error.message });
    throw error;
  }
}
```

**Performance Monitoring:**
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  pull_request:
    branches: [ main ]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://hoosier-data.github.io/donor-data/
            https://hoosier-data.github.io/donor-data/races.html
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### 5.4 Rollback Strategy

**Git-Based Rollback:**

```bash
# Scenario: Bad data committed, need to revert

# Option 1: Revert last commit
git revert HEAD
git push origin main
# GitHub Pages will auto-deploy reverted version

# Option 2: Reset to specific good commit
git reset --hard <commit-sha>
git push --force origin main
# Use with caution!

# Option 3: Cherry-pick fix
git cherry-pick <fix-commit-sha>
git push origin main
```

**Automated Rollback on Test Failure:**

```yaml
# In update-data.yml workflow
- name: Run data quality checks
  run: npm run test:data
  id: data-tests

- name: Rollback on failure
  if: failure() && steps.data-tests.outcome == 'failure'
  run: |
    git reset --hard HEAD~1
    git push --force origin main
    echo "Rolled back due to data quality failures"
```

**Deployment History:**
- All deployments tracked in Git history
- Each data update = one commit with clear message
- Can view diff of any deployment: `git diff <old-commit> <new-commit>`

---

## 6. Security Architecture

### 6.1 Threat Model

**Assets to Protect:**
1. Data integrity (accurate campaign finance data)
2. User privacy (no tracking beyond necessary)
3. Platform availability (prevent abuse/DDoS)
4. Reputation (prevent misinformation)

**Potential Threats:**

| Threat | Probability | Impact | Mitigation |
|--------|-------------|--------|------------|
| Data tampering | Low | High | Repository protection, required reviews, audit logs |
| API key exposure | Medium | Low | GitHub Secrets, never commit, rotate if exposed |
| XSS attacks | Medium | Medium | Sanitize inputs, CSP headers, no `eval()` or unsafe `innerHTML` |
| Supply chain attack | Medium | Medium | Dependabot alerts, lock files, audit npm packages |
| DDoS | Low | Low | GitHub's CDN handles this, rate limit API calls |
| Misinformation | Low | High | Data validation, clear disclaimers, source attribution |

### 6.2 Security Measures

**Content Security Policy (CSP):**

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  img-src 'self' data: https:;
  font-src 'self' https://cdn.jsdelivr.net;
  connect-src 'self' https://nominatim.openstreetmap.org;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'none';
">
```

**Subresource Integrity (SRI):**

```html
<!-- Always use SRI for CDN resources -->
<script 
  src="https://cdn.jsdelivr.net/npm/chart.js@4.0.0/dist/chart.umd.js"
  integrity="sha384-abc123..."
  crossorigin="anonymous">
</script>

<link 
  rel="stylesheet" 
  href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha384-def456..."
  crossorigin="anonymous">
```

**Input Sanitization:**

```js
// ALWAYS sanitize user-provided content before rendering
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;  // Sets as text, not HTML
  return temp.innerHTML;
}

// Safe rendering
contributorNameElement.textContent = contribution.contributor_name;

// NEVER do this with untrusted data:
// element.innerHTML = contribution.contributor_name; // UNSAFE!

// For addresses, search queries, etc.
function sanitizeInput(input) {
  return input
    .trim()
    .replace(/[<>]/g, '')  // Remove HTML brackets
    .substring(0, 200);     // Limit length
}
```

**Secrets Management:**

```bash
# .gitignore - Never commit secrets
.env
*.key
*.pem
secrets/

# .env.example - Template for developers
FEC_API_KEY=your_key_here
```

**GitHub Secrets Configuration:**
1. Go to repository Settings > Secrets and variables > Actions
2. Add repository secret: `FEC_API_KEY`
3. Reference in workflow: `${{ secrets.FEC_API_KEY }}`
4. Never log secret values in Actions output

**Repository Protection Rules:**

```
Settings > Branches > Branch protection rules for 'main':
☑ Require pull request reviews before merging
☑ Require status checks to pass before merging
  - Data quality tests
  - Linting
☑ Require branches to be up to date before merging
☑ Include administrators (enforce for everyone)
☑ Restrict who can push to matching branches (optional)
```

### 6.3 Privacy Considerations

**Data Privacy:**
- ✅ All data shown is already public record (from official filings)
- ✅ No additional PII collected or stored beyond public records
- ✅ No user accounts or authentication required
- ✅ No cookies required for core functionality
- ✅ Optional localStorage only for user preferences (can be cleared)

**Analytics Privacy (if implemented):**

```js
// Option 1: Privacy-respecting analytics (Plausible, Simple Analytics)
// - No cookies
// - No personal data collection
// - Respect Do Not Track

// Option 2: No analytics at all (most privacy-respecting)

// If using any analytics, disclose in privacy policy
```

**GDPR/CCPA Compliance:**
- Not strictly required (no PII collected, all data is public records)
- Provide privacy policy explaining:
  - What data is displayed (public campaign finance records)
  - No user tracking or data collection
  - Optional localStorage usage
  - Third-party services used (Nominatim for geocoding)
- Allow users to clear localStorage

**Privacy Policy Template:**

```markdown
# Privacy Policy

## 7. Data We Display
All campaign finance data shown on this site is public record, obtained from:
- Indiana Campaign Finance Database (campaignfinance.in.gov)
- Federal Election Commission (fec.gov)

## 8. Data We Collect
We do not collect, store, or track any personal information about visitors.

## 9. Optional Features
- **Find My Races**: Uses your address (entered or browser location) to show relevant races. This information is not stored or transmitted to our servers.
- **Preferences**: We may store your display preferences (e.g., filters, favorites) in your browser's localStorage. This data never leaves your device.

## 10. Third-Party Services
- **Nominatim** (OpenStreetMap): Used for address geocoding. See their privacy policy at openstreetmap.org/privacy
- **GitHub Pages**: Hosts this site. See GitHub's privacy policy.

## 11. Your Rights
You can clear any locally stored data by clearing your browser's cache and localStorage.

Contact: [email]
```

### 6.4 Dependency Security

**Dependabot Configuration:**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "maintainer-username"
    labels:
      - "dependencies"
      - "security"
```

**Regular Security Audits:**

```bash
# Run regularly (automated in CI)
npm audit

# Fix vulnerabilities automatically
npm audit fix

# For breaking changes, review manually
npm audit fix --force
```

**Lock Files:**
```bash
# Always commit package-lock.json
# This ensures reproducible builds and security

# In .gitignore, do NOT ignore:
# package-lock.json
```

---

## 12. Testing Strategy

### 12.1 Testing Pyramid

```
                    /\
                   /  \
                  / E2E \              (10-15 tests, critical user flows)
                 /-------\
                /         \
               / Integration\          (30-50 tests, API/data processing)
              /-------------\
             /               \
            /   Unit Tests    \       (100+ tests, fast, isolated)
           /-------------------\
```

### 12.2 Unit Tests

**Data Processing Tests:**

```js
// tests/processing/contributor-classifier.test.js
import { describe, test, expect } from '@jest/globals';
import { classifyContributor } from '../../scripts/utils/contributor-classifier.js';

describe('Contributor Classifier', () => {
  test('classifies individual donor', () => {
    const row = {
      ContributorName: 'John Smith',
      EntityType: 'Individual',
      Amount: 500
    };
    expect(classifyContributor(row)).toBe('individual');
  });
  
  test('classifies unitemized contributions', () => {
    const row = {
      ContributorName: null,
      Amount: 75
    };
    expect(classifyContributor(row)).toBe('unitemized');
  });
  
  test('classifies corporate donor by entity type', () => {
    const row = {
      ContributorName: 'Acme Corporation',
      EntityType: 'Corporation',
      Amount: 5000
    };
    expect(classifyContributor(row)).toBe('corporate');
  });
  
  test('classifies corporate donor by name pattern', () => {
    const row = {
      ContributorName: 'Smith & Associates LLC',
      EntityType: 'Unknown',
      Amount: 5000
    };
    expect(classifyContributor(row)).toBe('corporate');
  });
  
  test('classifies self-contribution', () => {
    const row = {
      ContributorName: 'Jane Candidate',
      CandidateName: 'Jane Candidate',
      Amount: 10000
    };
    expect(classifyContributor(row)).toBe('self');
  });
  
  test('classifies PAC/committee', () => {
    const row = {
      ContributorName: 'Indiana Jobs PAC',
      EntityType: 'Committee',
      Amount: 2500
    };
    expect(classifyContributor(row)).toBe('committee');
  });
});
```

**Occupation Parser Tests:**

```js
// tests/processing/occupation-parser.test.js
import { describe, test, expect } from '@jest/globals';
import { parseOccupation } from '../../scripts/utils/occupation-parser.js';

describe('Occupation Parser', () => {
  test('identifies legal profession', () => {
    expect(parseOccupation('Attorney')).toBe('legal');
    expect(parseOccupation('Lawyer at Smith & Associates')).toBe('legal');
    expect(parseOccupation('Legal Counsel')).toBe('legal');
  });
  
  test('identifies medical profession', () => {
    expect(parseOccupation('Physician')).toBe('medical');
    expect(parseOccupation('Doctor - St. Vincent Hospital')).toBe('medical');
    expect(parseOccupation('M.D.')).toBe('medical');
  });
  
  test('identifies business profession', () => {
    expect(parseOccupation('Business Owner')).toBe('business');
    expect(parseOccupation('CEO')).toBe('business');
    expect(parseOccupation('Executive')).toBe('business');
  });
  
  test('identifies retired', () => {
    expect(parseOccupation('Retired')).toBe('retired');
    expect(parseOccupation('Retired Teacher')).toBe('retired');
  });
  
  test('identifies homemaker', () => {
    expect(parseOccupation('Homemaker')).toBe('homemaker');
    expect(parseOccupation('Stay at home parent')).toBe('homemaker');
  });
  
  test('handles unknown occupation', () => {
    expect(parseOccupation(null)).toBe('unknown');
    expect(parseOccupation('')).toBe('unknown');
    expect(parseOccupation('   ')).toBe('unknown');
  });
  
  test('handles uncategorizable occupation', () => {
    expect(parseOccupation('xyz123')).toBe('other');
    expect(parseOccupation('Random Job Title')).toBe('other');
  });
  
  test('is case-insensitive', () => {
    expect(parseOccupation('ATTORNEY')).toBe('legal');
    expect(parseOccupation('attorney')).toBe('legal');
    expect(parseOccupation('Attorney')).toBe('legal');
  });
});
```

**Data Validation Tests:**

```js
// tests/processing/data-validator.test.js
import { describe, test, expect } from '@jest/globals';
import { validateContribution, validateRace } from '../../scripts/utils/validators.js';

describe('Data Validator', () => {
  test('validates valid contribution', () => {
    const contrib = {
      id: 'contrib-123',
      date: '2024-03-15',
      amount: 1000,
      candidate_id: 'mike-braun',
      contributor_type: 'individual'
    };
    expect(validateContribution(contrib)).toBe(true);
  });
  
  test('rejects contribution with missing required fields', () => {
    const contrib = {
      id: 'contrib-123',
      date: '2024-03-15'
      // Missing amount, candidate_id
    };
    expect(() => validateContribution(contrib)).toThrow();
  });
  
  test('rejects contribution with invalid date', () => {
    const contrib = {
      id: 'contrib-123',
      date: 'not-a-date',
      amount: 1000,
      candidate_id: 'mike-braun'
    };
    expect(() => validateContribution(contrib)).toThrow('Invalid date format');
  });
  
  test('rejects contribution with negative amount', () => {
    const contrib = {
      id: 'contrib-123',
      date: '2024-03-15',
      amount: -100,
      candidate_id: 'mike-braun'
    };
    expect(() => validateContribution(contrib)).toThrow('Amount must be positive');
  });
});
```

**Run Unit Tests:**

```bash
# Install Jest
npm install --save-dev jest

# package.json
{
  "scripts": {
    "test": "node --test",
    "test:unit": "jest tests/processing/",
    "test:watch": "jest --watch"
  }
}

# Run tests
npm run test:unit

# With coverage
npm run test:unit -- --coverage
```

### 12.3 Integration Tests

**Data Pipeline Integration Test:**

```js
// tests/integration/pipeline.test.js
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { execSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import path from 'path';

describe('Data Pipeline Integration', () => {
  const testOutputDir = 'data/processed-test';
  
  beforeAll(() => {
    // Create test output directory
    mkdirSync(testOutputDir, { recursive: true });
    
    // Set up test fixtures in data/raw
    // (Copy test CSVs/JSONs to data/raw/)
  });
  
  afterAll(() => {
    // Clean up test data
    rmSync(testOutputDir, { recursive: true, force: true });
  });
  
  test('full pipeline runs without errors', () => {
    // Run processing with test data
    execSync('node scripts/process-data.js --test-mode', {
      env: { ...process.env, OUTPUT_DIR: testOutputDir }
    });
    
    execSync('node scripts/generate-summaries.js --test-mode', {
      env: { ...process.env, OUTPUT_DIR: testOutputDir }
    });
    
    // Verify outputs exist
    expect(existsSync(`${testOutputDir}/races-taxonomy.json`)).toBe(true);
    expect(existsSync(`${testOutputDir}/summary-all-races.json`)).toBe(true);
  });
  
  test('processed data has valid structure', () => {
    const taxonomy = JSON.parse(
      readFileSync(`${testOutputDir}/races-taxonomy.json`, 'utf8')
    );
    
    expect(Array.isArray(taxonomy)).toBe(true);
    expect(taxonomy.length).toBeGreaterThan(0);
    
    const firstRace = taxonomy[0];
    expect(firstRace).toHaveProperty('id');
    expect(firstRace).toHaveProperty('name');
    expect(firstRace).toHaveProperty('level');
    expect(firstRace).toHaveProperty('candidates');
    expect(Array.isArray(firstRace.candidates)).toBe(true);
  });
  
  test('summary data matches race data totals', () => {
    const summary = JSON.parse(
      readFileSync(`${testOutputDir}/summary-all-races.json`, 'utf8')
    );
    
    const taxonomy = JSON.parse(
      readFileSync(`${testOutputDir}/races-taxonomy.json`, 'utf8')
    );
    
    // Sum up all race totals
    const expectedTotal = taxonomy.reduce((sum, race) => {
      return sum + (race.summary?.total_raised || 0);
    }, 0);
    
    expect(summary.totals.total_raised).toBeCloseTo(expectedTotal, 2);
  });
  
  test('all race files are valid JSON', () => {
    const raceFiles = glob.sync(`${testOutputDir}/races/*.json`);
    
    expect(raceFiles.length).toBeGreaterThan(0);
    
    raceFiles.forEach(file => {
      const data = JSON.parse(readFileSync(file, 'utf8'));
      expect(Array.isArray(data)).toBe(true);
      
      // Each contribution should have required fields
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('id');
        expect(data[0]).toHaveProperty('date');
        expect(data[0]).toHaveProperty('amount');
      }
    });
  });
});
```

**Frontend Data Loading Test:**

```js
// tests/integration/data-loading.test.js
import { describe, test, expect } from '@jest/globals';
import DataLoader from '../../src/js/data-loader.js';

describe('Data Loader Integration', () => {
  test('loads races taxonomy successfully', async () => {
    const taxonomy = await DataLoader.loadRacesTaxonomy();
    
    expect(Array.isArray(taxonomy)).toBe(true);
    expect(taxonomy.length).toBeGreaterThan(0);
    expect(taxonomy[0]).toHaveProperty('id');
  });
  
  test('loads race detail successfully', async () => {
    // First get a race ID
    const taxonomy = await DataLoader.loadRacesTaxonomy();
    const firstRaceId = taxonomy[0].id;
    
    // Then load that race's details
    const raceData = await DataLoader.loadRaceDetail(firstRaceId);
    
    expect(Array.isArray(raceData)).toBe(true);
  });
  
  test('caches loaded data', async () => {
    // Clear cache first
    DataLoader.cache.clear();
    
    // First load
    const start1 = Date.now();
    await DataLoader.loadRacesTaxonomy();
    const time1 = Date.now() - start1;
    
    // Second load (should be from cache)
    const start2 = Date.now();
    await DataLoader.loadRacesTaxonomy();
    const time2 = Date.now() - start2;
    
    // Cache should be significantly faster
    expect(time2).toBeLessThan(time1 / 10);
  });
  
  test('handles missing files gracefully', async () => {
    await expect(
      DataLoader.loadRaceDetail('nonexistent-race-id')
    ).rejects.toThrow();
  });
});
```

### 12.4 End-to-End Tests (Playwright)

**Installation:**

```bash
npm install --save-dev @playwright/test
npx playwright install
```

**Homepage E2E Tests:**

```js
// tests/e2e/homepage.spec.js
import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });
  
  test('loads successfully', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/Indiana Campaign Finance/);
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('Indiana Campaign Finance');
    
    // Check status bar loads
    await expect(page.locator('#last-updated')).toBeVisible();
    await expect(page.locator('#last-updated')).not.toBeEmpty();
  });
  
  test('displays overview statistics', async ({ page }) => {
    // Check all stat cards are visible
    await expect(page.locator('#total-raised')).toBeVisible();
    await expect(page.locator('#total-contributors')).toBeVisible();
    await expect(page.locator('#active-races')).toBeVisible();
    await expect(page.locator('#total-candidates')).toBeVisible();
    
    // Stats should contain currency or numbers
    await expect(page.locator('#total-raised')).toContainText('$');
    
    const contributorsText = await page.locator('#total-contributors').textContent();
    expect(contributorsText).toMatch(/\d+/);
  });
  
  test('scope toggle filters data', async ({ page }) => {
    // Get initial race count
    const initialCount = await page.locator('#active-races').textContent();
    
    // Click "Completed" toggle
    await page.click('[data-scope="completed"]');
    
    // Wait for update
    await page.waitForTimeout(500);
    
    // Count should change
    const newCount = await page.locator('#active-races').textContent();
    expect(newCount).not.toBe(initialCount);
  });
  
  test('navigation links work', async ({ page }) => {
    // Click "Find My Races"
    await page.click('a[href="/find-my-races.html"]');
    await expect(page).toHaveURL(/find-my-races/);
    
    // Go back
    await page.goBack();
    
    // Click "Browse Races"
    await page.click('a[href="/races.html"]');
    await expect(page).toHaveURL(/races/);
  });
  
  test('charts render', async ({ page }) => {
    // Wait for charts to load
    await page.waitForSelector('#contrib-type-chart');
    await page.waitForSelector('#timeline-chart');
    
    // Check canvas elements exist and are visible
    const pieChart = page.locator('#contrib-type-chart');
    await expect(pieChart).toBeVisible();
    
    const timelineChart = page.locator('#timeline-chart');
    await expect(timelineChart).toBeVisible();
  });
  
  test('is mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Page should still be usable
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#total-raised')).toBeVisible();
    
    // Navigation should be accessible
    await expect(page.locator('nav')).toBeVisible();
  });
});
```

**Race Detail Page E2E Tests:**

```js
// tests/e2e/race-detail.spec.js
import { test, expect } from '@playwright/test';

test.describe('Race Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a specific race
    await page.goto('/race/us-senate-2024-general');
  });
  
  test('displays race information', async ({ page }) => {
    // Check race header
    await expect(page.locator('h1')).toContainText('Senate');
    
    // Check candidates displayed
    const candidateCards = page.locator('.candidate-card');
    await expect(candidateCards).toHaveCount(2);
    
    // Check each candidate has stats
    const firstCandidate = candidateCards.first();
    await expect(firstCandidate.locator('.total-raised')).toContainText('$');
  });
  
  test('phase toggle works', async ({ page }) => {
    // Check tabs exist
    await expect(page.locator('[data-phase="primary"]')).toBeVisible();
    await expect(page.locator('[data-phase="general"]')).toBeVisible();
    await expect(page.locator('[data-phase="full-cycle"]')).toBeVisible();
    
    // Click "Primary" tab
    await page.click('[data-phase="primary"]');
    
    // Verify primary data shown
    await expect(page.locator('.phase-indicator')).toContainText('Primary');
    
    // Click "General" tab
    await page.click('[data-phase="general"]');
    
    // Verify general data shown
    await expect(page.locator('.phase-indicator')).toContainText('General');
  });
  
  test('filtering updates visualizations', async ({ page }) => {
    // Get initial total
    const initialTotal = await page.locator('#filtered-total').textContent();
    
    // Open filter panel
    await page.click('#filter-toggle');
    
    // Wait for panel to open
    await expect(page.locator('#filter-panel')).toBeVisible();
    
    // Select "Large Donors" filter
    await page.check('[name="contribution-size"][value="large"]');
    
    // Apply filter
    await page.click('#apply-filters');
    
    // Wait for update
    await page.waitForTimeout(500);
    
    // Total should change
    const newTotal = await page.locator('#filtered-total').textContent();
    expect(newTotal).not.toBe(initialTotal);
  });
  
  test('raw data table loads on demand', async ({ page }) => {
    // Table should not be visible initially
    await expect(page.locator('#raw-data-table')).not.toBeVisible();
    
    // Click "View Detailed Data" button
    await page.click('#view-raw-data');
    
    // Wait for table to load
    await page.waitForSelector('#raw-data-table');
    
    // Table should now be visible
    await expect(page.locator('#raw-data-table')).toBeVisible();
    
    // Should have rows
    const rows = page.locator('#raw-data-table tbody tr');
    await expect(rows).toHaveCountGreaterThan(0);
  });
  
  test('export to CSV works', async ({ page }) => {
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.click('#export-csv');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify filename
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
  
  test('charts render correctly', async ({ page }) => {
    // Wait for all charts
    await page.waitForSelector('#contrib-type-chart');
    await page.waitForSelector('#timeline-chart');
    await page.waitForSelector('#geography-chart');
    
    // All should be visible
    await expect(page.locator('#contrib-type-chart')).toBeVisible();
    await expect(page.locator('#timeline-chart')).toBeVisible();
    await expect(page.locator('#geography-chart')).toBeVisible();
  });
});
```

**Find My Races E2E Tests:**

```js
// tests/e2e/find-my-races.spec.js
import { test, expect } from '@playwright/test';

test.describe('Find My Races', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/find-my-races.html');
  });
  
  test('address search works', async ({ page }) => {
    // Enter address
    await page.fill('#address-input', '200 W Washington St, Indianapolis, IN 46204');
    
    // Click search
    await page.click('#search-button');
    
    // Wait for results
    await page.waitForSelector('.race-results');
    
    // Should show federal races
    await expect(page.locator('.federal-races')).toBeVisible();
    await expect(page.locator('.federal-races')).toContainText('U.S. House');
    
    // Should show state races
    await expect(page.locator('.state-races')).toBeVisible();
  });
  
  test('geolocation works', async ({ page, context }) => {
    // Grant geolocation permission
    await context.grantPermissions(['geolocation']);
    
    // Set fake location (Indianapolis)
    await context.setGeolocation({ latitude: 39.7684, longitude: -86.1581 });
    
    // Click "Use My Location"
    await page.click('#use-location-button');
    
    // Wait for results
    await page.waitForSelector('.race-results');
    
    // Should show races
    await expect(page.locator('.race-results')).toContainText('Your Races');
  });
  
  test('handles invalid address', async ({ page }) => {
    // Enter invalid address
    await page.fill('#address-input', 'not a real address xyz123');
    
    // Click search
    await page.click('#search-button');
    
    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('address');
  });
});
```

**Run E2E Tests:**

```bash
# Run all tests
npx playwright test

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/e2e/homepage.spec.js

# Run with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Generate HTML report
npx playwright test --reporter=html
```

### 12.5 Performance Testing

**Lighthouse CI Configuration:**

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": [
        "https://hoosier-data.github.io/donor-data/",
        "https://hoosier-data.github.io/donor-data/races.html",
        "https://hoosier-data.github.io/donor-data/race/us-senate-2024-general"
      ]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.9 }],
        
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "interactive": ["error", { "maxNumericValue": 3500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        
        "total-byte-weight": ["warn", { "maxNumericValue": 500000 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

**Load Testing (Optional):**

```js
// tests/performance/load-test.js
// Using Artillery or k6 for load testing

// artillery.yml
config:
  target: "https://hoosier-data.github.io/donor-data"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Spike"

scenarios:
  - name: "Browse homepage"
    flow:
      - get:
          url: "/"
      - think: 3
      - get:
          url: "/data/processed/summary-all-races.json"
  
  - name: "View race detail"
    flow:
      - get:
          url: "/race/us-senate-2024-general"
      - think: 5
      - get:
          url: "/data/processed/races/us-senate-2024-general.json"
```

**Run Performance Tests:**

```bash
# Lighthouse
npm install -g @lhci/cli
lhci autorun

# Artillery (if using)
npm install -g artillery
artillery run artillery.yml
```

---

## 13. Scalability Considerations

### 13.1 Current Limitations

**GitHub Pages:**
- **Bandwidth:** Soft limit ~100 GB/month
  - Typical usage: 5-10 GB/month (with ~10K monthly users)
  - Peak usage: 20-30 GB/month
- **Build/Deployment:** 10 builds per hour (more than sufficient)
- **Repository Size:** Recommended <1 GB
  - Current processed data: ~45 MB (well within limits)
- **File Count:** No hard limit, but performance degrades >1000 files
  - Current: ~200 files (races + summaries + geo)

**GitHub Actions:**
- **Free Tier:** 2,000 minutes/month
  - Weekly updates: 4 runs × 30 min = 120 min/month (~6% of quota)
  - Headroom: 1,880 minutes for testing, manual runs
- **Storage:** 500 MB for artifacts
  - Not storing raw data as artifacts, so well within limit
- **Concurrent Jobs:** 20 (more than needed)

**FEC API:**
- **Rate Limit:** 1,000 requests/hour
  - Weekly fetch: ~50 requests (well within limit)
- **No cost**

### 13.2 Growth Scenarios and Mitigations

**Scenario 1: Traffic Spike (>100 GB bandwidth/month)**

**Indicators:**
- Bandwidth usage approaching 80 GB/month
- Page load times increasing
- GitHub Pages notices

**Mitigation Options:**

**Option A: Optimize Data Delivery**
```js
// 1. More aggressive compression
// Use Brotli instead of gzip (30% smaller)

// 2. Reduce initial payload
// Split summary files by level
summary-federal.json  // ~10 KB
summary-state.json    // ~15 KB
summary-county.json   // ~10 KB
summary-municipal.json // ~10 KB

// 3. Implement pagination for race lists
// Load 20 races at a time instead of all 145

// 4. Defer non-critical resources
<link rel="preload" href="critical.css">
<link rel="stylesheet" href="nice-to-have.css" media="print" onload="this.media='all'">
```

**Option B: Use External CDN**
```
Move to Cloudflare Pages (free tier: unlimited bandwidth)
or Netlify (free tier: 100 GB/month)
or Vercel (free tier: 100 GB/month)

Migration process:
1. Connect GitHub repo to new host
2. Configure build settings
3. Update DNS/CNAME
4. Keep GitHub Pages as fallback
```

**Option C: Request GitHub Sponsorship**
```
GitHub may increase limits for notable open source projects

Steps:
1. Document project impact (users, media citations, etc.)
2. Show current usage metrics
3. Contact GitHub Support
4. Reference GitHub's guidelines for open source projects
```

**Scenario 2: Data Volume Growth (>1 GB processed)**

**Causes:**
- More years of historical data
- More races added
- More detailed breakdowns

**Mitigation: Data Sharding**

```js
// Instead of:
/data/processed/races/
  us-senate-2024-general.json  // 400 KB
  us-senate-2022-general.json  // 400 KB
  us-senate-2020-general.json  // 400 KB
  // ... all years

// Split by year:
/data/processed/2024/races/
  us-senate-general.json
/data/processed/2022/races/
  us-senate-general.json
/data/processed/2020/races/
  us-senate-general.json

// Load only current year by default
// Archive older years, load on-demand
```

**Mitigation: Summary-Only Mode**

```js
// For historical data, store only summaries
// Full contribution details only for current cycle

/data/processed/2024/races/
  us-senate-general.json  // Full 400 KB

/data/processed/archives/2022/
  us-senate-general-summary.json  // Just 20 KB summary
  
// Link to "View full 2022 data" loads from archive
```

**Scenario 3: Processing Time >45 Minutes**

**Causes:**
- More data sources added
- More complex transformations
- Slower external APIs

**Mitigation: Optimize Scripts**

```js
// 1. Parallelize processing
import { Worker } from 'worker_threads';

async function processInParallel(files) {
  const workers = [];
  const chunkSize = Math.ceil(files.length / 4); // 4 workers
  
  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    workers.push(processChunk(chunk));
  }
  
  return Promise.all(workers);
}

// 2. Use streaming for large CSVs
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';

const stream = createReadStream('huge-file.csv')
  .pipe(parse({ columns: true }))
  .on('data', (row) => processRow(row))
  .on('end', () => finalize());

// 3. Incremental updates
// Only process new/changed contributions
const lastUpdate = await getLastUpdateTimestamp();
const newContribs = allContribs.filter(c => c.date > lastUpdate);
```

**Mitigation: Split Workflows**

```yaml
# Separate workflows for different data sources
# Run in parallel

# .github/workflows/update-indiana-data.yml
on:
  schedule:
    - cron: '0 2 * * 0'

# .github/workflows/update-fec-data.yml
on:
  schedule:
    - cron: '0 3 * * 0'  # 1 hour later

# Both trigger aggregation workflow when complete
```

**Scenario 4: Need for Real-Time Updates**

**Current:** Weekly batch updates
**Requirement:** Daily or hourly updates

**Mitigation: Incremental Processing**

```js
// Only process new filings since last update
async function incrementalUpdate() {
  const lastUpdate = await getLastUpdateTimestamp();
  
  // Fetch only new filings
  const newFilings = await fetchFilingsSince(lastUpdate);
  
  // Process only new contributions
  const newContribs = await processFilings(newFilings);
  
  // Merge with existing data
  await mergeContributions(newContribs);
  
  // Update only affected race files
  const affectedRaces = getAffectedRaces(newContribs);
  await updateRaces(affectedRaces);
  
  // Update summaries
  await updateSummaries();
}
```

### 13.3 Future Architecture Evolution

**Phase 1 (Current): Static Site + GitHub Actions**
```
Capacity: ~50K users/month, 145 races
Cost: $0/month
```

**Phase 2: Add Optional API (if needed)**
```
Static site remains primary
Add Cloudflare Workers or Netlify Functions for:
- Complex queries
- Real-time aggregations
- Custom reports

Capacity: ~200K users/month
Cost: $0-5/month (free tiers)
```

**Phase 3: Database Backend (if significant growth)**
```
Keep static site for browsing
Add read-only database for:
- Advanced filtering
- Complex joins
- Historical analysis

Options:
- PlanetScale (MySQL, free tier: 5 GB)
- Supabase (PostgreSQL, free tier: 500 MB)
- Railway (PostgreSQL, free tier: 500 MB)

Expose via Datasette or PostgREST
Capacity: 500K+ users/month
Cost: $0-10/month
```

**Phase 4: Dedicated Infrastructure (if major project)**
```
AWS S3 + CloudFront
or Google Cloud Storage + CDN
or Self-hosted

Data processing: AWS Lambda or Google Cloud Functions
Database: RDS or Cloud SQL

Capacity: Millions of users/month
Cost: ~$50-200/month
Funding: Grants, sponsorships, partnerships
```

---

## 14. Disaster Recovery

### 14.1 Backup Strategy

**Primary Backup: Git Repository**
- All processed data committed to Git
- Full history of every change
- Distributed copies (GitHub + every clone)
- Automatic backup via GitHub's infrastructure

**Secondary Backup: Local Archives**

```bash
# Maintainer keeps local backup
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/donor-data"
DATE=$(date +%Y%m%d)

# Clone or pull latest
if [ -d "$BACKUP_DIR/repo" ]; then
  cd "$BACKUP_DIR/repo"
  git pull
else
  git clone https://github.com/hoosier-data/donor-data.git "$BACKUP_DIR/repo"
fi

# Create timestamped archive
cd "$BACKUP_DIR"
tar -czf "donor-data-$DATE.tar.gz" repo/data/processed/

# Keep last 12 backups (3 months of weekly backups)
ls -t donor-data-*.tar.gz | tail -n +13 | xargs -r rm

echo "Backup complete: $BACKUP_DIR/donor-data-$DATE.tar.gz"
```

**Tertiary Backup: Raw Data Archive**

```bash
# Keep archive of raw data sources
# (Not in Git, stored separately)

/archives/
  2024/
    indiana-2024-contributions.csv
    indiana-2024-expenditures.csv
    fec-2024-responses.json
  2023/
    ...
    
# Store on external drive or cloud storage
# Useful if need to reprocess historical data
```

### 14.2 Recovery Procedures

**Scenario 1: GitHub Pages Down**

**Probability:** Very low (GitHub SLA: 99.9% uptime)
**Impact:** Site unavailable to users
**Detection:** UptimeRobot alert, user reports

**Recovery Steps:**

```bash
# Option A: Deploy to Alternative Host (Netlify)
# 1. Go to netlify.com, connect GitHub repo
# 2. Configure build settings:
#    Build command: (none, already built)
#    Publish directory: src/
# 3. Deploy
# 4. Update DNS if using custom domain
# Estimated time: 1-2 hours

# Option B: Deploy to Cloudflare Pages
# Similar process
# Estimated time: 1-2 hours

# Option C: Serve from S3 (if AWS account available)
aws s3 sync src/ s3://donor-data-bucket/ --acl public-read
aws s3 sync data/processed/ s3://donor-data-bucket/data/processed/ --acl public-read
# Configure CloudFront distribution
# Estimated time: 2-4 hours
```

**Scenario 2: Bad Data Committed**

**Probability:** Low (validation checks in place)
**Impact:** Incorrect visualizations, confused users
**Detection:** Automated tests fail, user reports, manual review

**Recovery Steps:**

```bash
# Step 1: Identify bad commit
git log --oneline -10
# Output:
# abc123 Data update: 2024-02-11  <-- BAD COMMIT
# def456 Data update: 2024-02-04  <-- GOOD COMMIT

# Step 2: Verify the issue
git show abc123:data/processed/summary-all-races.json
# Review the data

# Step 3: Revert the commit
git revert abc123
# This creates a new commit that undoes abc123

# Step 4: Or reset to good commit (if no other changes since)
git reset --hard def456
git push --force origin main
# WARNING: --force overwrites history, use carefully

# Step 5: Verify fix
curl https://hoosier-data.github.io/donor-data/data/processed/metadata.json

# Step 6: Investigate root cause
# Fix script bug, add validation, prevent recurrence

# Estimated time: 30 minutes - 1 hour
```

**Scenario 3: Repository Accidentally Deleted**

**Probability:** Extremely low (requires multiple confirmations)
**Impact:** Total loss if no backups
**Detection:** GitHub email, maintainer notices

**Recovery Steps:**

```bash
# If deleted within 90 days, GitHub can restore
# Contact GitHub Support immediately

# If beyond recovery, restore from backup
cd ~/backups/donor-data/repo
git remote set-url origin https://github.com/hoosier-data/donor-data.git
git push --force origin main
# This recreates the repository

# Re-enable GitHub Pages in settings
# Re-configure GitHub Actions secrets

# Estimated time: 2-4 hours
```

**Scenario 4: GitHub Actions Quota Exceeded**

**Probability:** Very low (current usage ~6% of quota)
**Impact:** No automatic updates
**Detection:** GitHub email notification, workflow fails

**Recovery Steps:**

```bash
# Immediate: Run manual update locally
cd ~/projects/donor-data
git pull
npm run update:all
git add data/processed/
git commit -m "Manual data update: $(date +%Y-%m-%d)"
git push origin main

# Estimated time: 30 minutes

# Long-term: Optimize workflow to reduce minutes
# - Cache dependencies more aggressively
# - Skip unnecessary steps
# - Process only changed data

# Or: Request quota increase from GitHub
# Or: Upgrade to GitHub Team ($4/user/month)
```

**Scenario 5: Data Source Unavailable**

**Probability:** Low-Medium
**Impact:** Cannot fetch new data
**Detection:** Workflow failure, 404 errors in logs

**Recovery Steps:**

```bash
# If Indiana campaign finance site is down:
# 1. Check status page / contact site admin
# 2. Use cached raw data from previous week
# 3. Add notice to site: "Data current as of [last successful update]"
# 4. Continue with FEC data only
# 5. Retry Indiana data next week

# If FEC API is down:
# 1. Check api.open.fec.gov status
# 2. Use FEC bulk downloads as alternative:
wget https://www.fec.gov/files/bulk-downloads/2024/indiv24.zip
# 3. Process bulk file instead of API
# 4. Update fetch script to handle both sources

# Estimated time: 1-2 hours for workaround
```

**Scenario 6: Maintainer Unavailable**

**Probability:** Medium (life happens)
**Impact:** No updates, no issue responses
**Detection:** Issues piling up, no commits for >2 weeks

**Recovery Steps:**

**Preventive Measures:**
```bash
# 1. Comprehensive documentation (this architecture doc)
# 2. Clear README with runbook
# 3. Add co-maintainer with repository access
# 4. Automated processes continue working

# Recovery if needed:
# 1. Co-maintainer takes over
# 2. Or community member forks and continues
# 3. Or project goes dormant (data still accessible)

# Documentation is key:
README.md               # How to run
docs/RUNBOOK.md        # Common operations
docs/TROUBLESHOOTING.md # Known issues
docs/ARCHITECTURE.md    # This document
```

### 14.3 Monitoring and Alerts

**Critical Alerts (immediate action needed):**

1. **Data Update Workflow Fails**
   ```yaml
   # In .github/workflows/update-data.yml
   - name: Create issue on failure
     if: failure()
     uses: actions/github-script@v6
     with:
       script: |
         github.rest.issues.create({
           owner: context.repo.owner,
           repo: context.repo.repo,
           title: '⚠️ Data Update Failed - ' + new Date().toISOString(),
           body: 'Check logs at: ' + context.serverUrl + '/' + context.repo.owner + '/' + context.repo.repo + '/actions/runs/' + context.runId,
           labels: ['automation', 'critical', 'bug']
         })
   ```

2. **Site Unavailable**
   ```
   UptimeRobot configuration:
   - Monitor: https://hoosier-data.github.io/donor-data/
   - Check interval: 5 minutes
   - Alert contacts: maintainer email, SMS
   - Threshold: 2 consecutive failures
   ```

3. **Deployment Failure**
   ```yaml
   # GitHub Actions sends email on workflow failure
   # No additional configuration needed
   ```

**Warning Alerts (investigate soon):**

1. **Data Quality Issues**
   ```js
   // In generate-summaries.js
   const warnings = [];
   
   if (totalRaised < expectedMinimum) {
     warnings.push('Total raised unexpectedly low');
   }
   
   if (contributionCount < expectedMinimum) {
     warnings.push('Contribution count unexpectedly low');
   }
   
   if (warnings.length > 0) {
     console.warn('Data quality warnings:', warnings);
     // Create GitHub issue with warning label
   }
   ```

2. **Performance Degradation**
   ```yaml
   # Lighthouse CI creates comment on PR if scores drop
   # Reviewed during PR process
   ```

3. **Security Vulnerabilities**
   ```
   Dependabot automatically creates PRs for:
   - Security updates (high priority)
   - Version updates (low priority)
   
   Review and merge weekly
   ```

**Informational (nice to know):**

1. **Successful Updates**
   ```
   Logged in GitHub Actions output
   Visible in commit history
   No alert needed
   ```

2. **Usage Statistics** (if analytics enabled)
   ```
   Review monthly:
   - Page views
   - Top races viewed
   - Export downloads
   - Mobile vs desktop ratio
   ```

### 14.4 Incident Response Plan

**Severity Levels:**

**Critical (P0):** Site completely down
- Response time: 1 hour
- Resolution time: 4 hours
- Owner: Lead maintainer

**High (P1):** Major functionality broken (charts not loading, data severely incorrect)
- Response time: 4 hours
- Resolution time: 24 hours
- Owner: Lead maintainer

**Medium (P2):** Minor functionality issues (one filter broken, some data missing)
- Response time: 24 hours
- Resolution time: 1 week
- Owner: Any maintainer

**Low (P3):** Cosmetic issues, feature requests
- Response time: 1 week
- Resolution time: Best effort
- Owner: Community

**Incident Response Template:**

```markdown
## 15. Incident Report: [Title]

**Date:** [YYYY-MM-DD]
**Severity:** [P0/P1/P2/P3]
**Status:** [Investigating/Identified/Monitoring/Resolved]

### 15.1 Timeline
- HH:MM - Issue detected
- HH:MM - Investigation began
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Verified resolved

### 15.2 Impact
- Users affected: [number or percentage]
- Duration: [X hours/minutes]
- Features impacted: [list]

### 15.3 Root Cause
[Description of what went wrong]

### 15.4 Resolution
[What was done to fix it]

### 15.5 Prevention
[What we'll do to prevent this in the future]
- [ ] Add test case
- [ ] Improve monitoring
- [ ] Update documentation
- [ ] Code review process
```

---

**This completes sections 6-10. Would you like me to continue with the remaining sections (11-13: Maintenance, Documentation, and Appendix)?**