import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, TrendingUp, Users, ShoppingBag,
  Search, Globe, BarChart2, Upload, RefreshCw,
  AlertTriangle, Brain, Briefcase, Layers
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';

const COLORS = ['#38bdf8','#818cf8','#34d399','#fbbf24','#f472b6','#a78bfa','#2dd4bf','#f87171','#c084fc','#fb923c'];
const SEG_COLORS = { 'High-Value': '#fbbf24', 'Frequent Buyer': '#34d399', 'One-Time Buyer': '#818cf8', 'At-Risk': '#f87171' };

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n);
const fmtFull = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const TABS = [
  { id: 'overview',   label: 'Overview',    Icon: LayoutDashboard },
  { id: 'insights',   label: 'Insights',    Icon: Brain },
  { id: 'products',   label: 'Products',    Icon: ShoppingBag },
  { id: 'customers',  label: 'Customers',   Icon: Users },
  { id: 'geography',  label: 'Geography',   Icon: Globe },
  { id: 'executive',  label: 'Executive',   Icon: Briefcase },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'rgba(8,13,24,0.97)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 16px', fontSize:13 }}>
      <p style={{ color:'#64748b', marginBottom:4, fontSize:11 }}>{label}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ color: e.color || '#38bdf8', fontWeight:600 }}>
          {e.name}: {typeof e.value === 'number' && e.value > 100 ? fmtFull(e.value) : e.value}
          {label?.includes('★') ? ' (forecast)' : ''}
        </p>
      ))}
    </div>
  );
};

function KpiCard({ title, value, sub, Icon, color, delay }) {
  return (
    <motion.div className="kpi-card" initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ delay, duration:0.4 }}>
      <div className="kpi-icon" style={{ background:`${color}22`, color }}><Icon size={20}/></div>
      <div>
        <p className="kpi-label">{title}</p>
        <p className="kpi-value">{value}</p>
        {sub && <p className="kpi-sub">{sub}</p>}
      </div>
    </motion.div>
  );
}

function AlertBadge({ type }) {
  const map = { danger:'alert-danger', warning:'alert-warning', success:'alert-success', info:'alert-info' };
  return <span className={`alert-dot ${map[type] || 'alert-info'}`} />;
}

