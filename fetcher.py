#!/usr/bin/env python3
"""
MyMonitoringBuddy! - Africa News Anomaly Detector
==================================================
Simple, reliable detection of unusual news coverage across African countries.

Design Principles:
1. Count UNIQUE ARTICLES, not feed entries (deduplicate by title)
2. Match COUNTRY NAMES only (no ambiguous cities/names)
3. Require SOURCE DIVERSITY for high confidence signals
4. Use SENSIBLE DEFAULTS when no historical baseline exists
"""

import json
import hashlib
import re
import sys
import socket
from datetime import datetime, timedelta
from collections import defaultdict
from pathlib import Path

import feedparser

# Set socket timeout for HTTP requests (feedparser uses urllib)
socket.setdefaulttimeout(30)  # 30 seconds

# =============================================================================
# CONFIGURATION
# =============================================================================

CONFIG_FILE = "isitquiet_feeds.json"
DATA_DIR = Path("data")
HISTORY_FILE = DATA_DIR / "history.json"
OUTPUT_FILE = DATA_DIR / "output.json"

# Countries with matching terms
# - "terms": simple strings, matched with word boundaries \b...\b
# - "patterns": raw regex patterns for complex cases (lookahead/lookbehind)
COUNTRIES = {
    # North Africa
    "Morocco": {"terms": ["Morocco", "Maroc", "Moroccan"], "baseline": 3},
    "Algeria": {"terms": ["Algeria", "Algérie", "Algerian"], "baseline": 3},
    "Tunisia": {"terms": ["Tunisia", "Tunisie", "Tunisian"], "baseline": 2},
    "Libya": {"terms": ["Libya", "Libye", "Libyan", "Tripoli"], "baseline": 4},
    "Egypt": {"terms": ["Egypt", "Égypte", "Egyptian", "Cairo"], "baseline": 5},
    "Sudan": {
        "terms": ["Sudanese", "Soudanais", "Khartoum", "Darfur", "RSF", "SAF"],
        "patterns": [r"(?<!south )sudan\b", r"(?<!sud )soudan\b"],  # Sudan but not "South Sudan"
        "baseline": 5
    },
    
    # West Africa
    "Mauritania": {"terms": ["Mauritania", "Mauritanie", "Nouakchott"], "baseline": 1},
    "Mali": {"terms": ["Mali", "Malian", "Malien", "Bamako"], "baseline": 4},
    "Burkina Faso": {"terms": ["Burkina Faso", "Burkina", "Burkinabè", "Ouagadougou"], "baseline": 4},
    "Niger": {"terms": ["Niger", "Nigerien", "Nigérien", "Niamey"], "baseline": 3},  # Word boundary prevents "Nigeria" match
    "Senegal": {"terms": ["Senegal", "Sénégal", "Senegalese", "Sénégalais", "Dakar"], "baseline": 3},
    "Gambia": {"terms": ["Gambia", "Gambie", "Gambian", "Banjul"], "baseline": 1},
    "Guinea-Bissau": {"terms": ["Guinea-Bissau", "Guinée-Bissau", "Bissau"], "baseline": 1},
    "Guinea": {
        "terms": ["Guinean", "Guinéen", "Conakry"],
        "patterns": [r"(?<!equatorial )(?<!équatoriale )guinea\b(?!-)", r"(?<!équatoriale )guinée\b(?!-)"],  # Guinea but not compound names
        "baseline": 2
    },
    "Sierra Leone": {"terms": ["Sierra Leone", "Freetown"], "baseline": 2},
    "Liberia": {"terms": ["Liberia", "Liberian", "Monrovia"], "baseline": 2},
    "Côte d'Ivoire": {"terms": ["Côte d'Ivoire", "Ivory Coast", "Ivorian", "Ivoirien", "Abidjan"], "baseline": 3},
    "Ghana": {"terms": ["Ghana", "Ghanaian", "Ghanéen", "Accra"], "baseline": 3},
    "Togo": {"terms": ["Togo", "Togolese", "Togolais", "Lomé"], "baseline": 1},
    "Benin": {"terms": ["Benin", "Bénin", "Beninese", "Béninois", "Cotonou"], "baseline": 1},
    "Nigeria": {"terms": ["Nigeria", "Nigerian", "Nigérian", "Abuja", "Lagos", "Boko Haram"], "baseline": 6},
    "Cape Verde": {"terms": ["Cape Verde", "Cabo Verde", "Cap-Vert", "Praia"], "baseline": 0.5},
    
    # Central Africa
    "Chad": {"terms": ["Chad", "Tchad", "Chadian", "Tchadien", "N'Djamena"], "baseline": 2},
    "Cameroon": {"terms": ["Cameroon", "Cameroun", "Cameroonian", "Camerounais", "Yaoundé", "Douala"], "baseline": 3},
    "CAR": {"terms": ["Central African Republic", "Centrafrique", "Centrafricain", "Bangui", "RCA"], "baseline": 2},
    "South Sudan": {"terms": ["South Sudan", "Soudan du Sud", "Sud-Soudan", "South Sudanese", "Juba"], "baseline": 4},
    "Eq. Guinea": {"terms": ["Equatorial Guinea", "Guinée équatoriale", "Malabo"], "baseline": 0.5},
    "Gabon": {"terms": ["Gabon", "Gabonese", "Gabonais", "Libreville"], "baseline": 1},
    "Congo": {"terms": ["Congo-Brazzaville", "Republic of Congo", "République du Congo", "Brazzaville"], "baseline": 1},
    "DRC": {"terms": ["DRC", "RDC", "Democratic Republic of Congo", "République démocratique du Congo", "Congo-Kinshasa", "Kinshasa", "Goma", "M23", "Lubumbashi"], "baseline": 5},
    "São Tomé": {"terms": ["São Tomé", "Sao Tome", "São Tomé-et-Príncipe"], "baseline": 0.5},
    "Angola": {"terms": ["Angola", "Angolan", "Angolais", "Luanda"], "baseline": 2},
    
    # East Africa
    "Eritrea": {"terms": ["Eritrea", "Érythrée", "Eritrean", "Érythréen", "Asmara"], "baseline": 2},
    "Djibouti": {"terms": ["Djibouti", "Djiboutian", "Djiboutien"], "baseline": 1},
    "Ethiopia": {"terms": ["Ethiopia", "Éthiopie", "Ethiopian", "Éthiopien", "Addis Ababa", "Addis-Abeba", "Tigray", "Amhara"], "baseline": 5},
    "Somalia": {"terms": ["Somalia", "Somalie", "Somali", "Somalien", "Mogadishu", "Mogadiscio", "Al-Shabaab"], "baseline": 4},
    "Uganda": {"terms": ["Uganda", "Ouganda", "Ugandan", "Ougandais", "Kampala"], "baseline": 3},
    "Kenya": {"terms": ["Kenya", "Kenyan", "Kényan", "Nairobi", "Mombasa"], "baseline": 4},
    "Rwanda": {"terms": ["Rwanda", "Rwandan", "Rwandais", "Kigali"], "baseline": 3},
    "Burundi": {"terms": ["Burundi", "Burundian", "Burundais", "Bujumbura", "Gitega"], "baseline": 1},
    "Tanzania": {"terms": ["Tanzania", "Tanzanie", "Tanzanian", "Tanzanien", "Dar es Salaam", "Dodoma"], "baseline": 3},
    "Madagascar": {"terms": ["Madagascar", "Malagasy", "Malgache", "Antananarivo"], "baseline": 2},
    "Comoros": {"terms": ["Comoros", "Comores", "Comorian", "Comorien", "Moroni"], "baseline": 0.5},
    "Mauritius": {"terms": ["Mauritius", "Mauritian", "Mauricien", "Port Louis"], "baseline": 1},  # No "Maurice" - common French name
    "Seychelles": {"terms": ["Seychelles", "Seychellois"], "baseline": 0.5},  # No "Victoria" - common name
    
    # Southern Africa
    "Zambia": {"terms": ["Zambia", "Zambie", "Zambian", "Zambien", "Lusaka"], "baseline": 2},
    "Malawi": {"terms": ["Malawi", "Malawian", "Malawien", "Lilongwe", "Blantyre"], "baseline": 1},
    "Mozambique": {"terms": ["Mozambique", "Mozambican", "Mozambicain", "Maputo", "Beira"], "baseline": 3},
    "Zimbabwe": {"terms": ["Zimbabwe", "Zimbabwean", "Zimbabwéen", "Harare", "Bulawayo"], "baseline": 3},
    "Namibia": {"terms": ["Namibia", "Namibie", "Namibian", "Namibien", "Windhoek"], "baseline": 1},
    "Botswana": {"terms": ["Botswana", "Motswana", "Batswana", "Gaborone"], "baseline": 1},
    "South Africa": {"terms": ["South Africa", "Afrique du Sud", "South African", "Sud-Africain", "Johannesburg", "Cape Town", "Pretoria", "Durban"], "baseline": 5},
    "Eswatini": {"terms": ["Eswatini", "Swaziland", "Swazi", "Mbabane"], "baseline": 0.5},
    "Lesotho": {"terms": ["Lesotho", "Basotho", "Mosotho", "Maseru"], "baseline": 0.5},
}

