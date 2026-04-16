# 🚀 Nexus Analytics | E-Commerce Business Intelligence Platform

> **"A decision-making tool for e-commerce businesses powered by data."**

![Status](https://img.shields.io/badge/Status-Complete-success)
![Python](https://img.shields.io/badge/Python-Data_Engineering-blue)
![SQL](https://img.shields.io/badge/SQL-Analytics-orange)
![PowerBI](https://img.shields.io/badge/Power_BI-Visualization-yellow)
![React](https://img.shields.io/badge/React-Web_Dashboard-61DAFB)

## 💡 Overview

**Nexus Analytics** is an end-to-end business intelligence platform designed specifically for e-commerce companies. It transforms raw, chaotic transactional records into clear, actionable insights—allowing stakeholders to track sales, understand customer behavior, evaluate product performance, and ultimately make better, data-driven decisions.

This project was built not just as a dashboard, but as a **mini product** that solves real administrative challenges: *bridging the gap between having raw data and knowing what's actually performing well.*

---

## ⚙️ Core Features & Capabilities

Our platform acts as a real analyst for the business, answering critical questions and providing instant health metrics:

### 🔹 1. Business Health KPIs
Immediate tracking of Total Revenue, Total Orders, Customer Count, and Average Order Value (AOV). 

### 🔹 2. Sales Trend Tracking
Forecasting and tracking daily and monthly revenue trajectories alongside historical growth patterns.

### 🔹 3. Product Performance Analysis
Identifies top-selling product categories and highlights low-performing items, driving smarter inventory and promotional decisions.

### 🔹 4. Deep Customer Insights
Tracks Elite Patrons (Top LTV customers) and assesses buying behavior, geographic reach, and repeat customer rates.

---

## 🧱 Technical Architecture (Behind the Scenes)

This is a complete, full-stack data pipeline running locally:

1. **Raw Data Extraction**: Utilizes realistic, raw e-commerce transaction datasets (orders, customers, products).
2. **Data Cleansing (Python & Pandas)**: 
   - Standardizes columns and handles varying file encodings.
   - Cleans missing variables, dynamically computes `TotalAmount`, and extracts date architectures.
   - Automatically splits valid orders from returns/cancellations.
3. **Advanced Querying (SQL)**:
   - Uses optimized SQL window queries in SQLite to determine Customer Lifetime Values (CLV) and repeat customer stickiness.
4. **Interactive Dashboarding**:
   - **React/Vite Web App**: A beautiful, dark-mode, glassmorphic analytics dashboard built with Recharts & Framer Motion. 
   - **Power BI Engine**: Generates a completely sanitized flat file (`cleaned_online_retail.csv`) perfectly optimized for Power BI import and visualization.

---

## 🚀 Getting Started

### Prerequisites
* Python 3.8+
* Node.js & npm (For the Web Dashboard)

### 1. Run the Data Engineering Pipeline
This will clean the raw CSV and construct the `.db` alongside the analytical JSON files.
```bash
python3 data_pipeline.py
```

### 2. View the SQL Insights
Run the embedded queries against the local DB.
```bash
sqlite3 ecommerce.db < insights.sql
```

### 3. Launch the Web Dashboard
```bash
cd web_dashboard
npm install
npm run dev
```
Navigate to `http://localhost:3333` to view the live dashboard!

---

## 🎯 Why It Matters

> "This dashboard helps businesses increase revenue by identifying high-performing products and improving customer retention."

---

## 🧾 Resume Line

> Built an advanced E-Commerce Analytics Platform with forecasting, customer segmentation, and business insights, enabling data-driven decision-making using SQL, Python, and React.
