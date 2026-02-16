# Product Requirements Document: Indiana Campaign Finance Transparency Platform

## 1. Executive Summary

### 1.1 Product Overview
A free, open-source web application that aggregates Indiana campaign finance data and presents it through interactive visualizations and filterable views. The platform enables citizens, journalists, and researchers to understand political fundraising patterns across federal, state, county, and municipal races in Indiana.

### 1.2 Core Value Proposition
- **Zero-cost operation**: Static site hosted on GitHub Pages with no backend infrastructure
- **Automated updates**: GitHub Actions refresh data weekly without manual intervention
- **Accessible insights**: Complex campaign finance data presented through intuitive visualizations
- **Current focus**: Shows active campaigns and recently completed elections, not historical archives

### 1.3 Success Metrics
- User engagement: Time spent on site, filters applied, races explored
- Data freshness: Successful automated updates within 24 hours of new filings
- Accessibility: Mobile usability scores, page load performance
- Community value: GitHub stars, data citations by journalists/researchers

---

## 2. Data Sources & Processing

### 2.1 Primary Data Sources

**Indiana State Campaign Finance:**
- Source: `campaignfinance.in.gov`
- Format: Annual CSV files (contributions and expenditures)
- Coverage: State, county, and municipal races (2000-present)
- Update frequency: Weekly automated fetch via GitHub Actions

**Federal Election Commission:**
- Source: FEC.gov / OpenFEC API
- Format: API responses + bulk downloads
- Coverage: Federal races in Indiana (US Senate, US House)
- Update frequency: Weekly automated fetch via GitHub Actions

### 2.2 Data Processing Pipeline

**GitHub Actions Workflow (weekly schedule):**

1. **Fetch Phase**
   - Download latest Indiana CSV files for current and previous year
   - Query FEC API for Indiana federal candidates
   - Store raw data in `/data/raw/`

2. **Transform Phase**
   - Parse contributor data from CSVs
   - Normalize addresses, names, amounts
   - Classify contributor types (individual, corporate, committee, self)
   - Parse occupation fields to derive industry categories
   - Assign contributions to race phases (primary vs general)
   - Handle unitemized contributions (aggregates under $100)

3. **Aggregate Phase**
   - Generate summary statistics by race
   - Create pre-computed rollups by:
     - Race level (federal/state/county/municipal)
     - Contributor type
     - Contribution size tiers
     - Geographic origin
     - Time period
   - Build race taxonomy file with metadata

4. **Output Phase**
   - Generate optimized JSON files for visualizations
   - Create GeoJSON boundary files for district mapping
   - Update "last refreshed" timestamp
   - Commit processed data to repository
   - Trigger GitHub Pages deployment

**File Structure:**
```
/data
  /raw/                          # Not committed (gitignored)
  /processed/
    races-taxonomy.json          # Race metadata and hierarchy
    summary-all-races.json       # Top-level aggregate stats
    summary-by-level.json        # Federal/state/county/municipal rollups
    /races/
      us-senate-2024-primary-rep.json
      us-senate-2024-general.json
      governor-2024-primary-dem.json
      [individual race detail files]
  /geo/
    congressional-districts.geojson
    state-house-districts.geojson
    state-senate-districts.geojson
    counties.geojson
```

### 2.3 Data Quality & Limitations

**Known Data Quality Issues:**
- Occupation field is free-text (not standardized) and only required for $1,000+ donors
- Address quality varies across filings
- Some corporations misclassified as individuals or vice versa
- Unitemized contributions show only aggregate totals (no individual donor details)
- Historical data may have incomplete fields

**Handling Approach:**
- Display data completeness statistics (e.g., "457 of 892 donors have occupation data")
- Include "Unknown/Not Reported" as explicit category in all breakdowns
- Show confidence indicators where data quality is questionable
- Document limitations in site footer and about page

---

## 3. User Experience & Interface Design

### 3.1 Information Architecture

```
Homepage
├─ Data Status Bar
│  └─ "Last Updated: [date] | Next Update: [date] | Data through: [date]"
│
├─ Scope Toggle
│  └─ [Active Campaigns] [Recent Results] [All Current Data]
│
├─ Overview Statistics (all races, respects scope toggle)
│  ├─ Total $ raised
│  ├─ Total contributors
│  ├─ Breakdown by race level (federal/state/county/municipal)
│  └─ Top 5 races by fundraising
│
├─ Primary Navigation
│  ├─ Find My Races (address-based)
│  ├─ Browse by Race Level
│  └─ Search for Specific Race
│
└─ Featured Visualizations
   ├─ Contributor type distribution (pie/bar chart)
   ├─ Contribution timeline (all races combined)
   └─ Geographic heatmap (where money comes from)

Individual Race Page
├─ Race Header
│  ├─ Race name, date, type
│  ├─ Phase toggle: [Primary] [General] [Full Cycle]
│  └─ Candidates with summary stats
│
├─ Summary Visualizations
│  ├─ Total raised by candidate
│  ├─ Contributor type breakdown
│  ├─ Contribution size distribution
│  ├─ Timeline of contributions (with primary date marker)
│  ├─ Top donors (if itemized)
│  └─ Geographic origin (in-district vs out)
│
├─ Filter Panel (collapsible)
│  ├─ Primary Filters: Candidate, Date Range
│  ├─ Secondary Filters: Contributor Type, Amount Range, Geography
│  └─ Advanced: Occupation Category, Repeat Donors
│
└─ Raw Data Section (lazy-loaded)
   ├─ "View Detailed Contribution Data" button
   ├─ Sortable/filterable table
   ├─ Export as CSV
   └─ Share filtered view (URL parameters)
```

### 3.2 Core User Flows

#### Flow 1: Explore My Local Races
1. User clicks "Find My Races"
2. Enters address or allows geolocation
3. System geocodes to lat/lng, performs point-in-polygon check against district boundaries
4. Shows list of relevant races:
   - Federal: US House district, US Senate (if on ballot)
   - State: Governor (if on ballot), State House district, State Senate district
   - County: County-level offices
   - Municipal: City/town offices (if in municipality)
5. User clicks on a race to see detailed page
6. Can toggle between active/completed scope

