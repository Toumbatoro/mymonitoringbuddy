# MyMonitoringBuddy - Project Recap

**Created:** January 2026  
**Author:** Abdelaziz (with Claude)  
**Live URL:** https://becencabot.github.io/mymonitoringbuddy/  
**Repository:** https://github.com/becencabot/mymonitoringbuddy

---

## 1. Project Overview

### What It Does

MyMonitoringBuddy is an **Africa news anomaly detection dashboard** that:

- Monitors 18+ RSS feeds from major international and regional news sources
- Tracks mentions of all 54 African countries
- Compares current coverage to a 30-day rolling baseline
- Flags unusual spikes that may signal notable events
- Updates automatically every 3 hours via GitHub Actions

### Target Users

- Humanitarian analysts
- Conflict researchers
- NGO monitoring teams
- Journalists covering Africa

### Core Value Proposition

Instead of manually scanning dozens of news sources, analysts can glance at the dashboard to see **which countries are getting unusual attention** and prioritize their focus accordingly.

---

## 2. Technical Architecture

### Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 (JSX with Babel standalone) |
| Backend | Python 3.11 (fetcher script) |
| Hosting | GitHub Pages (static) |
| Automation | GitHub Actions (cron every 3 hours) |
| Data | JSON files (no database) |

### File Structure

