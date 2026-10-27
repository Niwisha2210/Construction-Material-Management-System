# Construction-Material-Management-System
BuildStock: Construction Material Management System

A web-based system for managing construction materials, suppliers, purchases, stock levels and material allocation across construction sites. Built as a DBMS course project with a **MySQL** database, a **Node.js + Express** backend and an **HTML/CSS/JavaScript** frontend.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Database Design](#database-design)
5. [DBMS Concepts Demonstrated](#dbms-concepts-demonstrated)
6. [Project Structure](#project-structure)
7. [Getting Started](#getting-started)
8. [Using the Application](#using-the-application)
9. [API Reference](#api-reference)
10. [Validation and Error Handling](#validation-and-error-handling)
11. [Sample SQL Queries](#sample-sql-queries)
12. [Troubleshooting](#troubleshooting)
13. [Limitations and Future Work](#limitations-and-future-work)
14. [Author](#author)

---

## Problem Statement

Construction companies handle large quantities of materials such as cement, steel, bricks, sand and paint across several sites at once. When these records are kept in paper registers or scattered spreadsheets:

- stock levels are not known in real time, so materials run out and work stops;
- purchases are not linked to the stock that actually arrives;
- it is hard to see how much each site has consumed, or who issued it;
- purchase totals and stock values are calculated by hand and are error-prone;
- nobody gets an early warning when a material runs low.

BuildStock solves this with a central database that updates stock automatically, blocks invalid transactions and reports on purchases and usage.

---

## Features

| Area | What it does |
|---|---|
| **Dashboard** | Counts of materials, suppliers, active sites and low-stock items, with a low-stock warning banner |
| **Materials** | Add, edit, delete and search materials, and set a **minimum stock level** for each one |
| **Suppliers** | Add, edit, delete and search supplier contact details |
| **Employees** | Maintain staff such as store managers, purchase officers and site engineers |
| **Sites** | Maintain construction sites with location, status (Active, On Hold, Completed) and manager |
| **Purchase entry** | Record a purchase with several material items; stock and the purchase total update automatically |
| **Inventory** | Current stock of every material with an In stock, Low stock or Out of stock status and total stock value |
| **Low stock** | Materials at or below their minimum level, with a shortfall column |
| **Allocate to site** | Issue material to a site, with available stock shown and over-issuing blocked |
| **Usage by site** | Pick a site to see every material used there, with cost and total |
| **Reports** | Purchase cost by supplier and material cost by site |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Database | MySQL 8.0 |
| Backend | Node.js, Express, mysql2 |
| Frontend | HTML, CSS, JavaScript (no framework) |
| Tools | MySQL Workbench, Visual Studio Code, Git and GitHub |

---

## Database Design

The database `buildstock` has **8 tables**.

| Table | Purpose | Key columns |
|---|---|---|
| `Employees` | Staff who purchase, issue and manage sites | `emp_id` (PK) |
| `Suppliers` | Supplier contact details | `supplier_id` (PK) |
| `Materials` | Catalogue with price and minimum stock level (`reorder_level`) | `material_id` (PK) |
| `Sites` | Construction sites and their managers | `site_id` (PK), `manager_id` (FK to Employees) |
| `Purchases` | One row per purchase from a supplier | `purchase_id` (PK), `supplier_id` (FK), `emp_id` (FK) |
| `Purchase_Items` | Materials and quantities in each purchase | `item_id` (PK), `purchase_id` (FK), `material_id` (FK) |
| `Inventory` | Current stock of each material | `material_id` (PK and FK) |
| `Material_Usage` | Material issued to each site | `usage_id` (PK), `site_id`, `material_id`, `emp_id` (FKs) |

### Relationships

```
Employees 1 --- N Sites              (site manager)
Employees 1 --- N Purchases          (purchased by)
Employees 1 --- N Material_Usage     (issued by)
Suppliers 1 --- N Purchases
Purchases 1 --- N Purchase_Items
Materials 1 --- N Purchase_Items
Materials 1 --- 1 Inventory
Sites     1 --- N Material_Usage
Materials 1 --- N Material_Usage
```

### Normalization

All tables are in **3NF** (and BCNF). Supplier and employee details are stored once and referenced by key. The only deliberate redundancy is `Purchases.total_amount`, which a trigger keeps correct automatically.

---

## DBMS Concepts Demonstrated

| Concept | Where |
|---|---|
| Primary and foreign keys | All 8 tables |
| Constraints (`NOT NULL`, `UNIQUE`, `CHECK`, `ENUM`, `DEFAULT`) | Table definitions in `schema.sql` |
| DDL, DML | `CREATE`, `ALTER`, `INSERT`, `UPDATE`, `DELETE` |
| Joins (inner, left) | Reports, views and API queries |
| Aggregate functions and `GROUP BY` / `HAVING` | Supplier totals, usage by site, stock value |
| Subqueries (including correlated) | Dashboard counts and sample queries |
| **Views** | `v_inventory`, `v_purchase_summary`, `v_site_usage` |
| **Function** | `fn_stock_status(qty, reorder)` returns In stock, Low stock or Out of stock |
| **Stored procedure** | `sp_record_usage(site, material, employee, qty)` with transaction and rollback |
| **Triggers** | See below |
| **Transactions** | Purchase header and items are saved together in `server.js`, and the stored procedure commits or rolls back |

### Triggers

| Trigger | Fires | Action |
|---|---|---|
| `trg_material_inventory` | After a material is added | Creates its inventory row with stock 0 |
| `trg_purchase_stock` | After a purchase item is added | Adds the quantity to stock and updates the purchase total |
| `trg_usage_check` | Before material is issued | Rejects the issue if stock is insufficient |
| `trg_usage_stock` | After material is issued | Reduces the stock |

---

## Project Structure

```
construction management sysytem/
├── README.md
└── buildstock/
    ├── server.js            Express server and all SQL queries
    ├── package.json
    ├── .env                 your MySQL settings (not uploaded to GitHub)
    ├── .env.example         template for .env
    ├── .gitignore
    ├── database/
    │   └── schema.sql       tables, view, function, procedure, triggers, sample data
    └── public/
        ├── index.html
        ├── style.css
        └── app.js
```

---