#### Flow 2: Compare Candidates in a Race
1. User navigates to specific race (via search or browse)
2. Default view shows both candidates with summary stats side-by-side
3. Visualizations compare:
   - Total $ raised
   - Average contribution size
   - % from individuals vs corporations vs PACs
   - % from in-district vs out-of-district
   - Top industries (from occupation parsing)
4. User applies filters to drill down (e.g., "Show only donations over $1,000")
5. Filtered view updates all visualizations and tables
6. User can share URL with filters applied

#### Flow 3: Analyze Donor Patterns
1. User starts at homepage aggregate view
2. Applies filter: "Federal Races" + "Large Donors ($1,000+)"
3. Sees aggregate stats across all federal races
4. Clicks into specific race to see breakdown
5. Toggles to "Primary" phase to see primary-specific fundraising
6. Exports filtered data as CSV for further analysis

### 3.3 Progressive Disclosure Strategy

**Complexity Management:**
- **Level 1 (Always visible):** Race selector, scope toggle, top-line stats
- **Level 2 (One click away):** Standard filters (date, candidate, contributor type)
- **Level 3 (Advanced):** Occupation parsing, repeat donor analysis, detailed tables

**Mobile Simplification:**
- Prioritize 2-3 key charts on mobile
- Tables become horizontally scrollable cards
- Filters collapse into modal drawer
- "Compare" features limited on small screens

### 3.4 Responsive Breakpoints
- **Desktop:** Full feature set, side-by-side comparisons, complex filters
- **Tablet (768px):** Stacked layouts, simplified filters, essential charts
- **Mobile (375px):** Card-based navigation, single-column, core stats only

---

## 4. Data Model & Taxonomy

### 4.1 Race Taxonomy

```typescript
interface Race {
  id: string;                    // e.g., "us-senate-in-2024-general"
  name: string;                  // e.g., "U.S. Senate - Indiana"
  year: number;                  // 2024
  date: string;                  // "2024-11-05" (ISO 8601)
  level: "federal" | "state" | "county" | "municipal";
  subtype: string;               // "statewide", "congressional", "legislative", "local"
  phase: "primary" | "general";
  party?: string;                // Only for primaries
  jurisdiction: string;          // "statewide", "district", "county", "city"
  district?: string;             // For district races
  county?: string;               // For county/municipal races
  municipality?: string;         // For municipal races
  status: "active" | "completed";
  candidates: Candidate[];
}

interface Candidate {
  id: string;
  name: string;
  party: string;
  committee_id: string;          // Links to campaign finance filings
  primary_result?: "won" | "lost" | "pending";
  general_result?: "won" | "lost" | "pending";
  total_raised: number;
  total_contributors: number;
}
```

### 4.2 Contribution Data Model

```typescript
interface Contribution {
  id: string;
  date: string;                  // ISO 8601
  amount: number;
  candidate_id: string;
  race_id: string;
  phase: "primary" | "general";
  reporting_period: string;      // "pre-primary-2024", "pre-election-2024", etc.
  
  // Contributor info (null for unitemized)
  contributor_name?: string;
  contributor_address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  contributor_occupation?: string;
  
  // Derived fields
  contributor_type: "individual" | "corporate" | "committee" | "self" | "unitemized";
  contribution_size: "small" | "medium" | "large" | "mega";  // <$100, $100-999, $1000-9999, $10000+
  is_in_district: boolean;
  is_in_state: boolean;
  is_repeat_donor: boolean;
  occupation_category?: string;  // Parsed from occupation field
}
```

### 4.3 Derived Categories

**Contributor Type:**
- `individual`: Natural person
- `corporate`: Business entity (must be incorporated)
- `committee`: PAC, party committee, or other candidate committee
- `self`: Candidate's own contribution/loan
- `unitemized`: Aggregate of contributions under $100

**Contribution Size:**
- `small`: Under $100 (typically unitemized)
- `medium`: $100-$999
- `large`: $1,000-$9,999
- `mega`: $10,000+

**Occupation Categories** (parsed from free text):
- `business`: Business owner, executive, entrepreneur
- `legal`: Attorney, lawyer, legal professional
- `medical`: Doctor, physician, healthcare provider
- `education`: Teacher, professor, administrator
- `finance`: Banker, financial advisor, accountant
- `real_estate`: Realtor, developer, property management
- `retired`: Retired individuals
- `homemaker`: Homemaker, stay-at-home parent
- `labor`: Union member, trade worker
- `technology`: Software, IT, tech industry
- `agriculture`: Farmer, agricultural business
- `government`: Government employee, elected official
- `nonprofit`: Nonprofit sector employee
- `other`: Unable to categorize
- `unknown`: Not reported

**Geographic Categories:**
- `in_district`: Donor address within race's district/jurisdiction
- `in_state`: Donor address within Indiana (but outside district)
- `out_of_state`: Donor address outside Indiana

---

## 5. Technical Implementation

### 5.1 Technology Stack

**Frontend:**
- **Framework:** Vanilla JavaScript or lightweight React (TBD based on complexity needs)
- **Visualization:** Chart.js (simpler, good defaults) or D3.js (if complex custom charts needed)
- **Mapping:** Leaflet.js with Turf.js for geospatial operations
- **Styling:** Tailwind CSS
- **Build:** Vite (optional, for bundling/minification if needed)

**Backend/Processing:**
- **Automation:** GitHub Actions (YAML workflows) + local npm scripts for manual runs
- **Processing:** Node.js with modern ES modules
- **Key Libraries:**
  - `papaparse` - CSV parsing
  - `axios` - HTTP requests for data fetching
  - `date-fns` - Date manipulation and formatting
  - `fast-csv` - CSV writing for processed data
  - `turf` - Geospatial calculations (if needed in processing)
- **Storage:** Git repository (processed JSON files)

**Hosting:**
- **Platform:** GitHub Pages (free)
- **Organization:** `hoosier-data` GitHub organization
- **Repository:** `donor-data`
- **URL:** `hoosier-data.github.io/donor-data`
- **CDN:** GitHub Pages automatic CDN (global edge caching)

**Development Environment:**
- **Node.js:** 18+ (LTS)
- **Package Manager:** npm (comes with Node.js)
- **Version Control:** Git
- **Editor:** VS Code recommended (good Node.js/JS tooling)