```
mymonitoringbuddy/
├── index.html                    # HTML entry point, loads React + Babel
├── isitquiet-dashboard.jsx       # React dashboard (932 lines)
├── fetcher.py                    # Python RSS fetcher (510 lines)
├── isitquiet_feeds.json          # RSS feed configuration (18 feeds)
├── requirements.txt              # Python dependency: feedparser
├── README.md                     # Project documentation
├── .gitignore                    # Git ignore rules
├── data/
│   ├── output.json               # Dashboard data (generated)
│   └── history.json              # Rolling baseline data (generated)
└── .github/
    └── workflows/
        └── update.yml            # GitHub Actions workflow
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS                           │
│                  (runs every 3 hours)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    fetcher.py                               │
│  1. Load RSS feeds from isitquiet_feeds.json                │
│  2. Fetch articles from 18+ sources                         │
│  3. Match articles to 54 countries (smart regex)            │
│  4. Extract signal keywords                                 │
│  5. Load history.json for baseline calculation              │
│  6. Calculate anomaly ratios                                │
│  7. Assign status: quiet/normal/elevated/high               │
│  8. Save to data/output.json                                │
│  9. Update history.json with today's counts                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  data/output.json                           │
│  - generated_at: timestamp                                  │
│  - summary: {high, elevated, normal, quiet}                 │
│  - countries: {name: {articles, ratio, status, ...}}        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              isitquiet-dashboard.jsx                        │
│  - Fetches data/output.json                                 │
│  - Renders interactive treemap                              │
│  - Region filtering (All Africa, North, West, etc.)         │
│  - Country selection → article list                         │
│  - Color coding by anomaly ratio                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Key Features

### Dashboard Components

| Component | Description |
|-----------|-------------|
| **Explainer** | Left panel with project description and usage instructions |
| **RegionFilter** | Filter by All Africa or 5 sub-regions (North, West, Central, East, South) |
| **Treemap** | Grid of country cards, sized by article count, colored by anomaly ratio |
| **SourcesPanel** | Shows articles for selected country with clickable URLs |
| **Methodology** | Explains data sources, anomaly detection, and limitations |

### Color Coding

| Color | Ratio | Status | Meaning |
|-------|-------|--------|---------|
| Gray | 0 | Quiet | No recent mentions |
| Green | ≤1.5× | Normal | Typical coverage |
| Yellow | 1.5-2.5× | Elevated | Above average attention |
| Red | >2.5× | High | Significant spike |

### Country Matching

The fetcher uses smart regex patterns to avoid false matches:

- **Word boundaries:** "Niger" won't match "Nigeria"
- **Negative lookahead:** "Sudan" won't match "South Sudan"
- **Aliases:** Handles "Ivory Coast" = "Côte d'Ivoire", "DRC" = "Democratic Republic of Congo"

### Baseline Calculation

| Phase | Condition | Behavior |
|-------|-----------|----------|
| Startup | < 3 days of data | Uses hardcoded defaults per country |
| Rolling | ≥ 3 days of data | Calculates 30-day rolling average |

Baselines are stored in `data/history.json` and update automatically.

---

## 4. RSS Feed Sources

### International (5)
- BBC Africa
- Al Jazeera
- Reuters Africa
- DW Africa
- The Guardian Africa

### Francophone (6)
- RFI Afrique
- RFI Africa EN
- France24 Afrique
- France24 Africa EN
- Le Monde Afrique
- Jeune Afrique

### Regional (4)
- Africanews
- AllAfrica
- The East African
- Daily Maverick

### Humanitarian (3)
- The New Humanitarian
- UN News Africa
- ReliefWeb

---

## 5. Countries Covered (54)

### North Africa (6)
Morocco, Algeria, Tunisia, Libya, Egypt, Sudan

### West Africa (16)
Mauritania, Mali, Burkina Faso, Niger, Senegal, Gambia, Guinea-Bissau, Guinea, Sierra Leone, Liberia, Côte d'Ivoire, Ghana, Togo, Benin, Nigeria, Cape Verde

### Central Africa (10)
Chad, Cameroon, CAR, South Sudan, Eq. Guinea, Gabon, Congo, DRC, São Tomé, Angola

### East Africa (13)
Eritrea, Djibouti, Ethiopia, Somalia, Uganda, Kenya, Rwanda, Burundi, Tanzania, Madagascar, Comoros, Mauritius, Seychelles

### Southern Africa (9)
Zambia, Malawi, Mozambique, Zimbabwe, Namibia, Botswana, South Africa, Eswatini, Lesotho

---

## 6. Known Limitations

1. **Low-baseline countries:** Small countries like Comoros can show "elevated" from a single random article (statistical noise vs. signal issue)

2. **RSS coverage gaps:** Not all countries have equal media coverage; Francophone sources help but gaps remain

3. **No topic classification:** An article about fashion and an article about conflict both count equally

4. **Baseline calibration:** System needs ~30 days to build accurate rolling baselines

5. **Language bias:** Primarily English and French sources; Arabic, Portuguese, Swahili sources not included

6. **Update frequency:** 3-hour intervals may miss fast-breaking stories

---

## 7. Future Improvements (V2 Ideas)

| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| Topic classification | High | High | Tag articles as Politics/Security/Health/Economy |
| Minimum article threshold | Low | Medium | Require 2+ articles for "elevated" status |
| Historical sparklines | Medium | Medium | Show 30-day trend per country |
| Email/Slack alerts | Medium | High | Notify when countries go "high" |
| Expand RSS feeds | High | Medium | Hard to find quality feeds for small countries |
| Arabic/Portuguese sources | High | Medium | Would improve coverage for North/Lusophone Africa |

---

## 8. Deployment & Operations

### Initial Deployment

1. Create GitHub repository
2. Upload all files (ensure `.github` folder is included)
3. Enable GitHub Pages: Settings → Pages → main branch
4. Enable GitHub Actions: Actions tab → Enable workflows
5. Run workflow manually once for initial data

### Ongoing Operations

- **Automatic:** Data updates every 3 hours via GitHub Actions
- **Manual trigger:** Actions → Update MyMonitoringBuddy Data → Run workflow
- **Monitor:** Check Actions tab for failed runs

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Stuck on "Loading..." | Check if `.github/workflows/update.yml` exists |
| Old data showing | Hard refresh browser (Ctrl+Shift+R) |
| Workflow fails | Check Actions tab for error logs |
| No articles found | RSS feeds may be temporarily down |

---

## 9. Code Reference

### Key Functions in fetcher.py

| Function | Purpose |
|----------|---------|
| `load_config()` | Load RSS feed configuration |
| `fetch_feeds()` | Download articles from all feeds |
| `deduplicate()` | Remove duplicate articles by title hash |
| `filter_recent()` | Keep only last 24 hours of articles |
| `analyze_articles()` | Match articles to countries |
| `extract_pairs()` | Find keyword co-occurrences |
| `calculate_baselines()` | Compute rolling 30-day averages |
| `score_countries()` | Calculate anomaly ratios and status |
| `generate_output()` | Build final JSON structure |

### Key Components in isitquiet-dashboard.jsx

| Component | Purpose |
|-----------|---------|
| `Explainer` | Project description panel |
| `RegionFilter` | Region selection buttons |
| `Treemap` | Main country visualization grid |
| `SourcesPanel` | Article list for selected country |
| `Methodology` | Explanation section |
| `Dashboard` | Main app container, data loading |

---

## 10. Contact & Repository

- **Live Dashboard:** https://becencabot.github.io/mymonitoringbuddy/
- **GitHub Repo:** https://github.com/becencabot/mymonitoringbuddy
- **Author:** Abdelaziz

---

*Last updated: January 25, 2026*