export default function Dashboard({ analytics, fileName, onReset }) {
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [compareList, setCompareList] = useState([]); // multi-product comparison
  const {
    kpi, monthlyRevenue, revenueWithForecast, topProducts, countryRevenue,
    topCustomers, segmentSummary, cohortData, alerts, recommendations, peakMonth, rowCount
  } = analytics;

  const filteredProducts  = topProducts.filter(p => !search || p.fullName.toLowerCase().includes(search.toLowerCase()));
  const filteredCustomers = topCustomers.filter(c => !search || String(c.CustomerID).includes(search) || c.Country?.toLowerCase().includes(search.toLowerCase()));

  const dangerCount = alerts.filter(a => a.type === 'danger').length;
  const warnCount   = alerts.filter(a => a.type === 'warning').length;

  // Only these tabs show search and accept filtering
  const SEARCHABLE_TABS = {
    products:  { pool: () => topProducts.map(p  => ({ label: p.fullName,           type: 'Product',  icon: '🛍️', tab: 'products'  })), placeholder: 'Search products…' },
    customers: { pool: () => topCustomers.map(c  => ({ label: String(c.CustomerID), type: 'Customer', icon: '👤', tab: 'customers' })), placeholder: 'Search customer IDs…' },
    geography: { pool: () => countryRevenue.map(c => ({ label: c.Country,           type: 'Country',  icon: '🌍', tab: 'geography' })), placeholder: 'Search countries…' },
  };

  const isSearchableTab = tab in SEARCHABLE_TABS;
  const currentPool = isSearchableTab ? SEARCHABLE_TABS[tab].pool() : [];
  const searchPlaceholder = isSearchableTab ? SEARCHABLE_TABS[tab].placeholder : '';

  const suggestions = search.trim().length > 0
    ? currentPool.filter(s => s.label.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];

  // Search dropdown state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const searchRef = useRef(null);

  // Clear search when tab changes
  const handleTabChange = (id) => {
    setTab(id);
    setSearch('');
    setShowSuggestions(false);
    setActiveIdx(-1);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearchKey = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && activeIdx >= 0) pickSuggestion(suggestions[activeIdx]);
    if (e.key === 'Escape') { setShowSuggestions(false); setActiveIdx(-1); }
  };

  return (
    <div className="dash-root">
      {// Sidebar}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <LayoutDashboard size={20}/>
          <span>Nexus</span>
        </div>

        <nav className="sidebar-nav">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} className={`nav-btn ${tab === id ? 'active' : ''}`} onClick={() => handleTabChange(id)}>
              <Icon size={15}/>
              {label}
              {id === 'insights' && (dangerCount + warnCount) > 0 && (
                <span className="nav-badge">{dangerCount + warnCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-file">
          <p className="sidebar-file-label">Loaded file</p>
          <p className="sidebar-file-name" title={fileName}>{fileName}</p>
          <p className="sidebar-file-rows">{rowCount.toLocaleString()} rows processed</p>
          <button className="reset-btn" onClick={onReset}><Upload size={13}/> Upload new CSV</button>
        </div>
      </aside>

      {// Main}
      <main className="dash-main">
        <header className="dash-topbar">
          <div>
            <h2 className="dash-page-title">
              {TABS.find(t => t.id === tab)?.label}
            </h2>
            <p className="dash-page-sub">E-Commerce Analytics Dashboard</p>
          </div>
          {isSearchableTab && (
            <div className="search-wrap" ref={searchRef}>
              <div className="search-box">
                <Search size={15} className="search-icon"/>
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowSuggestions(true); setActiveIdx(-1); }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleSearchKey}
                  className="search-input"
                />
                {search && (
                  <button className="search-clear" onClick={() => { setSearch(''); setShowSuggestions(false); }}>✕</button>
                )}
              </div>
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.ul
                    className="suggestion-list"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    {suggestions.map((s, i) => (
                      <li
                        key={i}
                        className={`suggestion-item ${i === activeIdx ? 'active' : ''}`}
                        onMouseDown={() => pickSuggestion(s)}
                      >
                        <span className="sugg-icon">{s.icon}</span>
                        <span className="sugg-label">{s.label}</span>
                        <span className="sugg-type">{s.type}</span>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">

          {// OVERVIEW}
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.25 }}>
              <div className="kpi-grid">
                <KpiCard title="Total Revenue"      value={fmt(kpi.totalRevenue)}           sub="Gross Sales"             Icon={TrendingUp}  color="#38bdf8" delay={0.04}/>
                <KpiCard title="Total Orders"       value={kpi.totalOrders.toLocaleString()} sub="Unique invoices"         Icon={BarChart2}   color="#818cf8" delay={0.08}/>
                <KpiCard title="Customers"          value={kpi.customerCount.toLocaleString()} sub="Unique buyers"         Icon={Users}       color="#34d399" delay={0.12}/>
                <KpiCard title="Avg Order Value"    value={fmtFull(kpi.aov)}                sub="Revenue ÷ Orders"        Icon={ShoppingBag} color="#fbbf24" delay={0.16}/>
                <KpiCard title="Repeat Rate"        value={`${kpi.repeatRate}%`}            sub="Multi-purchase customers" Icon={RefreshCw}   color="#f472b6" delay={0.20}/>
              </div>

              {peakMonth && (
                <motion.div className="insight-banner" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.25 }}>
                  <TrendingUp size={17}/>
                  <span>
                    <strong>Peak Month:</strong> <span className="hl">{peakMonth.name}</span> → {fmtFull(peakMonth.Revenue)}&nbsp;&nbsp;|&nbsp;&nbsp;
                    <strong>Top Product:</strong> <span className="hl">{topProducts[0]?.fullName}</span>&nbsp;&nbsp;|&nbsp;&nbsp;
                    <strong>VIP:</strong> <span className="hl">#{topCustomers[0]?.CustomerID}</span> — {fmtFull(topCustomers[0]?.CLV)} LTV
                  </span>
                </motion.div>
              )}

              {/* Revenue + Forecast chart */}
              <motion.div className="chart-card full" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
                <div className="chart-title-row">
                  <h3 className="chart-title"><TrendingUp size={17}/> Revenue Trend + 3-Month Forecast</h3>
                  <span className="badge-forecast">★ = Forecast</span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={revenueWithForecast} margin={{ top:10, right:20, left:0, bottom:0 }}>
                    <defs>
                      <linearGradient id="gr1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gr2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                    <XAxis dataKey="name" stroke="#334155" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false}/>
                    <YAxis stroke="#334155" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
                    <RechartsTip content={<CustomTooltip/>}/>
                    <ReferenceLine x={monthlyRevenue[monthlyRevenue.length-1]?.name} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" label={{ value:'Now', fill:'#64748b', fontSize:10 }}/>
                    <Area type="monotone" dataKey="Revenue" stroke="#38bdf8" strokeWidth={2.5} fill="url(#gr1)" dot={(props) => {
                      if (!props.payload?.isForecast) return <circle key={props.key} cx={props.cx} cy={props.cy} r={0}/>;
                      return <circle key={props.key} cx={props.cx} cy={props.cy} r={5} fill="#818cf8" stroke="#0f172a" strokeWidth={2}/>;
                    }}/>
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              <div className="chart-row">
                <motion.div className="chart-card" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}>
                  <h3 className="chart-title"><ShoppingBag size={16}/> Top 5 Products</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={topProducts.slice(0,5)} layout="vertical" margin={{ left:0, right:16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)"/>
                      <XAxis type="number" stroke="#334155" tick={{ fill:'#64748b', fontSize:10 }} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="name" stroke="#334155" tick={{ fill:'#64748b', fontSize:10 }} width={95} axisLine={false} tickLine={false}/>
                      <RechartsTip content={<CustomTooltip/>} cursor={{ fill:'rgba(255,255,255,0.03)' }}/>
                      <Bar dataKey="Revenue" radius={[0,6,6,0]}>
                        {topProducts.slice(0,5).map((_, i) => <Cell key={i} fill={COLORS[i]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>

                <motion.div className="chart-card" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.48 }}>
                  <h3 className="chart-title"><Layers size={16}/> Customer Segments</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={segmentSummary} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={4} dataKey="count" nameKey="name">
                        {segmentSummary.map((seg) => <Cell key={seg.name} fill={SEG_COLORS[seg.name]}/>)}
                      </Pie>
                      <RechartsTip content={<CustomTooltip/>}/>
                      <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize:11, color:'#64748b' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>
            </motion.div>
          )}

          {// INSIGHTS}
          {tab === 'insights' && (
            <motion.div key="insights" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.25 }}>

              {/* Alerts */}
              <motion.div className="section-block" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
                <h3 className="section-heading"><AlertTriangle size={17}/> KPI Alerts</h3>
                <div className="alerts-list">
                  {alerts.map((a, i) => (
                    <motion.div key={i} className={`alert-item alert-${a.type}`} initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ delay: i * 0.07 }}>
                      <span className="alert-emoji">{a.icon}</span>
                      <p>{a.msg}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Cohort */}
              <motion.div className="chart-card full" style={{ marginBottom:'1.25rem' }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}>
                <h3 className="chart-title"><Users size={16}/> Cohort Analysis — Customer Retention Funnel</h3>
                <div className="cohort-funnel">
                  {cohortData.map((stage, i) => (
                    <div key={i} className="funnel-stage">
                      <div className="funnel-bar-wrap">
                        <div className="funnel-bar" style={{ width:`${stage.pct}%`, background: COLORS[i] }}/>
                      </div>
                      <div className="funnel-meta">
                        <span className="funnel-label">{stage.stage}</span>
                        <span className="funnel-count">{stage.customers.toLocaleString()} customers</span>
                        <span className="funnel-pct" style={{ color: COLORS[i] }}>{stage.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="cohort-note">
                  {parseFloat(kpi.repeatRate) < 30
                    ? `⚠️ Only ${kpi.repeatRate}% of customers return after their first order. Industry benchmark is 35–45%. Invest in post-purchase email sequences.`
                    : `✅ ${kpi.repeatRate}% repeat rate is solid. Focus on converting "Frequent Buyers" into "High-Value" customers.`}
                </p>
              </motion.div>

              {/* Segmentation detail */}
              <motion.div className="chart-card full" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}>
                <h3 className="chart-title"><Layers size={16}/> Customer Segmentation Breakdown</h3>
                <div className="segment-cards">
                  {segmentSummary.map((seg, i) => (
                    <div key={i} className="segment-card" style={{ borderColor: SEG_COLORS[seg.name] }}>
                      <div className="seg-dot" style={{ background: SEG_COLORS[seg.name] }}/>
                      <p className="seg-name">{seg.name}</p>
                      <p className="seg-count">{seg.count.toLocaleString()} customers</p>
                      <p className="seg-revenue">Avg CLV: {fmtFull(seg.avgCLV)}</p>
                      <p className="seg-total">Total: {fmt(seg.totalRevenue)}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Recommendations */}
              <motion.div className="section-block" style={{ marginTop:'1.25rem' }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}>
                <h3 className="section-heading"><Brain size={17}/> Strategic Recommendations</h3>
                <div className="rec-grid">
                  {recommendations.map((r, i) => (
                    <motion.div key={i} className="rec-card" initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.4 + i*0.07 }}>
                      <span className="rec-emoji">{r.emoji}</span>
                      <div>
                        <p className="rec-title">{r.title}</p>
                        <p className="rec-detail">{r.detail}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {// PRODUCTS}
          {tab === 'products' && (() => {
            // Comparison mode: user has selected specific products to compare
            const compareData = compareList.length > 0
              ? compareList.map(c => topProducts.find(p => p.fullName === c.label)).filter(Boolean)
              : filteredProducts;
            const isComparing = compareList.length > 0;

            return (
              <motion.div key="products" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.25 }}>

                {/* Compare chips + hint */}
                <div className="compare-bar">
                  <div className="compare-chips">
                    {compareList.length === 0 && (
                      <span className="compare-hint">🔍 Type a product name above to add it to comparison (up to 5)</span>
                    )}
                    {compareList.map((c, i) => (
                      <span key={i} className="compare-chip" style={{ borderColor: COLORS[i], color: COLORS[i] }}>
                        <span className="chip-dot" style={{ background: COLORS[i] }}/>
                        {c.label.length > 28 ? c.label.slice(0, 28) + '…' : c.label}
                        <button className="chip-remove" onClick={() => setCompareList(prev => prev.filter((_, j) => j !== i))}>✕</button>
                      </span>
                    ))}
                  </div>
                  {compareList.length > 0 && (
                    <button className="compare-clear" onClick={() => setCompareList([])}>Clear all</button>
                  )}
                </div>

                {/* Chart */}
                <motion.div className="chart-card full" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>
                  <h3 className="chart-title">
                    <ShoppingBag size={16}/>
                    {isComparing ? `Comparing ${compareList.length} Product${compareList.length > 1 ? 's' : ''}` : 'Top 10 Products by Revenue'}
                  </h3>
                  <ResponsiveContainer width="100%" height={isComparing ? Math.max(220, compareData.length * 72) : 340}>
                    <BarChart data={compareData} layout="vertical" margin={{ left:0, right:24, top:8, bottom:8 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)"/>
                      <XAxis type="number" stroke="#334155" tick={{ fill:'#64748b', fontSize:11 }} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="name" stroke="#334155" tick={{ fill:'#64748b', fontSize:11 }} width={135} axisLine={false} tickLine={false}/>
                      <RechartsTip content={<CustomTooltip/>} cursor={{ fill:'rgba(255,255,255,0.03)' }}/>
                      <Bar dataKey="Revenue" radius={[0,6,6,0]} name="Revenue">
                        {compareData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* When comparing: show Qty side-by-side chart too */}
                {isComparing && (
                  <motion.div className="chart-card full" style={{ marginTop:'1.25rem' }} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
                    <h3 className="chart-title"><ShoppingBag size={16}/> Quantity Sold — Side by Side</h3>
                    <ResponsiveContainer width="100%" height={Math.max(220, compareData.length * 72)}>
                      <BarChart data={compareData} layout="vertical" margin={{ left:0, right:24, top:8, bottom:8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)"/>
                        <XAxis type="number" stroke="#334155" tick={{ fill:'#64748b', fontSize:11 }} tickFormatter={v=>v.toLocaleString()} axisLine={false} tickLine={false}/>
                        <YAxis type="category" dataKey="name" stroke="#334155" tick={{ fill:'#64748b', fontSize:11 }} width={135} axisLine={false} tickLine={false}/>
                        <RechartsTip content={<CustomTooltip/>} cursor={{ fill:'rgba(255,255,255,0.03)' }}/>
                        <Bar dataKey="Qty" radius={[0,6,6,0]} name="Units Sold">
                          {compareData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {/* Table */}
                <div className="table-card">
                  <table className="data-table">
                    <thead><tr><th>#</th><th>Product</th><th className="r">Revenue</th><th className="r">Qty Sold</th></tr></thead>
                    <tbody>
                      {compareData.length === 0 && (
                        <tr><td colSpan="4" style={{ textAlign:'center', padding:'2rem', color:'#475569' }}>No products matched. Try a different search.</td></tr>
                      )}
                      {compareData.map((p, i) => (
                        <tr key={i}><td className="rank">#{i+1}</td><td>{p.fullName}</td><td className="r green">{fmtFull(p.Revenue)}</td><td className="r">{p.Qty?.toLocaleString()}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            );
          })()}

          {// CUSTOMERS}
          {tab === 'customers' && (
            <motion.div key="customers" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.25 }}>
              <div className="table-card">
                <h3 className="chart-title" style={{ marginBottom:'1rem' }}><Users size={16}/> Top 20 Customers — Lifetime Value</h3>
                <table className="data-table">
                  <thead><tr><th>#</th><th>Customer ID</th><th>Country</th><th className="r">Orders</th><th className="r">Lifetime Value</th><th className="r">Segment</th></tr></thead>
                  <tbody>
                    {filteredCustomers.length === 0 && <tr><td colSpan="6" style={{ textAlign:'center', padding:'2rem', color:'#475569' }}>No results.</td></tr>}
                    {filteredCustomers.map((c, i) => {
                      const seg = c.CLV >= (topCustomers[Math.floor(topCustomers.length*0.2)]?.CLV || 0) ? 'High-Value' : c.Orders >= 5 ? 'Frequent Buyer' : c.Orders === 1 ? 'One-Time Buyer' : 'At-Risk';
                      return (
                        <tr key={c.CustomerID}>
                          <td className="rank">#{i+1}</td>
                          <td className="mono">{c.CustomerID}</td>
                          <td>{c.Country}</td>
                          <td className="r">{c.Orders}</td>
                          <td className="r green bold">{fmtFull(c.CLV)}</td>
                          <td className="r"><span className="seg-tag" style={{ background: SEG_COLORS[seg]+'22', color: SEG_COLORS[seg] }}>{seg}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {// GEOGRAPHY}
          {tab === 'geography' && (
            <motion.div key="geo" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.25 }}>
              <div className="chart-row">
                <motion.div className="chart-card" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>
                  <h3 className="chart-title"><Globe size={16}/> Revenue Share by Market</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={countryRevenue} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} dataKey="TotalAmount" nameKey="Country">
                        {countryRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                      </Pie>
                      <RechartsTip content={<CustomTooltip/>}/>
                      <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize:11, color:'#64748b' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
                <motion.div className="chart-card" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
                  <h3 className="chart-title"><BarChart2 size={16}/> Revenue by Country</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={countryRevenue} margin={{ left:0, right:16 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)"/>
                      <XAxis dataKey="Country" stroke="#334155" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false}/>
                      <YAxis stroke="#334155" tick={{ fill:'#64748b', fontSize:10 }} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
                      <RechartsTip content={<CustomTooltip/>} cursor={{ fill:'rgba(255,255,255,0.03)' }}/>
                      <Bar dataKey="TotalAmount" radius={[6,6,0,0]}>
                        {countryRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>
              <div className="table-card">
                <table className="data-table">
                  <thead><tr><th>Country</th><th className="r">Total Revenue</th><th className="r">% Share</th></tr></thead>
                  <tbody>
                    {countryRevenue.map((c, i) => (
                      <tr key={i}><td>{c.Country}</td><td className="r green">{fmtFull(c.TotalAmount)}</td><td className="r">{((c.TotalAmount / kpi.totalRevenue)*100).toFixed(1)}%</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {// EXECUTIVE}
          {tab === 'executive' && (
            <motion.div key="executive" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.25 }}>
              <div className="exec-header">
                <Briefcase size={32} style={{ color:'#38bdf8' }}/>
                <div>
                  <h2 className="exec-title">Executive Summary</h2>
                  <p className="exec-sub">Decision-ready overview for leadership & stakeholders</p>
                </div>
              </div>

              {/* Big KPI row */}
              <div className="kpi-grid" style={{ marginBottom:'1.5rem' }}>
                <KpiCard title="Total Revenue"   value={fmt(kpi.totalRevenue)}             sub="Overall gross sales"     Icon={TrendingUp}  color="#38bdf8" delay={0.05}/>
                <KpiCard title="Total Orders"    value={kpi.totalOrders.toLocaleString()}   sub="Unique invoices"         Icon={BarChart2}   color="#818cf8" delay={0.09}/>
                <KpiCard title="Customers"       value={kpi.customerCount.toLocaleString()} sub="Active buyers"           Icon={Users}       color="#34d399" delay={0.13}/>
                <KpiCard title="Avg Order Value" value={fmtFull(kpi.aov)}                  sub="Revenue ÷ Orders"        Icon={ShoppingBag} color="#fbbf24" delay={0.17}/>
                <KpiCard title="Repeat Rate"     value={`${kpi.repeatRate}%`}              sub="2nd-purchase customers"  Icon={RefreshCw}   color="#f472b6" delay={0.21}/>
              </div>

              {/* 3 Key Insights */}
              <motion.div className="section-block" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}>
                <h3 className="section-heading">📌 3 Key Insights</h3>
                <div className="exec-insights">
                  <div className="exec-insight-card">
                    <span className="exec-num">01</span>
                    <div>
                      <p className="exec-insight-title">Revenue Peak & Seasonality</p>
                      <p className="exec-insight-body">The business hit its highest revenue in <strong>{peakMonth?.name}</strong> — {fmtFull(peakMonth?.Revenue)}. Lean into Q4 seasonal demand with targeted campaigns.</p>
                    </div>
                  </div>
                  <div className="exec-insight-card">
                    <span className="exec-num">02</span>
                    <div>
                      <p className="exec-insight-title">Top Product Concentration Risk</p>
                      <p className="exec-insight-body"><strong>"{topProducts[0]?.fullName}"</strong> drives a disproportionate share of revenue. Diversify the product portfolio to reduce dependency on a single SKU.</p>
                    </div>
                  </div>
                  <div className="exec-insight-card">
                    <span className="exec-num">03</span>
                    <div>
                      <p className="exec-insight-title">Customer Retention Gap</p>
                      <p className="exec-insight-body">Only <strong>{kpi.repeatRate}%</strong> of customers make repeat purchases. The industry benchmark is 35–45%. Improving to benchmark could add {fmt(kpi.totalRevenue * 0.12)} in incremental revenue.</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 2 Recommendations */}
              <motion.div className="section-block" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}>
                <h3 className="section-heading">🎯 2 Priority Recommendations</h3>
                <div className="exec-rec-list">
                  {recommendations.slice(0, 2).map((r, i) => (
                    <div key={i} className="exec-rec">
                      <span className="exec-rec-num">{i + 1}</span>
                      <div>
                        <p className="exec-rec-title">{r.emoji} {r.title}</p>
                        <p className="exec-rec-body">{r.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Bottom tagline */}
              <motion.div className="exec-tagline" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.55 }}>
                <p>"This dashboard helps businesses increase revenue by identifying high-performing products and improving customer retention through data-driven decision-making."</p>
                <span>— Nexus Analytics Analytics Dashboard</span>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
