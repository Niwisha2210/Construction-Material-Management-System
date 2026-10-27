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
## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18 or later
- [MySQL](https://dev.mysql.com/downloads/) 8.0 or later (MySQL Workbench is helpful)
- [Git](https://git-scm.com)

### 1. Clone the repository

bash
git clone https://github.com/Niwisha2210/Construction-Material-Management-System.git
cd Construction-Material-Management-System/buildstock


### 2. Create the database

Either run this in a terminal:

bash
mysql -u root -p < database/schema.sql


or open database/schema.sql in MySQL Workbench and run the whole script (lightning bolt button).

This drops and recreates the buildstock database, so running it again resets everything to the sample data.

Check it worked:

sql
USE buildstock;
SHOW TABLES;
SELECT * FROM v_inventory;


You should see 8 tables and 7 materials.

### 3. Configure the connection

Copy .env.example to .env and set your MySQL password:


DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=buildstock
PORT=3000


### 4. Install and run

bash
npm install
npm start


You should see BuildStock running at http://localhost:3000.

### 5. Open the app

Go to *http://localhost:3000* in your browser.

---

## Using the Application

A quick walk through the main features with the sample data:

1. *Dashboard* shows 7 materials, 4 suppliers, 2 active sites and 3 low-stock items, plus a warning banner.
2. *Low stock* lists Steel Rods, River Sand and Wall Paint with their shortfall.
3. *Materials*: add a material, edit its minimum stock level, search and delete.
4. *Purchase entry: pick a supplier, add one or more items and save. Open **Inventory* to see stock increase.
5. *Allocate to site*: choose a site, material and quantity. The available stock is shown, and you get a warning if the material falls below its minimum.
6. *Usage by site*: choose a site to see the materials it used, their cost and the total.
7. *Reports*: purchase cost per supplier and material cost per site.

---

## API Reference

All endpoints return JSON. Errors return { "error": "message" } with status 400.

| Method | Endpoint | Description |
|---|---|---|
| GET, POST | /api/materials | List or add materials |
| PUT, DELETE | /api/materials/:id | Edit or delete a material |
| GET, POST | /api/suppliers | List or add suppliers |
| PUT, DELETE | /api/suppliers/:id | Edit or delete a supplier |
| GET, POST | /api/employees | List or add employees |
| PUT, DELETE | /api/employees/:id | Edit or delete an employee |
| GET, POST | /api/sites | List or add sites |
| PUT, DELETE | /api/sites/:id | Edit or delete a site |
| GET | /api/dashboard | Dashboard counts |
| GET | /api/inventory | Stock with status and value |
| GET | /api/low-stock | Materials at or below minimum, with shortfall |
| GET, POST | /api/purchases | List purchases or save one (transaction) |
| GET, POST | /api/usage | List material allocations or allocate material (stored procedure) |
| GET | /api/site-usage/:id | Materials used at one site, with cost |
| GET | /api/reports | Purchase cost by supplier and material cost by site |

---

## Validation and Error Handling

| Scenario | Result |
|---|---|
| Allocate more material than is in stock | Blocked in the page, and rejected by the trg_usage_check trigger with "Insufficient stock for this material" |
| Negative or zero price or quantity | Rejected by CHECK constraints |
| Duplicate material name | Rejected by the UNIQUE constraint |
| Delete a supplier or material that has purchases | Blocked by foreign keys |
| Site manager that does not exist | Rejected by a foreign key |
| Invalid site status | Rejected by the ENUM type |
| Purchase fails part-way | The whole purchase is rolled back |

Database errors are shown to the user as a message at the bottom right of the page.

---

## Sample SQL Queries

sql
-- Low stock materials
SELECT name, quantity, reorder_level FROM v_inventory WHERE status <> 'In stock';

-- Total purchase amount per supplier
SELECT s.name, COUNT(p.purchase_id) AS orders, COALESCE(SUM(p.total_amount), 0) AS total
FROM Suppliers s LEFT JOIN Purchases p ON p.supplier_id = s.supplier_id
GROUP BY s.supplier_id, s.name
ORDER BY total DESC;

-- Materials priced above the average
SELECT name, unit_price FROM Materials
WHERE unit_price > (SELECT AVG(unit_price) FROM Materials);

-- Materials never used at any site
SELECT name FROM Materials m
WHERE NOT EXISTS (SELECT 1 FROM Material_Usage u WHERE u.material_id = m.material_id);

-- Cost of material used per site
SELECT * FROM v_site_usage ORDER BY site_name;

-- Trigger test: this fails with "Insufficient stock for this material"
CALL sp_record_usage(1, 7, 2, 9999);


---

## Troubleshooting

| Problem | Fix |
|---|---|
| ER_ACCESS_DENIED_ERROR | Wrong MySQL password in .env |
| ER_BAD_DB_ERROR | schema.sql has not been run |
| ECONNREFUSED | MySQL is not running |
| Cannot find module | Run npm install inside the buildstock folder |
| Page loads but has no styling | style.css and app.js must be directly inside public/ |
| Old page still showing after a code change | Restart the server and hard refresh with Ctrl+F5 |
| Error 1175 when running UPDATE or DELETE in Workbench | Safe update mode is on, so use the primary key column in the WHERE clause |
| .env is not read | The file must be named exactly .env, not .env.txt |

---

## Limitations and Future Work

- No login or role-based access
- Purchases can be added but not edited or deleted from the interface
- Material allocation is recorded as usage, with no separate reservation step
- Possible additions: purchase orders, supplier ratings, charts, CSV or PDF export and email alerts for low stock

---

## Author

*Niwisha,Christa,Dalina,Nivila,Kanmani*: DBMS course project

Repository: https://github.com/Niwisha2210/Construction-Material-Management-System
