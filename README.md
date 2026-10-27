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
