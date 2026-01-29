/**
 * MyMonitoringBuddy! - Africa News Anomaly Detection Dashboard
 * =============================================================
 * 
 * Tracks news mentions across 54 African countries from 20+ RSS feeds.
 * Flags unusual spikes in coverage that may signal notable events,
 * helping analysts prioritize attention where patterns shift significantly.
 * 
 * Layout:
 * - Row 1: Explainer (280px) + Region Filter (flex)
 * - Row 2: Treemap (flex) + Sources Panel (380px)
 * - Row 3: Methodology (full width)
 * 
 * @version 2.0
 * @author MyMonitoringBuddy Project
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const COLORS = {
  bg: '#0f172a',
  bgLight: '#131c2e',
  bgCard: '#1e293b',
  border: '#334155',
  text: '#e2e8f0',
  textSec: '#94a3b8',
  textMuted: '#64748b',
  accent: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};

/**
 * Get color based on ratio value
 * - Gray: 0 (quiet/no mentions)
 * - Green: ≤1.5× (normal)
 * - Yellow: 1.5-2.5× (elevated)
 * - Red: >2.5× (high)
 */
const getRatioColor = (ratio) => {
  if (!ratio || ratio === 0) return COLORS.textMuted;
  if (ratio <= 1.5) return COLORS.green;
  if (ratio <= 2.5) return COLORS.yellow;
  return COLORS.red;
};

/**
 * Get color based on status field (from backend)
 * This respects backend logic like minimum article thresholds
 */
const getStatusColor = (status) => {
  if (!status || status === 'quiet') return COLORS.textMuted;
  if (status === 'high') return COLORS.red;
  if (status === 'elevated') return COLORS.yellow;
  return COLORS.green;  // normal
};

/**
 * 54 African Countries - Names MUST match backend (fetcher.py) EXACTLY
 * Organized by region for filtering
 */
const COUNTRIES = [
  // North Africa (6)
  { name: 'Morocco', region: 'North' },
  { name: 'Algeria', region: 'North' },
  { name: 'Tunisia', region: 'North' },
  { name: 'Libya', region: 'North' },
  { name: 'Egypt', region: 'North' },
  { name: 'Sudan', region: 'North' },
  
  // West Africa (16)
  { name: 'Mauritania', region: 'West' },
  { name: 'Mali', region: 'West' },
  { name: 'Burkina Faso', region: 'West' },
  { name: 'Niger', region: 'West' },
  { name: 'Senegal', region: 'West' },
  { name: 'Gambia', region: 'West' },
  { name: 'Guinea-Bissau', region: 'West' },
  { name: 'Guinea', region: 'West' },
  { name: 'Sierra Leone', region: 'West' },
  { name: 'Liberia', region: 'West' },
  { name: "Côte d'Ivoire", region: 'West' },
  { name: 'Ghana', region: 'West' },
  { name: 'Togo', region: 'West' },
  { name: 'Benin', region: 'West' },
  { name: 'Nigeria', region: 'West' },
  { name: 'Cape Verde', region: 'West' },
  
  // Central Africa (10)
  { name: 'Chad', region: 'Central' },
  { name: 'Cameroon', region: 'Central' },
  { name: 'CAR', region: 'Central' },
  { name: 'South Sudan', region: 'Central' },
  { name: 'Eq. Guinea', region: 'Central' },
  { name: 'Gabon', region: 'Central' },
  { name: 'Congo', region: 'Central' },
  { name: 'DRC', region: 'Central' },
  { name: 'São Tomé', region: 'Central' },
  { name: 'Angola', region: 'Central' },
  
  // East Africa (13)
  { name: 'Eritrea', region: 'East' },
  { name: 'Djibouti', region: 'East' },
  { name: 'Ethiopia', region: 'East' },
  { name: 'Somalia', region: 'East' },
  { name: 'Uganda', region: 'East' },
  { name: 'Kenya', region: 'East' },
  { name: 'Rwanda', region: 'East' },
  { name: 'Burundi', region: 'East' },
  { name: 'Tanzania', region: 'East' },
  { name: 'Madagascar', region: 'East' },
  { name: 'Comoros', region: 'East' },
  { name: 'Mauritius', region: 'East' },
  { name: 'Seychelles', region: 'East' },
  
  // Southern Africa (9)
  { name: 'Zambia', region: 'South' },
  { name: 'Malawi', region: 'South' },
  { name: 'Mozambique', region: 'South' },
  { name: 'Zimbabwe', region: 'South' },
  { name: 'Namibia', region: 'South' },
  { name: 'Botswana', region: 'South' },
  { name: 'South Africa', region: 'South' },
  { name: 'Eswatini', region: 'South' },
  { name: 'Lesotho', region: 'South' },
];