# Signal keywords - presence indicates significance
SIGNAL_KEYWORDS = [
    # Conflict
    "war", "guerre", "attack", "attaque", "killed", "tué", "dead", "mort",
    "fighting", "combat", "explosion", "bombing", "attentat", "airstrike",
    "casualties", "wounded", "blessé", "violence",
    # Political
    "coup", "putsch", "election", "élection", "protest", "manifestation",
    "president", "président", "government", "gouvernement", "minister",
    # Humanitarian
    "famine", "drought", "sécheresse", "flood", "inondation",
    "refugees", "réfugiés", "displaced", "déplacés", "crisis", "crise",
    "humanitarian", "humanitaire", "epidemic", "épidémie",
    # Security
    "rebel", "rebelle", "militia", "milice", "terrorist", "terroriste",
    "jihadist", "djihadiste", "insurgent", "armed group",
    "Al-Shabaab", "Boko Haram", "Wagner", "M23", "RSF", "ceasefire",
]


# =============================================================================
# CORE FUNCTIONS
# =============================================================================

def load_config() -> dict:
    """Load feeds configuration."""
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def fetch_feeds(config: dict) -> list[dict]:
    """Fetch all RSS feeds."""
    entries = []
    
    for section, feeds in config.get('feeds', {}).items():
        for feed in feeds:
            url = feed['url']
            source = feed['name']
            
            print(f"  {source}...", end=' ', flush=True)
            
            try:
                parsed = feedparser.parse(url, request_headers={'User-Agent': 'MyMonitoringBuddy/1.0'})
                
                for entry in parsed.entries:
                    published = None
                    if hasattr(entry, 'published_parsed') and entry.published_parsed:
                        try:
                            published = datetime(*entry.published_parsed[:6]).isoformat()
                        except (ValueError, TypeError, IndexError):
                            pass  # Invalid date format
                    
                    entries.append({
                        'title': entry.get('title', ''),
                        'link': entry.get('link', ''),
                        'summary': entry.get('summary', ''),
                        'published': published,
                        'source': source,
                    })
                
                print(f"✓ {len(parsed.entries)}")
            except Exception as e:
                print(f"✗ {e}")
    
    return entries