### 5.2 GitHub Actions Workflow & Manual Fallback

#### 5.2.1 Automated Updates via GitHub Actions

```yaml
name: Update Campaign Finance Data
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday at 2 AM UTC
  workflow_dispatch:      # Allow manual trigger from GitHub UI

jobs:
  update-data:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Fetch Indiana campaign finance data
        run: node scripts/fetch-indiana-data.js
      
      - name: Fetch FEC data
        run: node scripts/fetch-fec-data.js
        env:
          FEC_API_KEY: ${{ secrets.FEC_API_KEY }}
      
      - name: Process and transform data
        run: node scripts/process-data.js
      
      - name: Generate aggregates and summaries
        run: node scripts/generate-summaries.js
      
      - name: Update last refresh timestamp
        run: node scripts/update-metadata.js
      
      - name: Commit and push changes
        run: |
          git config --local user.name "GitHub Action"
          git config --local user.email "action@github.com"
          git add data/processed/
          git commit -m "Data update: $(date -u +%Y-%m-%d)" || echo "No changes"
          git push
```

#### 5.2.2 Manual/Offline Update Process

**Purpose:** Allows maintainer to run data updates locally if GitHub Actions quota is exceeded or for testing/debugging.

**Requirements:**
- Node.js 18+ installed locally
- Git repository cloned
- FEC API key (if fetching federal data)

**Setup (one-time):**
```bash
# Clone repository
git clone https://github.com/hoosier-data/donor-data.git
cd donor-data

# Install dependencies
npm install

# Create .env file with any needed credentials
echo "FEC_API_KEY=your_key_here" > .env
```

**Running Manual Update:**
```bash
# Run the complete update pipeline
npm run update:all

# Or run individual steps
npm run fetch:indiana     # Fetch Indiana data
npm run fetch:fec         # Fetch FEC data
npm run process           # Process raw data
npm run aggregate         # Generate summaries
npm run metadata          # Update timestamps

# Review changes
git status
git diff data/processed/

# Commit and push
git add data/processed/
git commit -m "Manual data update: $(date +%Y-%m-%d)"
git push origin main
```

**package.json scripts:**
```json
{
  "scripts": {
    "fetch:indiana": "node scripts/fetch-indiana-data.js",
    "fetch:fec": "node scripts/fetch-fec-data.js",
    "process": "node scripts/process-data.js",
    "aggregate": "node scripts/generate-summaries.js",
    "metadata": "node scripts/update-metadata.js",
    "update:all": "npm run fetch:indiana && npm run fetch:fec && npm run process && npm run aggregate && npm run metadata",
    "dev": "node scripts/dev-server.js",
    "test": "node --test"
  }
}
```

**Offline Mode:**
If you need to work completely offline or want to test processing with existing raw data:

```bash
# Process existing raw data without fetching
npm run process
npm run aggregate
npm run metadata
```

**Benefits of Node.js for Scripts:**
- Familiar syntax (JavaScript)
- Great libraries for CSV parsing (papaparse, csv-parse)
- Easy HTTP requests (node-fetch, axios)
- Good JSON manipulation (native)
- Same language as potential frontend
- npm ecosystem for data processing tools

**Key Dependencies:**
```json
{
  "dependencies": {
    "papaparse": "^5.4.1",      // CSV parsing
    "axios": "^1.6.0",           // HTTP requests
    "dotenv": "^16.3.1",         // Environment variables
    "date-fns": "^2.30.0",       // Date manipulation
    "fast-csv": "^5.0.0"         // CSV writing
  },
  "devDependencies": {
    "eslint": "^8.50.0"          // Code quality
  }
}
```

#### 5.2.3 Script Organization

**Directory Structure:**
```
donor-data/
├── scripts/
│   ├── fetch-indiana-data.js      # Downloads IN campaign finance CSVs
│   ├── fetch-fec-data.js          # Queries FEC API for federal races
│   ├── process-data.js            # Transforms raw data to standard format
│   ├── generate-summaries.js      # Creates aggregate/summary JSONs
│   ├── update-metadata.js         # Updates last-updated timestamps
│   ├── utils/
│   │   ├── csv-parser.js          # CSV reading utilities
│   │   ├── contributor-classifier.js  # Categorize donors
│   │   ├── occupation-parser.js   # Parse occupation into categories
│   │   ├── geocoder.js            # Address normalization
│   │   └── race-taxonomy.js       # Race categorization logic
│   └── dev-server.js              # Local dev server for testing
├── data/
│   ├── raw/                       # .gitignored, temp storage
│   └── processed/                 # Committed JSON outputs
├── src/                           # Frontend code
│   ├── index.html
│   ├── js/
│   └── css/
├── .github/
│   └── workflows/
│       └── update-data.yml        # GitHub Actions workflow
├── package.json
├── .gitignore
├── .env.example                   # Template for local credentials
└── README.md
```

**Script Flow:**
```
fetch-indiana-data.js
    ↓ (downloads CSVs to data/raw/)
fetch-fec-data.js
    ↓ (downloads FEC JSON to data/raw/)
process-data.js
    ↓ (reads from data/raw/, writes to data/processed/)
generate-summaries.js
    ↓ (reads from data/processed/, writes summaries)
update-metadata.js
    ↓ (updates data/processed/metadata.json)
[Git commit and push]
```

### 5.3 Client-Side Performance Optimization

**Lazy Loading Strategy:**
1. Initial page load: Load only summary JSON (~50KB)
2. User filters/navigates: Load specific race files on-demand
3. User clicks "View Raw Data": Load detailed contribution table
4. User clicks "Find My Races": Load GeoJSON boundaries (~500KB total)

**File Size Targets:**
- Summary files: <100KB each
- Individual race files: <500KB each
- GeoJSON files: <1MB total (gzipped)
- Full page load (before interactions): <300KB

**Caching Strategy:**
- Set long cache headers on processed JSON (update via new filename on changes)
- Use service worker for offline access (optional, future enhancement)
- Compress all JSON with gzip

### 5.4 Browser Compatibility
- **Target:** Last 2 versions of Chrome, Firefox, Safari, Edge
- **Minimum:** ES6 support, no IE11
- **Progressive enhancement:** Core functionality works without JavaScript (basic tables), visualizations require JS