const REGIONS = ['North', 'West', 'Central', 'East', 'South'];

// Default structure for countries not in data
const EMPTY_COUNTRY = {
  article_count: 0,
  source_count: 0,
  baseline: 1,
  ratio: 0,
  status: 'quiet',
  confidence: 'none',
  keywords: [],
  keyword_pairs: [],
  articles: [],
  sources: []
};

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Explainer Component
 * Left sidebar with project description and usage instructions
 */
const Explainer = () => (
  <div style={{
    background: COLORS.bgCard,
    borderRadius: '12px',
    padding: '20px',
    minWidth: '300px',
    maxWidth: '500px',
    flex: '1 1 300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  }}>
    <div>
      <h1 style={{ 
        fontSize: '22px', 
        fontWeight: 700, 
        color: COLORS.text, 
        margin: 0,
      }}>
        MyMonitoringBuddy<span style={{ color: COLORS.accent }}>!</span>
      </h1>
      <p style={{ color: COLORS.textSec, fontSize: '13px', margin: '4px 0 0 0' }}>
        Africa News Anomaly Detection
      </p>
    </div>
    
    <p style={{ color: COLORS.accent, fontSize: '12px', fontWeight: 500, margin: 0 }}>
      For humanitarian and security analysts monitoring the continent.
    </p>
    
    <p style={{ color: COLORS.textSec, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
      Tracks news mentions across 54 African countries from 20+ RSS feeds. 
      Flags unusual spikes in coverage — not event severity or importance. 
      An "elevated" country means unusually high media attention, not necessarily a crisis.
    </p>
    
    <p style={{ color: COLORS.textSec, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
      Use it as a first-pass filter: which countries deserve closer attention today?
    </p>
    
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '8px',
      padding: '12px',
      background: COLORS.bgLight,
      borderRadius: '8px'
    }}>
      {[
        'Filter by region',
        'Click country to see sources',
        'Access articles directly'
      ].map((text, i) => (
        <div key={i} style={{ 
          color: COLORS.text, 
          fontSize: '13px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px' 
        }}>
          <span style={{ 
            background: COLORS.accent, 
            color: 'white', 
            width: '20px', 
            height: '20px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 600,
            flexShrink: 0
          }}>{i + 1}</span>
          {text}
        </div>
      ))}
    </div>
    
    <a 
      href="https://becensabot.substack.com/p/identifying-signal-from-noise-introducing" 
      target="_blank" 
      rel="noopener noreferrer"
      style={{ 
        color: COLORS.accent, 
        fontSize: '12px', 
        textDecoration: 'none',
        marginTop: '4px'
      }}
    >
      Full methodology →
    </a>
  </div>
);

/**
 * RegionFilter Component
 * Region selection with "All Africa" as parent container
 */
const RegionFilter = ({ region, onRegionChange, data }) => {
  // Calculate stats for each region
  const getRegionStats = (regionName) => {
    const countries = regionName === 'All Africa' 
      ? COUNTRIES 
      : COUNTRIES.filter(c => c.region === regionName);
    
    let high = 0, elevated = 0, normal = 0, quiet = 0;
    countries.forEach(c => {
      const d = data.countries?.[c.name];
      const status = d?.status || 'quiet';
      if (status === 'high') high++;
      else if (status === 'elevated') elevated++;
      else if (status === 'normal') normal++;
      else quiet++;
    });
    return { high, elevated, normal, quiet, total: countries.length };
  };

  const allStats = getRegionStats('All Africa');
  const isAllSelected = region === 'All Africa';

  return (
    <div style={{
      background: COLORS.bgCard,
      borderRadius: '12px',
      padding: '16px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {/* All Africa - main container button */}
      <button
        onClick={() => onRegionChange('All Africa')}
        style={{
          padding: '12px 16px',
          borderRadius: '8px',
          border: `2px solid ${isAllSelected ? COLORS.accent : COLORS.border}`,
          background: isAllSelected ? COLORS.accent : COLORS.bgLight,
          color: isAllSelected ? 'white' : COLORS.text,
          fontSize: '15px',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%'
        }}
      >
        <span>All Africa</span>
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          fontSize: '12px',
          opacity: 0.9
        }}>
          {allStats.high > 0 && <span>🔴 {allStats.high}</span>}
          {allStats.elevated > 0 && <span>🟡 {allStats.elevated}</span>}
          <span style={{ opacity: 0.7 }}>{allStats.total} countries</span>
        </div>
      </button>
      
      {/* Sub-regions - nested under All Africa */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        flexWrap: 'wrap',
        paddingLeft: '12px',
        borderLeft: `3px solid ${COLORS.border}`
      }}>
        {REGIONS.map(r => {
          const stats = getRegionStats(r);
          const isActive = region === r;
          
          return (
            <button
              key={r}
              onClick={() => onRegionChange(r)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: `2px solid ${isActive ? COLORS.accent : COLORS.border}`,
                background: isActive ? COLORS.accent : COLORS.bg,
                color: isActive ? 'white' : COLORS.text,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                minWidth: '85px'
              }}
            >
              <span>{r}</span>
              <div style={{ 
                display: 'flex', 
                gap: '4px', 
                fontSize: '10px',
                opacity: 0.85
              }}>
                {stats.high > 0 && (
                  <span style={{ color: isActive ? 'white' : COLORS.red }}>🔴{stats.high}</span>
                )}
                {stats.elevated > 0 && (
                  <span style={{ color: isActive ? 'white' : COLORS.yellow }}>🟡{stats.elevated}</span>
                )}
                <span style={{ color: isActive ? 'rgba(255,255,255,0.8)' : COLORS.textMuted }}>
                  {stats.total}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Treemap Component
 * Main visualization of countries by anomaly level
 * - SIZE varies by article_count
 * - COLOR by ratio (green/yellow/red)
 * - SORTED by ratio descending (highest anomaly first)
 */
const Treemap = ({ data, selectedCountry, onSelect, region }) => {
  // Get country names for current region
  const regionCountryNames = region === 'All Africa'
    ? COUNTRIES.map(c => c.name)
    : COUNTRIES.filter(c => c.region === region).map(c => c.name);
  
  // Build sorted list of countries with their data
  const filtered = React.useMemo(() => {
    const statusPriority = { high: 3, elevated: 2, normal: 1, quiet: 0 };
    return regionCountryNames
      .map(name => {
        const d = data.countries?.[name] || EMPTY_COUNTRY;
        return { name, ...d };
      })
      .sort((a, b) => {
        // First by status (high → elevated → normal → quiet)
        const statusDiff = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
        if (statusDiff !== 0) return statusDiff;
        // Then by ratio (higher variance = higher priority within status)
        return (b.ratio || 0) - (a.ratio || 0);
      });
  }, [data.countries, regionCountryNames]);
  
  // Calculate max for sizing
  const maxArticleCount = Math.max(...filtered.map(c => c.article_count || 0), 1);
  
  return (
    <div style={{
      background: COLORS.bgCard,
      borderRadius: '12px',
      padding: '16px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      minWidth: 0,
      overflow: 'hidden'
    }}>
      {/* Header with legend */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: COLORS.text, margin: 0 }}>
            Coverage Anomalies
          </h2>
          <p style={{ fontSize: '10px', color: COLORS.textMuted, margin: '2px 0 0 0' }}>
            Size = article count • Color = variance from baseline
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: COLORS.textSec }}>
          {[
            { color: 'green', label: 'Normal' },
            { color: 'yellow', label: 'Elevated' },
            { color: 'red', label: 'High' }
          ].map(({ color, label }) => (
            <span key={color} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                background: COLORS[color], 
                borderRadius: '2px' 
              }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      
      {/* Grid of country cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '8px',
        flex: 1,
        overflowY: 'auto',
        alignContent: 'start',
        maxHeight: '420px',
        paddingRight: '4px'
      }}>
        {filtered.map(country => {
          const color = getStatusColor(country.status);
          const isSelected = selectedCountry === country.name;
          const noMentions = !country.article_count || country.article_count === 0;
          const sizeFactor = (country.article_count || 0) / maxArticleCount;
          
          // Tooltip text
          const tooltip = noMentions 
            ? `${country.name}: No recent coverage (baseline avg: ${country.baseline || 1}/day)`
            : `${country.name}: ${country.article_count} articles, ${country.ratio?.toFixed(1)}× baseline`;
          
          return (
            <div
              key={country.name}
              onClick={() => onSelect(country.name)}
              title={tooltip}
              style={{
                minHeight: '72px',
                background: isSelected ? color : COLORS.bg,
                border: `2px solid ${color}`,
                borderRadius: '8px',
                padding: '10px 8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                opacity: noMentions ? 0.5 : 0.9,
                gridColumn: sizeFactor > 0.6 ? 'span 2' : 'span 1',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ 
                fontSize: '11px', 
                fontWeight: 600, 
                color: isSelected ? COLORS.bg : COLORS.text,
                textAlign: 'center',
                lineHeight: 1.2,
                marginBottom: '4px'
              }}>
                {country.name}
              </div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 700, 
                color: isSelected ? COLORS.bg : color 
              }}>
                {noMentions ? '—' : country.article_count}
              </div>
              <div style={{ 
                fontSize: '10px', 
                color: isSelected ? COLORS.bg : COLORS.textSec 
              }}>
                {noMentions ? 'quiet' : `${(country.ratio || 0).toFixed(1)}× baseline`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * SourcesPanel Component
 * Shows articles for selected country with clickable URLs
 */
const SourcesPanel = ({ selectedCountry, countryData }) => {
  // Empty state when no country selected
  if (!selectedCountry || !countryData) {
    return (
      <div style={{
        background: COLORS.bgCard,
        borderRadius: '12px',
        padding: '20px',
        minWidth: '380px',
        maxWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: COLORS.text, margin: 0 }}>
          Sources
        </h2>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.textMuted,
          fontSize: '13px',
          textAlign: 'center',
          padding: '40px 20px',
          lineHeight: 1.5
        }}>
          Select a country from the treemap<br />to view matching articles
        </div>
      </div>
    );
  }

  const color = getStatusColor(countryData.status);
  const articles = countryData.articles || [];

  return (
    <div style={{
      background: COLORS.bgCard,
      borderRadius: '12px',
      padding: '20px',
      minWidth: '380px',
      maxWidth: '380px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxHeight: '520px',
      overflow: 'hidden'
    }}>
      {/* Country header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: COLORS.text, margin: 0 }}>
            {selectedCountry}
          </h2>
          <span style={{
            fontSize: '10px',
            padding: '3px 8px',
            borderRadius: '4px',
            background: color,
            color: COLORS.bg,
            fontWeight: 600,
            textTransform: 'uppercase'
          }}>
            {countryData.status || 'quiet'}
          </span>
        </div>
        <p style={{ color: COLORS.textSec, fontSize: '12px', margin: 0 }}>
          {countryData.article_count || 0} articles
          {countryData.baseline ? ` (avg ${countryData.baseline}/day)` : ''}
          {countryData.source_count ? ` • ${countryData.source_count} sources` : ''}
        </p>
        {countryData.ratio > 0 && (
          <p style={{ color: COLORS.textSec, fontSize: '11px', margin: '4px 0 0 0' }}>
            {countryData.ratio.toFixed(1)}× baseline
            {countryData.confidence && countryData.confidence !== 'none' ? ` • ${countryData.confidence} confidence` : ''}
          </p>
        )}
      </div>

      {/* Articles list - scrollable */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        paddingRight: '4px'
      }}>
        {articles.length === 0 ? (
          <div style={{
            color: COLORS.textMuted,
            fontSize: '13px',
            textAlign: 'center',
            padding: '30px 20px',
            background: COLORS.bg,
            borderRadius: '8px',
            lineHeight: 1.6
          }}>
            <div style={{ marginBottom: '8px', fontSize: '14px' }}>No recent articles</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>
              {countryData.status === 'quiet' 
                ? `Below baseline coverage (avg ${countryData.baseline || 1}/day). This typically means no significant news events in the last 24 hours.`
                : 'No matching articles found in monitored RSS feeds.'}
            </div>
          </div>
        ) : (
          articles.map((article, i) => (
            <div
              key={i}
              style={{
                padding: '12px',
                background: COLORS.bg,
                borderRadius: '8px',
                borderLeft: `3px solid ${COLORS.accent}`
              }}
            >
              {/* Clickable title */}
              <a
                href={article.url || article.link || '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: COLORS.accent,
                  textDecoration: 'none',
                  display: 'block',
                  marginBottom: '6px',
                  lineHeight: 1.4
                }}
              >
                {article.title} ↗
              </a>
              
              {/* Source and date */}
              <div style={{ 
                fontSize: '11px', 
                color: COLORS.textMuted, 
                marginBottom: article.lead || article.summary ? '6px' : '0',
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                <span style={{ 
                  background: COLORS.bgCard, 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  fontWeight: 500
                }}>
                  {article.source}
                </span>
                {article.published && (
                  <span>{new Date(article.published).toLocaleDateString()}</span>
                )}
              </div>
              
              {/* Lead/summary text if available */}
              {(article.lead || article.summary) && (
                <div style={{ 
                  fontSize: '12px', 
                  color: COLORS.textSec, 
                  lineHeight: 1.5,
                  marginBottom: '6px'
                }}>
                  {article.lead || article.summary}
                </div>
              )}
              
              {/* Full URL - clickable */}
              <div style={{
                fontSize: '10px',
                color: COLORS.textMuted,
                wordBreak: 'break-all',
                lineHeight: 1.3
              }}>
                <a 
                  href={article.url || article.link || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: COLORS.textMuted, textDecoration: 'none' }}
                >
                  {article.url || article.link}
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Methodology Component
 * Full width section explaining the approach
 */
const Methodology = () => (
  <div style={{
    background: COLORS.bgCard,
    borderRadius: '12px',
    padding: '20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '24px'
  }}>
    <div>
      <h3 style={{ fontSize: '13px', fontWeight: 600, color: COLORS.accent, margin: '0 0 8px 0' }}>
        DATA SOURCES
      </h3>
      <p style={{ fontSize: '12px', color: COLORS.textSec, margin: 0, lineHeight: 1.6 }}>
        Aggregates 20+ RSS feeds from major international outlets (BBC, Al Jazeera, France24, RFI), 
        regional news services, and humanitarian organizations. Data refreshes every 3 hours.
      </p>
    </div>
    
    <div>
      <h3 style={{ fontSize: '13px', fontWeight: 600, color: COLORS.accent, margin: '0 0 8px 0' }}>
        ANOMALY DETECTION
      </h3>
      <p style={{ fontSize: '12px', color: COLORS.textSec, margin: 0, lineHeight: 1.6 }}>
        Compares today's mention count against a rolling 30-day baseline. 
        Ratio = mentions today ÷ average daily mentions. Higher ratios indicate 
        unusual coverage levels warranting attention.
      </p>
    </div>
    
    <div>
      <h3 style={{ fontSize: '13px', fontWeight: 600, color: COLORS.accent, margin: '0 0 8px 0' }}>
        COLOR CODING
      </h3>
      <div style={{ fontSize: '12px', color: COLORS.textSec, lineHeight: 1.8 }}>
        {[
          { color: 'green', range: '≤1.5×', desc: 'Normal coverage levels' },
          { color: 'yellow', range: '1.5-2.5×', desc: 'Elevated attention' },
          { color: 'red', range: '>2.5×', desc: 'Significant spike' }
        ].map(({ color, range, desc }) => (
          <div key={color} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              width: '10px', 
              height: '10px', 
              background: COLORS[color], 
              borderRadius: '2px',
              flexShrink: 0
            }} />
            <span><strong>{range}:</strong> {desc}</span>
          </div>
        ))}
      </div>
    </div>
    
    <div>
      <h3 style={{ fontSize: '13px', fontWeight: 600, color: COLORS.accent, margin: '0 0 8px 0' }}>
        CONFIDENCE & LIMITATIONS
      </h3>
      <p style={{ fontSize: '12px', color: COLORS.textSec, margin: 0, lineHeight: 1.6 }}>
        High confidence requires 3+ sources. RSS feeds vary in update frequency. 
        Not all languages/regions covered equally. Baseline needs ~30 days to calibrate.
      </p>
    </div>
  </div>
);

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

function Dashboard() {
  const [data, setData] = React.useState({
    generated_at: null,
    summary: { high: 0, elevated: 0, normal: 0, quiet: 54 },
    countries: {}
  });
  const [selectedCountry, setSelectedCountry] = React.useState(null);
  const [region, setRegion] = React.useState('All Africa');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  
  // Load data from backend
  React.useEffect(() => {
    fetch('./data/output.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(json => {
        // Ensure all expected countries exist in the data
        const normalizedCountries = { ...json.countries };
        COUNTRIES.forEach(c => {
          if (!normalizedCountries[c.name]) {
            normalizedCountries[c.name] = { ...EMPTY_COUNTRY };
          }
        });
        
        setData({
          ...json,
          countries: normalizedCountries
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load data:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);
  
  // Handle country selection (toggle on/off)
  const handleCountrySelect = (name) => {
    setSelectedCountry(prev => prev === name ? null : name);
  };
  
  // Get data for selected country
  const selectedCountryData = selectedCountry ? data.countries[selectedCountry] : null;
  
  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: COLORS.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: COLORS.textSec,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>Loading MyMonitoringBuddy!</div>
          <div style={{ fontSize: '14px', color: COLORS.textMuted }}>Fetching latest data...</div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: COLORS.textSec,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '18px', color: COLORS.red, marginBottom: '10px' }}>
          Failed to load data
        </div>
        <div style={{ fontSize: '14px', color: COLORS.textMuted }}>
          {error}
        </div>
        <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '20px' }}>
          Make sure <code style={{ background: COLORS.bgCard, padding: '2px 6px', borderRadius: '4px' }}>data/output.json</code> exists and is accessible.
        </div>
      </div>
    );
  }
  
  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.bg,
      color: COLORS.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Status bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: COLORS.textMuted,
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            Last updated: {data.generated_at ? new Date(data.generated_at).toLocaleString() : 'Unknown'}
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>🔴 {data.summary?.high || 0} high</span>
            <span>🟡 {data.summary?.elevated || 0} elevated</span>
            <span>🟢 {data.summary?.normal || 0} normal</span>
            <span>⚪ {data.summary?.quiet || 0} quiet</span>
          </div>
        </div>
        
        {/* Calibration Notice */}
        <div style={{
          background: 'rgba(255, 193, 7, 0.15)',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '13px',
          color: COLORS.textSec,
          lineHeight: '1.5'
        }}>
          <strong style={{ color: COLORS.text }}>⚠️ Calibration period:</strong> This dashboard launched on January 28, 2026. 
          Baselines require ~30 days of data to stabilize. Until then, anomaly detection may be less accurate.
        </div>
        
        {/* ROW 1: Explainer + Region Filter */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <Explainer />
          <RegionFilter
            data={data}
            region={region}
            onRegionChange={setRegion}
          />
        </div>
        
        {/* ROW 2: Treemap + Sources */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <Treemap
            data={data}
            selectedCountry={selectedCountry}
            onSelect={handleCountrySelect}
            region={region}
          />
          <SourcesPanel
            selectedCountry={selectedCountry}
            countryData={selectedCountryData}
          />
        </div>
        
        {/* ROW 3: Methodology */}
        <Methodology />
        
        {/* Footer */}
        <div style={{
          textAlign: 'center',
          fontSize: '11px',
          color: COLORS.textMuted,
          padding: '12px 0',
          borderTop: `1px solid ${COLORS.border}`
        }}>
          Built for humanitarian monitoring • Data refreshes every 3 hours
        </div>
      </div>
    </div>
  );
}
