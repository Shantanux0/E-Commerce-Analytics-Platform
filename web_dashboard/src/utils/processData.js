/**
 * Processes raw parsed CSV rows from the Online Retail dataset.
 * Returns all aggregated analytics needed for the dashboard.
 */
export function processRetailData(rows) {
  // 1. Clean & transform
  const cleaned = rows
    .filter(r => r.CustomerID && r.CustomerID.trim() !== '')
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
    .filter(r => r.Quantity > 0 && r.UnitPrice > 0);

  // Add TotalAmount
  const data = cleaned.map(r => ({ ...r, TotalAmount: r.Quantity * r.UnitPrice }));

  // 2. Core KPIs
  const totalRevenue = data.reduce((s, r) => s + r.TotalAmount, 0);
  const totalOrders = new Set(data.map(r => r.InvoiceNo)).size;
  const customerCount = new Set(data.map(r => r.CustomerID)).size;
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // 3. Monthly Revenue
  const monthMap = {};
  data.forEach(r => {
    const d = r.InvoiceDate;
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = (monthMap[key] || 0) + r.TotalAmount;
  });
  const monthlyRevenue = Object.entries(monthMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, Revenue]) => ({ name, Revenue }));

  // 4. Top Products
  const productMap = {};
  data.forEach(r => {
    const key = r.StockCode;
    if (!productMap[key]) productMap[key] = { StockCode: key, Description: r.Description, Revenue: 0, Qty: 0 };
    productMap[key].Revenue += r.TotalAmount;
    productMap[key].Qty += r.Quantity;
  });
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.Revenue - a.Revenue)
    .slice(0, 10)
    .map(p => ({
      name: p.Description.length > 22 ? p.Description.substring(0, 22) + '…' : p.Description,
      fullName: p.Description,
      Revenue: p.Revenue,
      Qty: p.Qty,
    }));

  // 5. Country Revenue
  const countryMap = {};
  data.forEach(r => {
    countryMap[r.Country] = (countryMap[r.Country] || 0) + r.TotalAmount;
  });
  const countryRevenue = Object.entries(countryMap)
    .map(([Country, TotalAmount]) => ({ Country, TotalAmount }))
    .sort((a, b) => b.TotalAmount - a.TotalAmount)
    .slice(0, 10);

  // 6. Top Customers
  const custMap = {};
  data.forEach(r => {
    if (!custMap[r.CustomerID]) custMap[r.CustomerID] = { CustomerID: r.CustomerID, Country: r.Country, CLV: 0, Orders: new Set() };
    custMap[r.CustomerID].CLV += r.TotalAmount;
    custMap[r.CustomerID].Orders.add(r.InvoiceNo);
  });
  const topCustomers = Object.values(custMap)
    .sort((a, b) => b.CLV - a.CLV)
    .slice(0, 20)
    .map(c => ({ ...c, Orders: c.Orders.size }));

  // 7. Repeat Customer Rate
  const custOrderCounts = Object.values(custMap).map(c => c.Orders.size);
  const repeatCount = custOrderCounts.filter(n => n > 1).length;
  const repeatRate = custOrderCounts.length > 0 ? ((repeatCount / custOrderCounts.length) * 100).toFixed(1) : 0;

  // 8. Peak month
  const peakMonth = monthlyRevenue.reduce((max, m) => m.Revenue > (max?.Revenue || 0) ? m : max, null);

  return {
    kpi: { totalRevenue, totalOrders, customerCount, aov, repeatRate },
    monthlyRevenue,
    topProducts,
    countryRevenue,
    topCustomers,
    peakMonth,
    rowCount: data.length,
  };
}