---

## 6. Feature Specifications

### 6.1 Find My Races

**Requirements:**
- User inputs address or allows browser geolocation
- System determines which races apply to that address
- Display relevant races grouped by level
- Handle edge cases (address on district boundary, unincorporated areas)

**Technical Implementation:**

**Phase 1: Client-Side Geocoding**
- Use Nominatim API (free, no key required) to convert address → lat/lng
- Fallback to browser geolocation API if address input skipped
- Cache geocoded results in localStorage to avoid repeat API calls

**Phase 2: District Lookup**
- Load relevant GeoJSON boundary files (lazy load on demand)
- Use Turf.js `booleanPointInPolygon()` to check which districts contain the point
- Check in order: congressional → state house → state senate → county → municipality

**Phase 3: Race Filtering**
- Query races-taxonomy.json for races matching determined districts
- Filter by status (active/completed based on scope toggle)
- Handle primaries: Show party-specific primaries before primary date, consolidated general after

**Edge Cases:**
- **Address on boundary:** Show both districts with disclaimer
- **No municipality:** Don't show municipal races
- **Invalid address:** Show state-wide races only
- **Out of state:** Show error message

**UI Mockup:**
```
┌─────────────────────────────────────────┐
│ Find My Races                           │
│ ┌─────────────────────────────────────┐ │
│ │ Enter your address                  │ │
│ │ 123 Main St, Indianapolis, IN 46204 │ │
│ └─────────────────────────────────────┘ │
│               [Search]  [Use My Location]│
└─────────────────────────────────────────┘

Your Races (Marion County):

Federal Races
├─ U.S. House District 7
│  └─ Carson (D) vs Opponent (R)
│      Total raised: $1.2M | 3,245 contributors
└─ U.S. Senate
   └─ Brown (D) vs Banks (R)
       Total raised: $8.5M | 12,450 contributors

State Races
├─ Governor
│  └─ Smith (R) vs Jones (D)
└─ State House District 89
   └─ [candidate info]

[Show County Races] [Show Municipal Races]
```

### 6.2 Race-Level Filtering

**Primary Filter: Race Level**
- Federal (US Senate, US House)
- State (Governor, Lt. Governor, Attorney General, Secretary of State, Auditor, Treasurer, State House, State Senate)
- County (Sheriff, Prosecutor, Clerk, Assessor, etc.)
- Municipal (Mayor, City Council, Town Council)

**Behavior:**
- Selecting a level filters all visualizations and aggregate stats
- Count of races shown in parentheses (e.g., "Federal (3 races)")
- Can multi-select levels (e.g., show Federal + State together)

**Implementation:**
```javascript
const filteredRaces = allRaces.filter(race => 
  selectedLevels.includes(race.level) &&
  (scopeToggle === 'all' || race.status === scopeToggle)
);

const aggregateStats = calculateAggregates(filteredRaces);
updateVisualizations(aggregateStats);
```

### 6.3 Phase Filtering (Primary vs General)

**Behavior:**
- **On aggregate views:** Show toggle for "All Phases | Primary Only | General Only"
- **On individual race pages:** Show tabs for "Primary | General | Full Cycle"
- **Timeline visualizations:** Mark primary date with vertical line, color-code phases

**Data Handling:**
- Contributions tagged with `phase` field during processing
- Aggregate stats calculate separately for each phase
- "Full Cycle" sums both phases

**Special Cases:**
- Races with no primary (unopposed): Hide primary tab
- Races between primary and general: Show both tabs, mark general as "upcoming"
- Uncontested primaries: Show as single phase

### 6.4 Contributor Analysis Features

**Breakdown Visualizations:**

1. **By Contributor Type** (Pie or Stacked Bar)
   - Individual (% and $)
   - Corporate (% and $)
   - Committee (PAC/Party) (% and $)
   - Self-funded (% and $)
   - Unitemized (% and $)

2. **By Contribution Size** (Histogram)
   - Under $100
   - $100-$249
   - $250-$499
   - $500-$999
   - $1,000-$4,999
   - $5,000-$9,999
   - $10,000+

3. **By Geography** (Map + Pie)
   - In-district/in-jurisdiction
   - Elsewhere in Indiana
   - Out of state
   - Interactive map showing choropleth by county/ZIP

4. **By Occupation** (Bar chart, top 10 categories)
   - Only for donations $1,000+
   - Show data completeness: "Based on X of Y donors with reported occupations"

5. **Timeline** (Line or Area chart)
   - Cumulative $ raised over time
   - Overlay multiple candidates for comparison
   - Mark key dates (filing deadlines, debates, primary date)

**Interactivity:**
- Click on chart segment to filter (e.g., click "Corporate" to see only corporate donors)
- Hover for tooltips with exact figures
- Toggle candidates on/off in multi-candidate views

### 6.5 Raw Data Table

**Features:**
- Lazy loaded (only when user clicks "View Detailed Data")
- Sortable by any column
- Filterable/searchable
- Paginated (50 rows per page)
- Export to CSV with current filters applied

**Columns:**
- Date
- Contributor Name (or "Unitemized" for aggregates)
- Amount
- Contributor Type
- Address (city, state)
- Occupation (if available)
- Candidate
- Phase (Primary/General)

**Privacy Consideration:**
- All data is already public record (from state filings)
- No additional PII exposed beyond what's in official reports
- Consider redacting detailed addresses on export (show only city/state)

### 6.6 Comparison Mode

**Use Case:** User wants to compare two candidates side-by-side

**Implementation:**
- On race page, default view shows all candidates
- Each candidate gets a column in summary stats
- Charts show side-by-side or overlaid comparisons
- Filters apply to all candidates simultaneously

**Comparison Metrics:**
- Total raised
- Average contribution size
- Contributor count
- % from in-district
- % from individuals vs corporate vs PAC
- Top donor industries
- Fundraising trajectory (timeline)

---

## 7. Primary Election Handling

### 7.1 Data Model for Primaries

