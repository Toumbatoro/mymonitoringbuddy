# MyMonitoringBuddy! 🌍

**Africa News Anomaly Detection Dashboard**

Tracks news mentions across 54 African countries from 25 RSS feeds. Flags unusual spikes in coverage that may signal notable events, helping analysts prioritize attention where patterns shift significantly.

---

## 📁 Project Structure

```
mymonitoringbuddy/
├── index.html                    # HTML entry point
├── isitquiet-dashboard.jsx       # React dashboard (29KB)
├── fetcher.py                    # Python backend (21KB)
├── isitquiet_feeds.json          # RSS feed configuration
├── requirements.txt              # Python dependencies
├── .gitignore                    # Git ignore rules
├── data/
│   └── output.json               # Generated dashboard data
└── .github/
    └── workflows/
        └── update.yml            # GitHub Actions (6-hourly)
```

---

## 🚀 Quick Start

### Local Testing

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Run the fetcher to generate fresh data
python fetcher.py

# 3. Serve locally
python -m http.server 8000

# 4. Open in browser
open http://localhost:8000
```

### GitHub Pages Deployment

1. Create a new GitHub repository
2. Push all files to the `main` branch
3. Go to Settings → Pages → Source: `main` branch
4. The workflow runs automatically every 3 hours

---

## 🎯 Features

| Feature | Description |
|---------|-------------|
| **54 Countries** | Complete coverage of all African nations |
| **25 RSS Feeds** | BBC, Al Jazeera, RFI, France24, Reuters, VOA, HRW, Crisis Group |
| **Smart Matching** | Word boundaries prevent false positives (Niger ≠ Nigeria) |
| **Anomaly Detection** | Compares to 30-day rolling baseline |
| **Confidence Scoring** | Requires 3+ sources for high confidence |
| **Bilingual** | English and French sources |
| **Auto-Updates** | Data refreshes every 3 hours |

---

## 📊 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ROW 1: Explainer (280px)  │  Region Filter (flex)              │
├─────────────────────────────────────────────────────────────────┤
│  ROW 2: Treemap (flex)              │  Sources Panel (380px)    │
├─────────────────────────────────────────────────────────────────┤
│  ROW 3: Methodology (full width)                                │
└─────────────────────────────────────────────────────────────────┘
```

### Components

- **Explainer**: Project description and usage instructions
- **Region Filter**: Filter by All Africa, North, West, Central, East, South
- **Treemap**: Visual grid of countries, sized by article count, colored by anomaly ratio
- **Sources Panel**: Articles for selected country with clickable URLs
- **Methodology**: Data sources, anomaly detection, color coding, limitations

---

## 🎨 Color Coding

| Color | Ratio | Status | Meaning |
|-------|-------|--------|---------|
| 🟢 Green | ≤1.5× | Normal | Typical coverage levels |
| 🟡 Yellow | 1.5-2.5× | Elevated | Above average attention |
| 🔴 Red | >2.5× | High | Significant spike |
| ⚪ Gray | 0 | Quiet | No recent mentions |

---

## 🌍 Countries by Region

| Region | Count | Countries |
|--------|-------|-----------|
| **North** | 6 | Morocco, Algeria, Tunisia, Libya, Egypt, Sudan |
| **West** | 16 | Mauritania, Mali, Burkina Faso, Niger, Senegal, Gambia, Guinea-Bissau, Guinea, Sierra Leone, Liberia, Côte d'Ivoire, Ghana, Togo, Benin, Nigeria, Cape Verde |
| **Central** | 10 | Chad, Cameroon, CAR, South Sudan, Eq. Guinea, Gabon, Congo, DRC, São Tomé, Angola |
| **East** | 13 | Eritrea, Djibouti, Ethiopia, Somalia, Uganda, Kenya, Rwanda, Burundi, Tanzania, Madagascar, Comoros, Mauritius, Seychelles |
| **South** | 9 | Zambia, Malawi, Mozambique, Zimbabwe, Namibia, Botswana, South Africa, Eswatini, Lesotho |

---

## 🔧 Configuration

### Adding/Removing Feeds

Edit `isitquiet_feeds.json`:

```json
{
  "feeds": {
    "international": [
      {"name": "BBC Africa", "url": "https://feeds.bbci.co.uk/news/world/africa/rss.xml"},
      {"name": "Your New Feed", "url": "https://example.com/rss"}
    ]
  }
}
```

### Adjusting Thresholds

In `fetcher.py`, modify the `score_countries()` function:

```python
# Current thresholds
if ratio >= 2.5:    # High
elif ratio >= 1.5:  # Elevated
else:               # Normal
```

---

## 📡 Data Pipeline

```
25 RSS Feeds
     │
     ▼
┌─────────────────┐
│  fetcher.py     │
│  • Fetch feeds  │
│  • Deduplicate  │
│  • Match countries │
│  • Extract keywords │
│  • Calculate baselines │
│  • Score anomalies │
└────────┬────────┘
         │
         ▼
   data/output.json
         │
         ▼
┌─────────────────┐
│  Dashboard      │
│  • Load JSON    │
│  • Render UI    │
│  • Interactive  │
└─────────────────┘
```

---

## ⚠️ Limitations

- RSS feeds have varying update frequencies
- Not all languages/sources covered equally
- Baseline needs ~30 days to calibrate for new deployments
- High confidence requires 3+ sources reporting
- Some small countries may have limited coverage

---

## 📝 License

MIT License - Built for humanitarian monitoring

---

## 🙏 Acknowledgments

- Data from BBC, Al Jazeera, RFI, France24, Reuters, UN News, ReliefWeb, and other sources
- Built for humanitarian analysts and researchers