def deduplicate(entries: list[dict]) -> list[dict]:
    """Remove duplicate articles by title similarity."""
    seen = {}
    unique = []
    
    for entry in entries:
        title = entry.get('title', '').strip()
        if not title:
            continue
        
        # Normalize: lowercase, remove punctuation, collapse spaces
        normalized = re.sub(r'[^\w\s]', '', title.lower())
        normalized = ' '.join(normalized.split())[:60]  # First 60 chars
        
        key = hashlib.md5(normalized.encode()).hexdigest()
        
        if key not in seen:
            seen[key] = True
            unique.append(entry)
    
    return unique


def filter_recent(entries: list[dict], hours: int = 24) -> list[dict]:
    """Keep entries from last N hours."""
    cutoff = datetime.now() - timedelta(hours=hours)  # Use local time
    recent = []
    
    for entry in entries:
        pub = entry.get('published')
        if pub:
            try:
                # Normalize: remove timezone suffix for simple comparison
                pub_str = pub.split('+')[0].split('Z')[0]
                dt = datetime.fromisoformat(pub_str)
                if dt >= cutoff:
                    recent.append(entry)
                # If date is valid but old, skip it (don't append)
                continue
            except (ValueError, TypeError, AttributeError):
                pass  # Invalid date format
        # No date or unparseable - include (might be recent)
        recent.append(entry)
    
    return recent