**Race Structure:**
```json
{
  "id": "governor-2024-primary-republican",
  "name": "Republican Primary - Governor",
  "year": 2024,
  "date": "2024-05-07",
  "level": "state",
  "subtype": "statewide",
  "phase": "primary",
  "party": "Republican",
  "status": "completed",
  "general_race_id": "governor-2024-general",
  "candidates": [
    {
      "id": "mike-braun",
      "name": "Mike Braun",
      "party": "Republican",
      "primary_result": "won",
      "advanced_to_general": true
    }
  ]
}
```

**Linked General Election:**
```json
{
  "id": "governor-2024-general",
  "name": "Governor",
  "year": 2024,
  "date": "2024-11-05",
  "level": "state",
  "subtype": "statewide",
  "phase": "general",
  "status": "active",
  "primary_races": [
    "governor-2024-primary-republican",
    "governor-2024-primary-democratic"
  ],
  "candidates": [
    {
      "id": "mike-braun",
      "name": "Mike Braun",
      "party": "Republican",
      "from_primary": "governor-2024-primary-republican"
    },
    {
      "id": "jennifer-mccormick",
      "name": "Jennifer McCormick",
      "party": "Democratic",
      "from_primary": "governor-2024-primary-democratic"
    }
  ]
}
```

### 7.2 Candidate Journey Tracking

**Scenario:** Candidate runs in primary, wins, continues to general

**Data Representation:**
```json
{
  "candidate_id": "mike-braun",
  "races": [
    {
      "race_id": "governor-2024-primary-republican",
      "phase": "primary",
      "contributions": {
        "total": 2500000,
        "count": 3450,
        "itemized": 2200000,
        "unitemized": 300000
      }
    },
    {
      "race_id": "governor-2024-general",
      "phase": "general",
      "contributions": {
        "total": 5500000,
        "count": 7800,
        "itemized": 5100000,
        "unitemized": 400000
      }
    }
  ],
  "total_cycle": {
    "total": 8000000,
    "count": 11250
  }
}
```

**UI Treatment:**

**Individual Candidate Page:**
```
Mike Braun - Republican
Governor 2024

[Primary] [General] [Full Cycle]

Primary Phase (Jan - May 2024)
├─ Total Raised: $2.5M
├─ Contributors: 3,450
└─ [Visualizations for primary only]

General Phase (May - Nov 2024)
├─ Total Raised: $5.5M
├─ Contributors: 7,800
└─ [Visualizations for general only]

Full Cycle (Jan - Nov 2024)
├─ Total Raised: $8.0M
├─ Contributors: 11,250
└─ [Combined visualizations]
```

### 7.3 Primary vs General Analysis

**Key Differences to Highlight:**

1. **Donor Base Shift:**
   - Primary: Often dominated by party activists, ideological donors
   - General: Broader base, more moderate donors, party establishment

2. **Contribution Patterns:**
   - Primary: Smaller average contributions, more grassroots
   - General: Larger contributions, more PAC/party money

3. **Geographic Distribution:**
   - Primary: May concentrate in certain regions
   - General: Broader state-wide support

**Visualization: Phase Comparison Chart**
```
                Primary    General
Avg. Donation   $725      $705
In-District     45%       38%
Corporate       12%       28%
PAC Money       8%        35%
Out-of-State    15%       22%
```

### 7.4 Timeline Visualization with Phases

**Implementation:**
```
Fundraising Timeline - Governor 2024

$8M ┤                                    
$7M ┤                                    ╱
$6M ┤                              ╱────╯
$5M ┤                        ╱────╯     
$4M ┤                  ╱────╯            
$3M ┤            ╱────╯ │                
$2M ┤      ╱────╯       │                
$1M ┤ ╱───╯             │                
$0  └─────────────────────────────────
    Jan  Feb  Mar  Apr May Jun Jul Aug Sep Oct Nov
                        │
                     Primary
                    (May 7)

    [─── Primary Phase ───][─── General Phase ───]
```

**Features:**
- Vertical line marks primary election date
- Color-coded segments (light blue = primary, dark blue = general)
- Shaded regions to distinguish phases
- Annotations for key events (filing deadlines, debates)

### 7.5 Primary-Specific Reporting

**Indiana's Primary Reporting Schedule:**
- **Pre-primary report**: Due April 19, 2024 (covers Jan 1 - Apr 12)
- **Primary supplemental**: 48-hour reports for large contributions (Apr 13 - May 5)
- **Pre-election report**: Due Oct 18, 2024 (covers Apr 13 - Oct 11)

**Mapping to Phases:**
```python
def assign_phase(contribution_date, report_type, primary_date):
    if report_type in ['pre-primary', 'primary-supplemental']:
        return 'primary'
    elif report_type in ['pre-election', 'general-supplemental']:
        return 'general'
    elif report_type == 'annual':
        # Annual reports span both phases
        return 'primary' if contribution_date < primary_date else 'general'
    else:
        return 'unknown'
```

### 7.6 Edge Cases

**Unopposed Primary:**
- Only one candidate filed in party primary
- Don't create separate primary race entity
- All contributions assigned to general election phase

**Candidate Loses Primary:**
- Show primary fundraising data
- Mark as "Did not advance to general"
- Include in aggregate primary stats but not general

**Write-In or Independent Candidates:**
- No primary phase
- All contributions in "general" phase
- Start date is filing deadline (later than primary candidates)

**Convention Nominations (Libertarians):**
- Treated as primary-equivalent
- Separate "convention phase" if significant fundraising occurs before convention

---

## 8. Non-Functional Requirements

### 8.1 Performance

**Page Load Targets:**
- Initial homepage load: <2 seconds
- Individual race page: <3 seconds
- Filter application: <500ms
- Data export: <5 seconds for 10,000 rows

**Optimization Strategies:**
- Minify and compress all JSON files
- Use progressive loading (skeleton screens)
- Implement virtual scrolling for large tables
- Cache processed data aggressively

### 8.2 Accessibility (WCAG 2.1 AA Compliance)

**Requirements:**
- Keyboard navigation for all interactive elements
- Screen reader support with proper ARIA labels
- Color contrast ratios meet 4.5:1 minimum
- Text resizable to 200% without loss of functionality
- Alt text for all charts (textual data description)

**Specific Implementations:**
- Charts include data tables as accessible fallback
- Filter controls are form elements (not styled divs)
- Focus indicators clearly visible
- Skip navigation links for long pages

### 8.3 Browser Support

