import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, TrendingUp, Users, ShoppingBag,
  Search, Globe, BarChart2, Upload, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTip,
  ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#38bdf8','#818cf8','#34d399','#fbbf24','#f472b6','#a78bfa','#2dd4bf','#f87171','#c084fc','#fb923c'];

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n);
const fmtFull = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const TABS = ['Overview', 'Products', 'Customers', 'Geography'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 16px', fontSize: 13 }}>
      <p style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ color: e.color || '#38bdf8', fontWeight: 600 }}>
          {e.name}: {typeof e.value === 'number' && e.value > 100 ? fmtFull(e.value) : e.value}
        </p>
      ))}
    </div>
  );
};

function KpiCard({ title, value, sub, icon: Icon, color, delay }) {
  return (
    <motion.div className="kpi-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45 }}>
      <div className="kpi-icon" style={{ background: `${color}22`, color }}>
        <Icon size={22} />
      </div>
      <div>
        <p className="kpi-label">{title}</p>
        <p className="kpi-value">{value}</p>
        {sub && <p className="kpi-sub">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function Dashboard({ analytics, fileName, onReset }) {
  const [tab, setTab] = useState('Overview');
  const [search, setSearch] = useState('');
  const { kpi, monthlyRevenue, topProducts, countryRevenue, topCustomers, peakMonth, rowCount } = analytics;

  const filteredProducts = topProducts.filter(p =>
    !search || p.fullName.toLowerCase().includes(search.toLowerCase())
  );
  const filteredCustomers = topCustomers.filter(c =>
    !search || String(c.CustomerID).includes(search) || c.Country?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dash-root">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <LayoutDashboard size={22} />
          <span>Nexus</span>
        </div>

        <nav className="sidebar-nav">
          {TABS.map(t => (
            <button
              key={t}
              className={`nav-btn ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'Overview' && <TrendingUp size={16} />}
              {t === 'Products' && <ShoppingBag size={16} />}
              {t === 'Customers' && <Users size={16} />}
              {t === 'Geography' && <Globe size={16} />}
              {t}
            </button>
          ))}
        </nav>

        <div className="sidebar-file">
          <p className="sidebar-file-label">Loaded file</p>
          <p className="sidebar-file-name" title={fileName}>{fileName}</p>
          <p className="sidebar-file-rows">{rowCount.toLocaleString()} rows processed</p>
          <button className="reset-btn" onClick={onReset}>
            <Upload size={14} /> Upload new CSV
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dash-main">
        {/* Top Bar */}
        <header className="dash-topbar">
          <div>
            <h2 className="dash-page-title">{tab}</h2>
            <p className="dash-page-sub">E-Commerce Analytics Platform</p>
          </div>
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search products, customers, countries…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
        </header>

        <AnimatePresence mode="wait">
          {tab === 'Overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              {/* KPI Row */}
              <div className="kpi-grid">
                <KpiCard title="Total Revenue" value={fmt(kpi.totalRevenue)} sub="Gross Sales" icon={TrendingUp} color="#38bdf8" delay={0.05} />
                <KpiCard title="Total Orders" value={kpi.totalOrders.toLocaleString()} sub="Unique invoices" icon={BarChart2} color="#818cf8" delay={0.1} />
                <KpiCard title="Customers" value={kpi.customerCount.toLocaleString()} sub="Unique buyers" icon={Users} color="#34d399" delay={0.15} />
                <KpiCard title="Avg Order Value" value={fmtFull(kpi.aov)} sub="Revenue / Orders" icon={ShoppingBag} color="#fbbf24" delay={0.2} />
                <KpiCard title="Repeat Rate" value={`${kpi.repeatRate}%`} sub="Multi-purchase customers" icon={RefreshCw} color="#f472b6" delay={0.25} />
              </div>

              {/* Insight Banner */}
              {peakMonth && (
                <motion.div className="insight-banner" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                  <TrendingUp size={18} />
                  <div>
                    <strong>Peak Month:</strong> <span className="hl">{peakMonth.name}</span> generated <span className="hl">{fmtFull(peakMonth.Revenue)}</span> in revenue — your strongest trading period.
                    &nbsp;|&nbsp; <strong>Top Product:</strong> <span className="hl">{topProducts[0]?.fullName}</span>
                    &nbsp;|&nbsp; <strong>VIP Customer:</strong> <span className="hl">#{topCustomers[0]?.CustomerID}</span> with {fmtFull(topCustomers[0]?.CLV)} LTV.
                  </div>
                </motion.div>
              )}

              {/* Revenue Trend */}
              <motion.div className="chart-card full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <h3 className="chart-title"><TrendingUp size={18} /> Monthly Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyRevenue} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gr1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
                    <RechartsTip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Revenue" stroke="#38bdf8" strokeWidth={2.5} fill="url(#gr1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Mini charts row */}
              <div className="chart-row">
                {/* Top 5 products mini */}
                <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                  <h3 className="chart-title"><ShoppingBag size={18} /> Top 5 Products</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={topProducts.slice(0, 5)} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `$${v/1000}k`} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10 }} width={90} axisLine={false} tickLine={false} />
                      <RechartsTip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                      <Bar dataKey="Revenue" radius={[0, 6, 6, 0]}>
                        {topProducts.slice(0, 5).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Top 5 countries mini */}
                <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                  <h3 className="chart-title"><Globe size={18} /> Revenue by Country</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={countryRevenue.slice(0, 6)}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={80}
                        paddingAngle={4}
                        dataKey="TotalAmount"
                        nameKey="Country"
                      >
                        {countryRevenue.slice(0, 6).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <RechartsTip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>
            </motion.div>
          )}

          {tab === 'Products' && (
            <motion.div key="products" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <motion.div className="chart-card full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h3 className="chart-title"><ShoppingBag size={18} /> Top 10 Products by Revenue</h3>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={filteredProducts} layout="vertical" margin={{ left: 0, right: 24, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} width={130} axisLine={false} tickLine={false} />
                    <RechartsTip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="Revenue" radius={[0, 6, 6, 0]}>
                      {filteredProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr><th>Product</th><th>Stock Code</th><th className="r">Revenue</th><th className="r">Qty Sold</th></tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p, i) => (
                      <tr key={i}>
                        <td>{p.fullName}</td>
                        <td className="mono">{topProducts[i]?.StockCode || '—'}</td>
                        <td className="r green">{fmtFull(p.Revenue)}</td>
                        <td className="r">{p.Qty?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {tab === 'Customers' && (
            <motion.div key="customers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="table-card">
                <h3 className="chart-title mb-4"><Users size={18}/> Top 20 Customers by Lifetime Value</h3>
                <table className="data-table">
                  <thead>
                    <tr><th>#</th><th>Customer ID</th><th>Country</th><th className="r">Orders</th><th className="r">Lifetime Value</th></tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 && (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#475569' }}>No customers matched your search.</td></tr>
                    )}
                    {filteredCustomers.map((c, i) => (
                      <tr key={c.CustomerID}>
                        <td className="rank">#{i + 1}</td>
                        <td className="mono">{c.CustomerID}</td>
                        <td>{c.Country}</td>
                        <td className="r">{c.Orders}</td>
                        <td className="r green bold">{fmtFull(c.CLV)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {tab === 'Geography' && (
            <motion.div key="geo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="chart-row">
                <motion.div className="chart-card" style={{ flex: 1 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="chart-title"><Globe size={18} /> Revenue Share by Market</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={countryRevenue} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} dataKey="TotalAmount" nameKey="Country">
                        {countryRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RechartsTip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
                <motion.div className="chart-card" style={{ flex: 1 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <h3 className="chart-title"><BarChart2 size={18} /> Top Markets Bar</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={countryRevenue} margin={{ left: 0, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="Country" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                      <RechartsTip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                      <Bar dataKey="TotalAmount" radius={[6, 6, 0, 0]}>
                        {countryRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
                      <tr key={i}>
                        <td>{c.Country}</td>
                        <td className="r green">{fmtFull(c.TotalAmount)}</td>
                        <td className="r">{((c.TotalAmount / kpi.totalRevenue) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
