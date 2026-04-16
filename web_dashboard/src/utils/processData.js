/**
 * Analytics utility Analytics Platform.
 * Processes raw CSV rows into all metrics needed by the dashboard.
 */

// Simple Linear Regression
function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y || 0 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function processRetailData(rows) {
  // 1. Clean & Enrich
  const cleaned = rows
    .filter(r => r.CustomerID && String(r.CustomerID).trim() !== '')
    .filter(r => !String(r.InvoiceNo).startsWith('C'))
    .map(r => ({
      InvoiceNo: String(r.InvoiceNo).trim(),
      StockCode: String(r.StockCode).trim(),
      Description: String(r.Description || '').trim(),
      Quantity: parseFloat(r.Quantity) || 0,
      InvoiceDate: new Date(r.InvoiceDate),
      UnitPrice: parseFloat(r.UnitPrice) || 0,
      CustomerID: String(r.CustomerID).trim(),
      Country: String(r.Country || '').trim(),
    }))
    .filter(r => r.Quantity > 0 && r.UnitPrice > 0 && !isNaN(r.InvoiceDate));

  const data = cleaned.map(r => ({ ...r, TotalAmount: r.Quantity * r.UnitPrice }));

  // 2. Core KPIs
  const totalRevenue = data.reduce((s, r) => s + r.TotalAmount, 0);
  const totalOrders = new Set(data.map(r => r.InvoiceNo)).size;
  const customerCount = new Set(data.map(r => r.CustomerID)).size;
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // 3. Monthly Revenue
  const monthMap = {};
  data.forEach(r => {
    const key = `${r.InvoiceDate.getFullYear()}-${String(r.InvoiceDate.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = (monthMap[key] || 0) + r.TotalAmount;
  });
  const monthlyRevenue = Object.entries(monthMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, Revenue]) => ({ name, Revenue }));

  // 4. Forecasting (next 3 months via linear regression)
  const regPoints = monthlyRevenue.map((m, i) => ({ x: i, y: m.Revenue }));
  const { slope, intercept } = linearRegression(regPoints);
  const lastMonthStr = monthlyRevenue[monthlyRevenue.length - 1]?.name || '2011-12';
  const [lastYear, lastMon] = lastMonthStr.split('-').map(Number);
  const forecast = [];
  for (let i = 1; i <= 3; i++) {
    const xIdx = regPoints.length - 1 + i;
    const predicted = Math.max(0, slope * xIdx + intercept);
    let m = lastMon + i, y = lastYear;
    if (m > 12) { m -= 12; y += 1; }
    forecast.push({ name: `${y}-${String(m).padStart(2, '0')} ★`, Revenue: Math.round(predicted), isForecast: true });
  }
  const revenueWithForecast = [
    ...monthlyRevenue.map(m => ({ ...m, isForecast: false })),
    ...forecast,
  ];

  // 5. Products
  const productMap = {};
  data.forEach(r => {
    if (!productMap[r.StockCode]) productMap[r.StockCode] = { StockCode: r.StockCode, Description: r.Description, Revenue: 0, Qty: 0 };
    productMap[r.StockCode].Revenue += r.TotalAmount;
    productMap[r.StockCode].Qty += r.Quantity;
  });
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.Revenue - a.Revenue)
    .slice(0, 10)
    .map(p => ({ ...p, name: p.Description.length > 22 ? p.Description.substring(0, 22) + '…' : p.Description, fullName: p.Description }));

  // 6. Country Revenue
  const countryMap = {};
  data.forEach(r => { countryMap[r.Country] = (countryMap[r.Country] || 0) + r.TotalAmount; });
  const countryRevenue = Object.entries(countryMap)
    .map(([Country, TotalAmount]) => ({ Country, TotalAmount }))
    .sort((a, b) => b.TotalAmount - a.TotalAmount)
    .slice(0, 12);

  // 7. Customer Map
  const custMap = {};
  data.forEach(r => {
    if (!custMap[r.CustomerID]) custMap[r.CustomerID] = { CustomerID: r.CustomerID, Country: r.Country, CLV: 0, Orders: new Set(), Dates: [] };
    custMap[r.CustomerID].CLV += r.TotalAmount;
    custMap[r.CustomerID].Orders.add(r.InvoiceNo);
    custMap[r.CustomerID].Dates.push(r.InvoiceDate);
  });
  const custList = Object.values(custMap).map(c => {
    // Use reduce instead of spread to avoid call stack overflow on large arrays
    const minTs = c.Dates.reduce((min, d) => d < min ? d : min, c.Dates[0]);
    const maxTs = c.Dates.reduce((max, d) => d > max ? d : max, c.Dates[0]);
    return {
      CustomerID: c.CustomerID,
      Country: c.Country,
      CLV: c.CLV,
      Orders: c.Orders.size,
      FirstDate: new Date(minTs),
      LastDate: new Date(maxTs),
    };
  });

  const topCustomers = [...custList].sort((a, b) => b.CLV - a.CLV).slice(0, 20);

  // 8. Customer Segmentation
  const clvValues = custList.map(c => c.CLV).sort((a, b) => a - b);
  const clvP80 = clvValues[Math.floor(clvValues.length * 0.8)];
  const clvP40 = clvValues[Math.floor(clvValues.length * 0.4)];
  // Safe max-date using reduce (spread crashes on 500k+ rows)
  const now = new Date(data.reduce((max, r) => r.InvoiceDate > max ? r.InvoiceDate : max, data[0].InvoiceDate));
  const segments = { 'High-Value': [], 'Frequent Buyer': [], 'One-Time Buyer': [], 'At-Risk': [] };
  custList.forEach(c => {
    const daysSinceLast = (now - c.LastDate) / (1000 * 60 * 60 * 24);
    if (c.CLV >= clvP80) segments['High-Value'].push(c);
    else if (c.Orders >= 5) segments['Frequent Buyer'].push(c);
    else if (c.Orders === 1) segments['One-Time Buyer'].push(c);
    else if (daysSinceLast > 90) segments['At-Risk'].push(c);
    else segments['Frequent Buyer'].push(c);
  });
  const segmentSummary = Object.entries(segments).map(([name, customers]) => ({
    name,
    count: customers.length,
    avgCLV: customers.length > 0 ? customers.reduce((s, c) => s + c.CLV, 0) / customers.length : 0,
    totalRevenue: customers.reduce((s, c) => s + c.CLV, 0),
  }));

  // 9. Cohort Analysis (Return Rate)
  const returners = custList.filter(c => c.Orders > 1).length;
  const returnRate = custList.length > 0 ? ((returners / custList.length) * 100).toFixed(1) : 0;
  const cohortData = [
    { stage: '1st Purchase', customers: custList.length, pct: 100 },
    { stage: 'Returned (2+)', customers: returners, pct: parseFloat(returnRate) },
    { stage: 'Loyal (5+)', customers: custList.filter(c => c.Orders >= 5).length, pct: parseFloat(((custList.filter(c => c.Orders >= 5).length / custList.length) * 100).toFixed(1)) },
  ];

  // 10. Alerts
  const alerts = [];
  if (monthlyRevenue.length >= 2) {
    const curr = monthlyRevenue[monthlyRevenue.length - 1];
    const prev = monthlyRevenue[monthlyRevenue.length - 2];
    const revChange = ((curr.Revenue - prev.Revenue) / prev.Revenue) * 100;
    if (revChange < -10) alerts.push({ type: 'danger', icon: '⚠️', msg: `Revenue dropped ${Math.abs(revChange).toFixed(1)}% vs last month (${curr.name} vs ${prev.name})` });
    else if (revChange > 10) alerts.push({ type: 'success', icon: '🔥', msg: `Revenue surged ${revChange.toFixed(1)}% vs last month — strong growth momentum!` });
    else alerts.push({ type: 'info', icon: '📊', msg: `Revenue is stable (${revChange > 0 ? '+' : ''}${revChange.toFixed(1)}% MoM). Monitor for sustained trends.` });
  }
  if (parseFloat(returnRate) < 30) alerts.push({ type: 'danger', icon: '⚠️', msg: `Only ${returnRate}% of customers make a repeat purchase. Focus on retention campaigns.` });
  else alerts.push({ type: 'success', icon: '✅', msg: `${returnRate}% customer return rate — healthy retention signal.` });
  if (segments['At-Risk'].length > 0) alerts.push({ type: 'warning', icon: '💡', msg: `${segments['At-Risk'].length} at-risk customers haven't purchased in 90+ days. Re-engage them now.` });
  if (topProducts[0]) alerts.push({ type: 'info', icon: '🛍️', msg: `"${topProducts[0].fullName}" is your top revenue driver. Consider bundling it to increase basket size.` });

  // 11. Recommendations
  const recommendations = [
    { emoji: '💡', title: 'Boost Retention', detail: `Only ${returnRate}% of buyers return. Launch a loyalty reward or follow-up email within 14 days of purchase.` },
    { emoji: '🚀', title: 'Upsell Top Product', detail: `"${topProducts[0]?.fullName}" drives the most revenue. Bundle it with "${topProducts[1]?.fullName}" to increase AOV.` },
    { emoji: '🌍', title: 'Expand Top Market', detail: `${countryRevenue[1]?.Country || 'Germany'} is your #2 market. Invest in localized campaigns to grow share.` },
    { emoji: '🎯', title: 'Re-activate At-Risk Customers', detail: `${segments['At-Risk'].length} customers haven't bought in 90+ days. A targeted 10% discount can win them back.` },
  ];

  // 12. Misc
  const repeatRate = returnRate;
  const peakMonth = monthlyRevenue.reduce((max, m) => m.Revenue > (max?.Revenue || 0) ? m : max, null);

  return {
    kpi: { totalRevenue, totalOrders, customerCount, aov, repeatRate },
    monthlyRevenue,
    revenueWithForecast,
    topProducts,
    countryRevenue,
    topCustomers,
    segmentSummary,
    cohortData,
    alerts,
    recommendations,
    peakMonth,
    rowCount: data.length,
  };
}