**Tier 1 (Full support):**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Tier 2 (Degraded experience):**
- Older versions with ES6 support
- Simplified visualizations, no advanced features

**Not supported:**
- Internet Explorer (any version)

### 8.4 Mobile Experience

**Responsive Design:**
- Mobile-first approach
- Touch-optimized controls (44px minimum tap targets)
- Simplified navigation on small screens
- Essential features only on <600px width

**Performance on Mobile:**
- Reduce initial payload for mobile users
- Lazy load images and heavy components
- Test on 3G network speeds

### 8.5 Security & Privacy

**Data Privacy:**
- All data is already public record (no additional PII collected)
- No user tracking or analytics (unless explicitly opted in)
- No cookies required for core functionality
- Optional localStorage only for user preferences

**Content Security:**
- Content Security Policy (CSP) headers
- No inline scripts (use external JS files)
- Subresource Integrity (SRI) for CDN resources

### 8.6 SEO & Discoverability

**Optimization:**
- Semantic HTML with proper heading hierarchy
- Meta descriptions for each race page
- Open Graph tags for social sharing
- Sitemap.xml generated during build
- Structured data markup (JSON-LD) for races and candidates

**URL Structure:**
```
/                                    # Homepage
/races                              # All races
/races/federal                      # Federal races
/races/state                        # State races
/race/us-senate-2024-general       # Individual race
/race/us-senate-2024-general/braun # Individual candidate
/my-races                           # Find my races tool
/about                              # About the project
```

---

## 9. Future Enhancements (V2+)

### 9.1 Enhanced Analysis Features

**Donor Network Analysis:**
- Visualize connections between donors across races
- Identify donors who contribute to multiple candidates
- Cluster analysis of donor patterns

**Predictive Insights:**
- Compare current fundraising to historical patterns
- "Fundraising pace" indicator (ahead/behind previous cycles)
- Early warning for competitive races based on money flow

**Expenditure Analysis:**
- Show not just contributions but how money is spent
- Vendor analysis (who gets campaign contracts)
- Media spending vs. ground game spending

### 9.2 Notifications & Alerts

**Email/RSS Subscriptions:**
- Alert when new filings are processed
- Notify when a race reaches fundraising milestone
- Weekly digest of campaign finance activity

**Customizable Alerts:**
- "Notify me when [candidate] receives contribution over [$amount]"
- "Alert on new large donors to [race]"

### 9.3 API for Researchers

**Public API Endpoints:**
- RESTful API exposing processed data
- JSON responses with filtering/pagination
- Rate-limited but freely accessible
- Documentation with example queries

**Example Endpoints:**
```
GET /api/races?level=federal&year=2024
GET /api/race/{race_id}/contributions?min_amount=1000
GET /api/candidate/{candidate_id}/summary
```

### 9.4 Comparative Tools

**Cross-State Comparisons:**
- Partner with similar projects in other states
- Compare Indiana to neighboring states (Illinois, Ohio, Michigan)
- Benchmark against national trends

**Historical Trends:**
- Expand to include multiple election cycles
- Inflation-adjusted contribution analysis
- Long-term donor behavior tracking

### 9.5 Data Quality Improvements

**Occupation Parser Enhancement:**
- Machine learning model to better categorize occupations
- User-submitted corrections/improvements
- Confidence scores for automated classifications

**Address Standardization:**
- Geocode all itemized contributions
- More accurate district matching
- Identify duplicate donors with slight address variations

### 9.6 Community Features

**User Annotations:**
- Allow users to flag questionable contributions
- Community notes on unusual patterns
- Moderated discussion per race

**Data Corrections:**
- Submit corrections to data quality issues
- Crowdsourced occupation categorization
- Report broken links or outdated information

---

## 10. Success Criteria & Metrics

### 10.1 Launch Success (First 3 Months)

**Adoption Metrics:**
- 1,000+ unique visitors
- 500+ races explored
- 100+ data exports
- 5+ media citations

**Technical Metrics:**
- 99% uptime (GitHub Pages + Actions)
- <3 second average page load
- 100% successful weekly data updates
- Zero critical bugs

### 10.2 Long-Term Success (6-12 Months)

**Impact Metrics:**
- 10,000+ monthly active users
- Referenced in 20+ news articles
- Used by at least 3 academic researchers
- Cited in policy discussions or legislation

**Community Metrics:**
- 50+ GitHub stars
- 10+ community contributions (bug reports, PRs)
- 5+ feature requests from users
- Active social media presence (if established)

### 10.3 Data Quality Metrics

**Coverage:**
- 100% of races with available campaign finance data included
- <7 day lag between state filing and site update
- 95%+ of contributions accurately categorized

**Accuracy:**
- <1% error rate in automated categorization
- User-reported issues resolved within 2 weeks
- Annual audit against source data

---

## 11. Launch Plan

### 11.1 Development Phases

**Phase 0: Setup (Week 1)**
- Create GitHub organization and repository
- Set up Node.js project structure
- Configure GitHub Actions
- Test manual update process locally
- Fetch first dataset and verify processing

**Phase 1: Data Pipeline (Weeks 2-3)**
- Implement all fetch scripts (Indiana + FEC)
- Build processing pipeline (CSV → JSON transformation)
- Create contributor classification logic
- Generate first set of summary JSONs
- Verify automated updates work via Actions

**Phase 2: Basic Frontend (Weeks 4-5)**
- Create homepage with aggregate stats
- Build race listing pages
- Implement basic filtering
- Add simple visualizations (Chart.js bar/pie charts)
- Mobile-responsive layout

**Phase 3: Core Features (Weeks 6-7)**
- Individual race detail pages
- "Find My Races" tool with geocoding
- Data export functionality
- Timeline visualizations
- Primary vs general phase handling

**Phase 4: Polish (Weeks 8-9)**
- Advanced filtering UI
- Accessibility improvements
- Performance optimization
- Cross-browser testing
- Documentation and about pages

**Phase 5: Launch (Week 10)**
- User testing with small group
- Bug fixes and refinements
- Soft launch and gather feedback
- Public announcement

### 11.2 Pre-Launch Checklist