def analyze_articles(entries: list[dict]) -> dict:
    """Match articles to countries, extract keywords."""
    results = {c: {'articles': [], 'sources': set(), 'keywords': defaultdict(int)} 
               for c in COUNTRIES}
    
    signal_words = set(w.lower() for w in SIGNAL_KEYWORDS)
    
    for entry in entries:
        title = entry.get('title', '')
        summary = entry.get('summary', '')
        text = f"{title} {summary}".lower()
        source = entry.get('source', 'Unknown')
        
        if not text.strip():
            continue
        
        # Match countries - use word boundaries for terms, raw regex for patterns
        for country, info in COUNTRIES.items():
            matched = False
            
            # Check simple terms (with word boundaries)
            for term in info.get('terms', []):
                term_lower = term.lower()
                pattern = r'\b' + re.escape(term_lower) + r'\b'
                if re.search(pattern, text):
                    matched = True
                    break
            
            # Check raw patterns (for complex cases like Sudan, Guinea)
            if not matched:
                for pattern in info.get('patterns', []):
                    if re.search(pattern, text):
                        matched = True
                        break
            
            if matched:
                # Clean summary for lead
                clean_summary = re.sub(r'<[^>]+>', '', summary)[:120]
                
                results[country]['articles'].append({
                    'title': title,
                    'url': entry.get('link', ''),
                    'source': source,
                    'published': entry.get('published'),
                    'lead': clean_summary,
                })
                results[country]['sources'].add(source)
                
                # Extract signal keywords (use word boundaries)
                for word in signal_words:
                    pattern = r'\b' + re.escape(word) + r'\b'
                    if re.search(pattern, text):
                        results[country]['keywords'][word] += 1
    
    # Finalize
    for country in results:
        results[country]['sources'] = list(results[country]['sources'])
        kw = sorted(results[country]['keywords'].items(), key=lambda x: -x[1])
        results[country]['keywords'] = [{'word': w.capitalize(), 'count': c} for w, c in kw[:8]]
    
    return results


def extract_pairs(results: dict) -> dict:
    """Find keyword co-occurrences (keywords appearing together in articles)."""
    signal_words = set(w.lower() for w in SIGNAL_KEYWORDS)
    pairs = {}
    
    for country, data in results.items():
        pair_counts = defaultdict(int)
        
        for article in data['articles']:
            text = f"{article['title']} {article.get('lead', '')}".lower()
            # Use word boundaries for accurate matching
            found = sorted(w for w in signal_words if re.search(r'\b' + re.escape(w) + r'\b', text))
            
            # Generate pairs from keywords in same article
            for i, w1 in enumerate(found):
                for w2 in found[i+1:]:
                    pair_counts[(w1, w2)] += 1
        
        # Keep pairs appearing in 2+ articles
        pairs[country] = [
            [p[0].capitalize(), p[1].capitalize()]
            for p, c in sorted(pair_counts.items(), key=lambda x: -x[1])[:6]
            if c >= 2
        ]
    
    return pairs


def load_history() -> dict:
    if HISTORY_FILE.exists():
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'days': []}


def save_history(history: dict):
    DATA_DIR.mkdir(exist_ok=True)
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=2)


def update_history(history: dict, counts: dict) -> dict:
    today = datetime.now().strftime('%Y-%m-%d')
    history['days'] = [d for d in history['days'] if d['date'] != today]
    history['days'].append({'date': today, 'counts': counts})
    history['days'] = sorted(history['days'], key=lambda x: x['date'])[-30:]
    return history


def calculate_baselines(history: dict) -> dict:
    """Get baseline from history or use defaults."""
    baselines = {}
    
    for country, info in COUNTRIES.items():
        counts = [d['counts'].get(country, 0) for d in history.get('days', []) 
                  if country in d.get('counts', {})]
        
        if len(counts) >= 3:
            baselines[country] = max(sum(counts) / len(counts), 0.5)
        else:
            baselines[country] = info['baseline']
    
    return baselines


