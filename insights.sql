-- E-Commerce Analytics Queries
-- Setup for standard relational databases (SQLite used here)

-- Monthly Revenue
-- Total revenue per month
SELECT 
    YearMonth,
    SUM(TotalAmount) AS MonthlyRevenue,
    COUNT(DISTINCT InvoiceNo) AS TotalOrders
FROM sales
GROUP BY YearMonth
ORDER BY YearMonth;

-- Top 10 Best-Selling Products
SELECT 
    StockCode,
    Description,
    SUM(Quantity) AS TotalQuantitySold,
    SUM(TotalAmount) AS TotalRevenue
FROM sales
GROUP BY StockCode, Description
ORDER BY TotalRevenue DESC
LIMIT 10;

-- Top 20 Customers by LTV
SELECT 
    CustomerID,
    Country,
    COUNT(DISTINCT InvoiceNo) AS TotalPurchases,
    SUM(TotalAmount) AS CustomerValue
FROM sales
GROUP BY CustomerID, Country
ORDER BY CustomerValue DESC
LIMIT 20;

-- Sales by Country (excluding UK)
SELECT 
    Country,
    COUNT(DISTINCT InvoiceNo) AS TotalOrders,
    SUM(TotalAmount) AS TotalRevenue
FROM sales
WHERE Country != 'United Kingdom'
GROUP BY Country
ORDER BY TotalRevenue DESC
LIMIT 10;

-- Repeat Customer Rate
WITH CustomerOrders AS (
    SELECT 
        CustomerID,
        COUNT(DISTINCT InvoiceNo) AS OrderCount
    FROM sales
    GROUP BY CustomerID
)
SELECT 
    (SUM(CASE WHEN OrderCount > 1 THEN 1 ELSE 0 END) * 100.0) / COUNT(*) AS RepeatCustomerRate_Percentage
FROM CustomerOrders;

-- Cancellations tracking (for high-return items)
-- SELECT * FROM cancellations ...