**Technical:**
- [ ] All GitHub Actions running successfully
- [ ] Data processing tested on full dataset
- [ ] Cross-browser testing complete
- [ ] Mobile testing on real devices
- [ ] Accessibility audit passed
- [ ] Performance benchmarks met
- [ ] Analytics set up (if using)

**Content:**
- [ ] About page explaining data sources
- [ ] Methodology documentation
- [ ] Privacy policy (even if minimal)
- [ ] Contact information
- [ ] Data limitations clearly stated
- [ ] Last updated timestamp visible

**Legal/Ethical:**
- [ ] Verify all data is public record
- [ ] Confirm no ToS violations for data sources
- [ ] Appropriate disclaimers (not election advice, etc.)
- [ ] Open source license chosen (MIT/Apache/GPL)

### 11.3 Launch Communications

**Target Audiences:**
1. Local journalists covering politics
2. Good government / transparency advocates
3. Political science academics in Indiana
4. Engaged citizens and activists
5. Tech/civic hacking community

**Outreach Channels:**
- Email to Indiana political reporters
- Post to r/Indiana, r/Indianapolis, r/civichacking
- Tweet to local political Twitter accounts
- Submit to Hacker News, Product Hunt
- Reach out to Indiana civic tech organizations

**Launch Messaging:**
- "Follow the money in Indiana politics"
- "Free, open-source tool for campaign finance transparency"
- "See who's funding your local candidates"
- "Built by Hoosiers, for Hoosiers"

---

## 12. Risks & Mitigation

### 12.1 Technical Risks

**Risk: Data source changes format/structure**
- **Impact:** High - breaks automated pipeline
- **Mitigation:** Implement schema validation, alert on parsing failures, manual review of first run each month

**Risk: GitHub Actions quota exceeded**
- **Impact:** Medium - no data updates
- **Likelihood:** Low (weekly runs = ~4 runs/month, ~30 min each = 120 min/month)
- **Detection:** GitHub emails when approaching limit, dashboard shows usage
- **Mitigation:** 
  - Manual fallback process (npm scripts) documented and tested
  - Optimize workflow to reduce run time
  - Consider reducing frequency if approaching limits
  - Monitor Actions usage monthly
  - If consistently hitting limits, evaluate switching to manual updates or finding sponsorship

**Risk: Large files cause performance issues**
- **Impact:** Medium - poor user experience
- **Mitigation:** Aggressive optimization, pagination, lazy loading, CDN

**Risk: Node.js version incompatibility**
- **Likelihood:** Low
- **Impact:** Medium - scripts fail
- **Mitigation:** Lock to Node 18 LTS, test locally before pushing, use GitHub Actions version matrix if needed

### 12.2 Data Quality Risks

**Risk: Errors in source data**
- **Impact:** Medium - inaccurate visualizations
- **Mitigation:** Data validation checks, user reporting mechanism, periodic manual audits

**Risk: Occupation parser miscategorizes donors**
- **Impact:** Low - specific analysis affected
- **Mitigation:** Show confidence scores, allow user corrections, clear disclaimers

**Risk: Incomplete or late filings**
- **Impact:** Low - temporary data gaps
- **Mitigation:** Display "last updated" dates, note when data is preliminary

### 12.3 Legal/Ethical Risks

**Risk: Accused of bias in data presentation**
- **Impact:** High - credibility damage
- **Mitigation:** Non-partisan presentation, show all candidates equally, transparent methodology

**Risk: Data used for harassment**
- **Impact:** Medium - reputational damage
- **Mitigation:** Show only what's in public record, consider not displaying full addresses in UI (though in exports)

**Risk: Copyright claims on data**
- **Impact:** Low - unlikely as public records
- **Mitigation:** Clearly cite sources, consult with legal if questions arise

### 12.4 Sustainability Risks

**Risk: Maintainer burnout**
- **Impact:** High - project abandonment
- **Mitigation:** Keep scope manageable, automate everything possible, document for handoff

**Risk: Costs creep up**
- **Impact:** Low - but could force shutdown
- **Mitigation:** Stay within GitHub free tier, no external services with costs, optimize for efficiency

**Risk: Lack of community adoption**
- **Impact:** Medium - wasted effort
- **Mitigation:** Start with personal utility, target small engaged audience first, be useful before being comprehensive

---

## 13. Branding & Domain Strategy

### 13.1 Proposed Branding

**Organization Name:** `hoosier-data`  
**Repository Name:** `donor-data`  
**URL:** `hoosier-data.github.io/donor-data`

**Alternative Repository Names to Consider:**
- `campaign-finance` (more formal/descriptive)
- `campaign-money` (plain language)
- `political-donors` (specific but clear)
- `follow-the-money` (catchier, but common phrase)

**Alternative Organization Names:**
- `indiana-open-data`
- `hoosier-transparency`
- `in-civic-data`

### 13.2 GitHub Account Strategy

**Creating a Separate Organization Account:**

**Advantages:**
- Professional separation from personal projects
- Can add collaborators without giving them access to personal repos
- Better branding/discoverability
- Can create multiple related projects under same umbrella
- Free for public repositories

**GitHub Free Tier Protections:**
- GitHub allows multiple accounts as long as they're not used to abuse resources
- One person can own multiple organizations legitimately
- Your use case (civic data transparency) is explicitly allowed
- As long as you're using Actions within the free tier (2,000 minutes/month per org), you're fine

**Recommendation:**
Create the `hoosier-data` organization account. This positions it as:
1. A civic data initiative (not personal project)
2. Extensible to other Indiana datasets (tax data, voting data, legislation tracking, etc.)
3. More trustworthy for users (looks like an organization, not individual)

**Future Expansion Potential:**
```
hoosier-data/
├── donor-data (campaign finance)
├── voting-data (election results, turnout)
├── budget-data (state/local budgets)
└── legislation-tracker (bill tracking)
```

### 13.3 Custom Domain (Optional Future Enhancement)

**Current Plan:** Use `hoosier-data.github.io/donor-data`

**Future Options:**
- Register `hoosierdata.org` or `hoosieropendata.org` (~$12/year)
- Point to GitHub Pages with custom domain
- Benefits: Shorter URL, more professional, memorable
- Still free hosting, just own the domain name

