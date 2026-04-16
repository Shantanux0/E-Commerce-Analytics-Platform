import pandas as pd
import sqlite3
import os
import json

# Define paths
INPUT_FILE = "/Users/shantanukale/Downloads/Job/Data analytics /online_retail.csv"
OUTPUT_DIR = "/Users/shantanukale/Downloads/Job/Data analytics "
DB_PATH = os.path.join(OUTPUT_DIR, "ecommerce.db")
JSON_OUTPUT_DIR = os.path.join(OUTPUT_DIR, "dashboard_data")

# Create directories if they don't exist
os.makedirs(JSON_OUTPUT_DIR, exist_ok=True)

def process_data():
    print(f"Loading data from {INPUT_FILE}...")
    try:
        # Some descriptions might have mixed encoding in standard retail datasets, so let's handle it
        df = pd.read_csv(INPUT_FILE, encoding='unicode_escape')
    except Exception as e:
        print(f"Failed to read CSV: {e}")
        return

    print("Cleaning data...")
    # Basic cleaning
    # 1. Clean column names
    df.columns = df.columns.str.strip()
    
    # 2. Drop rows without CustomerID
    df = df.dropna(subset=['CustomerID'])
    
    # 3. Handle data types
    df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])
    df['CustomerID'] = df['CustomerID'].astype(int).astype(str)
    
    # 4. Calculate TotalAmount
    df['TotalAmount'] = df['Quantity'] * df['UnitPrice']
    
    # 5. Extract Date features
    df['YearMonth'] = df['InvoiceDate'].dt.to_period('M').astype(str)
    df['Date'] = df['InvoiceDate'].dt.date
    
    # Separate valid orders and cancellations
    cancellations = df[df['InvoiceNo'].str.startswith('C', na=False)]
    sales = df[~df['InvoiceNo'].str.startswith('C', na=False)]
    # Also ignore rows where quantity <= 0 (e.g. adjustments)
    sales = sales[sales['Quantity'] > 0]
    
    # We will export JSON data for the React dashboard immediately!
    print("Generating dashboard aggregate datasets...")
    
    # 0. Core KPIs
    total_revenue = sales['TotalAmount'].sum()
    total_orders = sales['InvoiceNo'].nunique()
    customer_count = sales['CustomerID'].nunique()
    aov = total_revenue / total_orders if total_orders > 0 else 0
    kpis = {
        "TotalRevenue": float(total_revenue),
        "TotalOrders": int(total_orders),
        "CustomerCount": int(customer_count),
        "AverageOrderValue": float(aov)
    }
    with open(os.path.join(JSON_OUTPUT_DIR, 'kpi.json'), 'w') as f:
        json.dump(kpis, f)

    # 1. Monthly Revenue
    monthly_revenue = sales.groupby('YearMonth')['TotalAmount'].sum().reset_index()
    monthly_revenue.to_json(os.path.join(JSON_OUTPUT_DIR, 'monthly_revenue.json'), orient='records')

    # 2. Top 10 Products by Revenue
    top_products = sales.groupby(['StockCode', 'Description'])['TotalAmount'].sum().reset_index()
    top_products = top_products.sort_values(by='TotalAmount', ascending=False).head(10)
    top_products.to_json(os.path.join(JSON_OUTPUT_DIR, 'top_products.json'), orient='records')

    # 3. Revenue by Country (Top 10)
    country_revenue = sales.groupby('Country')['TotalAmount'].sum().reset_index()
    country_revenue = country_revenue.sort_values(by='TotalAmount', ascending=False).head(10)
    country_revenue.to_json(os.path.join(JSON_OUTPUT_DIR, 'country_revenue.json'), orient='records')
    
    # 4. Customer Lifetime Value (CLV - top 20 customers)
    customer_revenue = sales.groupby('CustomerID')['TotalAmount'].sum().reset_index()
    customer_revenue = customer_revenue.sort_values(by='TotalAmount', ascending=False).head(20)
    customer_revenue.columns = ['CustomerID', 'CLV']
    customer_revenue.to_json(os.path.join(JSON_OUTPUT_DIR, 'top_customers.json'), orient='records')
    
    print("Saving to SQLite DB for SQL Analysis...")
    conn = sqlite3.connect(DB_PATH)
    
    sales.to_sql('sales', conn, if_exists='replace', index=False)
    cancellations.to_sql('cancellations', conn, if_exists='replace', index=False)
    
    conn.close()
    
    # Export cleaned sales for Power BI
    cleaned_csv_path = os.path.join(OUTPUT_DIR, "cleaned_online_retail.csv")
    sales.to_csv(cleaned_csv_path, index=False)
    print(f"Pipeline complete! Cleaned data saved for Power BI at {cleaned_csv_path}")

if __name__ == "__main__":
    process_data()