def score_countries(results: dict, baselines: dict, pairs: dict) -> dict:
    """Calculate anomaly scores with confidence."""
    scores = {}
    
    for country, data in results.items():
        articles = len(data['articles'])
        sources = len(data['sources'])
        keywords = len(data['keywords'])
        has_pairs = len(pairs.get(country, [])) > 0
        
        base = baselines.get(country, COUNTRIES[country]['baseline'])
        ratio = articles / max(base, 0.5)
        
        # Determine status and confidence
        if articles == 0:
            status, confidence = 'quiet', 'none'
        elif articles < 2:
            # Minimum threshold: need at least 2 articles for elevated/high
            status, confidence = 'normal', 'low'
        elif ratio >= 2.5 and sources >= 3 and (keywords >= 2 or has_pairs):
            status, confidence = 'high', 'high'
        elif ratio >= 2.5 and sources >= 2:
            status, confidence = 'high', 'medium'
        elif ratio >= 2.5:
            status, confidence = 'elevated', 'low'
        elif ratio >= 1.5 and sources >= 2:
            status, confidence = 'elevated', 'medium'
        elif ratio >= 1.5:
            status, confidence = 'elevated', 'low'
        else:
            status = 'normal'
            confidence = 'normal' if articles > 0 else 'none'
        
        scores[country] = {
            'articles': articles,
            'sources': sources,
            'baseline': round(base, 1),
            'ratio': round(ratio, 2),
            'status': status,
            'confidence': confidence,
        }
    
    return scores


def generate_output(results: dict, scores: dict, pairs: dict, timestamp: str) -> dict:
    """Build final JSON output."""
    summary = {'high': 0, 'elevated': 0, 'normal': 0, 'quiet': 0}
    countries = {}
    
    for country in COUNTRIES:
        data = results.get(country, {})
        score = scores.get(country, {})
        
        status = score.get('status', 'quiet')
        summary[status] = summary.get(status, 0) + 1
        
        countries[country] = {
            'article_count': score.get('articles', 0),
            'source_count': score.get('sources', 0),
            'baseline': score.get('baseline', 1),
            'ratio': score.get('ratio', 0),
            'status': status,
            'confidence': score.get('confidence', 'none'),
            'keywords': data.get('keywords', []),
            'keyword_pairs': pairs.get(country, []),
            'articles': data.get('articles', [])[:12],
            'sources': data.get('sources', []),
        }
    
    return {
        'generated_at': timestamp,
        'summary': summary,
        'countries': countries,
    }


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("=" * 55)
    print("  MyMonitoringBuddy! - Africa News Monitor")
    print("=" * 55)
    
    if '--dry-run' in sys.argv:
        config = load_config()
        print("\n[DRY RUN] Would fetch:")
        for section, feeds in config.get('feeds', {}).items():
            for f in feeds:
                print(f"  - {f['name']}")
        return
    
    # Load config
    print("\n📋 Loading config...")
    config = load_config()
    
    # Fetch
    print("\n📡 Fetching feeds...")
    entries = fetch_feeds(config)
    print(f"   Raw entries: {len(entries)}")
    
    # Deduplicate
    print("\n🔄 Deduplicating...")
    unique = deduplicate(entries)
    print(f"   Unique: {len(unique)} (-{len(entries) - len(unique)} dupes)")
    
    # Filter recent
    print("\n⏰ Filtering to 24h...")
    recent = filter_recent(unique)
    print(f"   Recent: {len(recent)}")
    
    # Analyze
    print("\n🌍 Analyzing...")
    results = analyze_articles(recent)
    active = sum(1 for d in results.values() if d['articles'])
    print(f"   Countries with coverage: {active}/54")
    
    # Keyword pairs
    print("\n🔗 Finding keyword pairs...")
    pairs = extract_pairs(results)
    with_pairs = sum(1 for p in pairs.values() if p)
    print(f"   Countries with pairs: {with_pairs}")
    
    # Baseline
    print("\n📊 Computing baselines...")
    history = load_history()
    baselines = calculate_baselines(history)
    
    # Score
    print("\n🎯 Scoring...")
    today_counts = {c: len(d['articles']) for c, d in results.items()}
    scores = score_countries(results, baselines, pairs)
    
    high = sum(1 for s in scores.values() if s['status'] == 'high')
    elevated = sum(1 for s in scores.values() if s['status'] == 'elevated')
    print(f"   🔴 High: {high}  🟡 Elevated: {elevated}")
    
    # Update history
    history = update_history(history, today_counts)
    save_history(history)
    
    # Output
    timestamp = datetime.now().isoformat()
    output = generate_output(results, scores, pairs, timestamp)
    
    DATA_DIR.mkdir(exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Saved to {OUTPUT_FILE}")
    print("=" * 55)


if __name__ == '__main__':
    main()