**Implementation (when ready):**
```bash
# In repository root
echo "hoosierdata.org" > CNAME

# Configure DNS with registrar
# A records pointing to GitHub Pages IPs:
# 185.199.108.153
# 185.199.109.153
# 185.199.110.153
# 185.199.111.153
```

---

## 14. Appendix

### 14.1 Key Terms & Definitions

**Itemized Contribution:** Individual contribution over $100 that must be reported with donor details (name, address, occupation if over $1,000).

**Unitemized Contribution:** Contributions of $100 or less that are reported only in aggregate, without individual donor identification.

**CFA-4 Form:** Indiana's standard campaign finance report form used by candidates to disclose receipts and expenditures.

**CFA-11 Form:** "48-hour report" required for large contributions ($1,000+) received close to an election.

**Principal Committee:** The main campaign finance committee designated by a candidate to accept contributions and make expenditures.

**PAC (Political Action Committee):** An organization that raises and spends money to elect or defeat candidates.

**In-Kind Contribution:** Non-cash contribution of goods or services (e.g., office space, printing, volunteer labor above certain thresholds).

**Transfer:** Movement of funds between campaign finance committees (not a "contribution" in technical sense).

### 14.2 Indiana Campaign Finance Key Dates (2024 Example)

- January 17: Annual reports due for 2023
- April 19: Pre-primary reports due
- May 7: Primary election
- October 18: Pre-election reports due
- November 5: General election
- January 21, 2025: Annual reports due for 2024

### 14.3 Reference Links

**Data Sources:**
- Indiana Campaign Finance: https://campaignfinance.in.gov
- Federal Election Commission: https://www.fec.gov
- Indiana Election Division: https://www.in.gov/sos/elections

**Technical Resources:**
- GitHub Pages: https://pages.github.com
- Chart.js: https://www.chartjs.org
- Turf.js: https://turfjs.org
- Nominatim API: https://nominatim.org

**Relevant Law:**
- Indiana Code Title 3-9 (Campaign Finance): https://iga.in.gov/laws/2023/ic/titles/3#3-9

### 14.4 Open Questions for Initial Development

1. **Branding:** Final decision on `donor-data` vs alternatives? Domain purchase timeline?

2. **Visualization priorities:** Which 3-5 charts are most important for MVP? Chart.js (simpler) or D3.js (more powerful)?

3. **Occupation parsing:** Build from scratch or use existing libraries? How much manual curation is acceptable?

4. **GeoJSON sources:** Where to get authoritative district boundaries? Indiana GIS portal? Census TIGER files?

5. **FEC API usage:** Do we need to request higher rate limits? What's our backup if API is down?

6. **Mobile tables:** Virtual scrolling library or simple pagination? Trade-offs?

7. **Export format:** Just CSV or also JSON? Excel-friendly formatting?

8. **Update notifications:** How to let users know when new data is available without building email infrastructure?

---

## 15. Initial Setup Checklist

### 15.1 Creating the Organization & Repository

**Step 1: Create GitHub Organization**
1. Go to github.com, click "+" → "New organization"
2. Choose "Create a free organization"
3. Name: `hoosier-data`
4. Email: Your email
5. Select "My personal account" (not a company)
6. Skip team members for now
7. Complete setup

**Step 2: Create Repository**
1. In `hoosier-data` organization, click "New repository"
2. Name: `donor-data`
3. Description: "Campaign finance transparency for Indiana elections"
4. Public repository
5. Initialize with README
6. Add `.gitignore` (Node template)
7. Choose license: MIT recommended (permissive, widely used for civic tech)
8. Create repository

**Step 3: Enable GitHub Pages**
1. Go to repository Settings → Pages
2. Source: Deploy from branch
3. Branch: `main` (or `gh-pages` if you prefer separation)
4. Folder: `/` (root) or `/docs` if you organize that way
5. Save
6. Note your URL: `https://hoosier-data.github.io/donor-data`

**Step 4: Set Up Local Development**
```bash
# Clone the repository
git clone https://github.com/hoosier-data/donor-data.git
cd donor-data

# Initialize Node.js project
npm init -y

# Install dependencies
npm install papaparse axios dotenv date-fns fast-csv

# Create directory structure
mkdir -p scripts/utils data/raw data/processed src/js src/css .github/workflows

# Create .env.example
echo "FEC_API_KEY=your_key_here" > .env.example

# Add data/raw to .gitignore
echo "data/raw/" >> .gitignore
echo ".env" >> .gitignore
```

**Step 5: Configure GitHub Actions**
1. Get FEC API key from https://api.open.fec.gov/developers/
2. In repository Settings → Secrets and variables → Actions
3. New repository secret: `FEC_API_KEY`
4. Create `.github/workflows/update-data.yml` (from workflow above)

**Step 6: Initial Commit**
```bash
git add .
git commit -m "Initial project setup"
git push origin main
```

### 15.2 First Data Run (Local)

Before relying on GitHub Actions, test the entire pipeline locally:

```bash
# 1. Create first fetch script (start simple)
# scripts/fetch-indiana-data.js - just download one CSV

# 2. Run it locally
node scripts/fetch-indiana-data.js

# 3. Verify data/raw/ has downloaded files
ls -lh data/raw/

# 4. Create simple processor
# scripts/process-data.js - parse one CSV

# 5. Run processing
node scripts/process-data.js

# 6. Verify data/processed/ has JSON
ls -lh data/processed/

# 7. Commit processed data
git add data/processed/
git commit -m "Initial data: 2024 contributions"
git push
```

Once local processing works, enable GitHub Actions.

---

## 16. Document Control

**Version:** 1.0  
**Date:** February 15, 2026  
**Author:** Product Team  
**Status:** Final Draft

**Revision History:**
- v1.0 (2026-02-15): Initial PRD based on discovery conversation
- Updated with Node.js implementation details
- Updated with branding strategy (hoosier-data/donor-data)
- Added manual fallback process documentation

**Approvals Needed:**
- [ ] Technical feasibility review
- [ ] Legal review (data usage, disclaimers)
- [ ] Design review (UI/UX mockups)
- [ ] Community feedback (if applicable)

**Next Steps:**
1. Review and refine PRD
2. Create technical architecture document
3. Set up development environment
4. Begin Phase 0 implementation (repository setup)
5. Develop first data fetching script