-- E-Commerce Analytics SQL Insights
-- These queries are designed for standard relational databases (SQLite used here).

-- 1. Monthly Revenue & Growth
-- Calculate total revenue per month to understand overarching sales trends.
SELECT 
    YearMonth,
    SUM(TotalAmount) AS MonthlyRevenue,
    COUNT(DISTINCT InvoiceNo) AS TotalOrders
FROM sales
GROUP BY YearMonth
ORDER BY YearMonth;


-- 2. Top 10 Best-Selling Products
-- Identify the products driving the most revenue overall.
SELECT 
    StockCode,
    Description,
    SUM(Quantity) AS TotalQuantitySold,
    SUM(TotalAmount) AS TotalRevenue
FROM sales
GROUP BY StockCode, Description
ORDER BY TotalRevenue DESC
LIMIT 10;


-- 3. Customer Lifetime Value (CLV)
-- Calculate the top 20 most valuable customers based on historical spend.
SELECT 
    CustomerID,
    Country,
    COUNT(DISTINCT InvoiceNo) AS TotalPurchases,
    SUM(TotalAmount) AS CustomerValue
FROM sales
GROUP BY CustomerID, Country
ORDER BY CustomerValue DESC
LIMIT 20;


-- 4. Sales by Country
-- Which geographies are contributing the most revenue (excluding UK which typically dominates)?
SELECT 
    Country,
    COUNT(DISTINCT InvoiceNo) AS TotalOrders,
    SUM(TotalAmount) AS TotalRevenue
FROM sales
WHERE Country != 'United Kingdom' -- Exclude the dominant market for better international insight
GROUP BY Country
ORDER BY TotalRevenue DESC
LIMIT 10;


-- 5. Repeat Customer Rate
-- Calculate the percentage of customers who have made more than one purchase.
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

-- Note: The cancellations table can be used similarly to track high-return items.
