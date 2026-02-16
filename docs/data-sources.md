# Data Sources
   
## Indiana Campaign Finance

**Source:** https://campaignfinance.in.gov

**Files:**
- Contributions: [https://campaignfinance.in.gov/PublicSite/Docs/BulkDataDownloads/2024_ContributionData.csv.zip]
- Expenditures: [https://campaignfinance.in.gov/PublicSite/Docs/BulkDataDownloads/2024_ExpenditureData.csv.zip]

**Update Frequency:** [Daily/Weekly/Monthly]

**CSV Schema: Contributions**
- FileNumber - identifier for the filing entry
- CommitteeType - type of committee that gave money
- Committee - name of committee of contributor
- CandidateName - name of candidate that the money was given to
- ContributorType - type of contributor [individual, corporation, various organizations]
- Name - mailing name of contributor
- Address - mailing address line one of contributor
- City - mailing city of contributor
- State - mailing state of contributor
- Zip - mailing zip of contributor
- Occupation - occupation of contributor
- Type - type of contribution? seemes to mostly have values of [Direct, unitemized, misc]
- Description - description of contribution
- Amount - amount of contribution in USD
- ContributionDate - date of contribution in `YYYY-MM-DD HH:mm:ss` format
- Received_By - person or role that received the contribution
- Amended - ? maybe count of amended? I mostly see a value of "0" here.

**Sample Record:**
```csv
"17","Regular Party","Indiana Republican State Committee, Inc","","Corporation","Cardwell Home Center","3205  Madison Ave","Indianapolis","IN","46227","Other","Direct","","300.0000","2024-05-13 00:00:00","Treasurer","0"
```

**Notes:**
- New lines are not escaped in many text columns

## Federal Election Commission API
   
**Source:** https://api.open.fec.gov/v1
**Documentation:** https://api.open.fec.gov/developers/

**API Key Required:** Yes (free)
**Rate Limit:** 1,000 requests/hour

**Endpoints Used:**
- `/candidates/` - Get candidate information
- `/schedules/schedule_a/` - Get contributions (itemized)
- `/committee/{id}/` - Get committee details

**Sample Response:**
```json
{
  "active_through": 2024,
  "candidate_id": "S2IN00364",
  "candidate_inactive": false,
  "candidate_status": "N",
  "cycles": [
    2022,
    2024
  ],
  "district": "00",
  "district_number": 0,
  "election_districts": [
    null,
    "00"
  ],
  "election_years": [
    2022,
    2024
  ],
  "federal_funds_flag": false,
  "first_file_date": null,
  "has_raised_funds": false,
  "inactive_election_years": null,
  "incumbent_challenge": "C",
  "incumbent_challenge_full": "Challenger",
  "last_f2_date": null,
  "last_file_date": null,
  "load_date": "2024-09-26T21:01:17",
  "name": "ALVAREZ, ANTONIO XAVIER",
  "office": "S",
  "office_full": "Senate",
  "party": "W",
  "party_full": "WRITE-IN",
  "state": "IN"
}
```