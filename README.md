# SAND Inventory Management & POS System

A multi-part inventory management and point-of-sale (POS) system. It has a PHP REST API, a React admin dashboard, a React POS interface, a Node.js real-time server, and a local receipt-printing agent.

> Built by **Gerald Fajardo Peralta** as a hands-on project to practice the full software development life cycle (SDLC).

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Repositories / Modules](#repositories--modules)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Architecture Decisions](#architecture-decisions)
- [Roadmap](#roadmap)
- [Author](#author)

---

## Overview

The system lets a business manage products, stock and sales across branches:

- **Admin dashboard** for items, variants, categories, brands, branches, customers, employees, roles, stock adjustments, reports and audit logs.
- **POS interface** for cashiers to look up items (by serial/QR/barcode), ring up sales and print receipts.
- **Real-time updates** between clients and the back-end through Socket.IO.
- **Local print agent** that sends formatted receipts to a dot-matrix printer.

## System Architecture

```
┌──────────────┐        ┌──────────────┐
│  Admin (front)│        │     POS      │
│ React + TS    │        │ React + TS   │
└──────┬───────┘        └──────┬───────┘
       │ REST                   │ REST + Socket.IO
       ▼                        ▼
┌─────────────────┐   ┌──────────────────┐
│  PHP REST API    │◄──│ Socket server     │
│  (Doctrine ORM)  │   │ Node.js + Express │
└────────┬────────┘   └──────────────────┘
         │
         ▼
      MySQL                POS ──► Print Agent (PHP, cashier PC) ──► Dot-matrix printer
```

## Repositories / Modules

| Folder                         | Purpose                                                                 | Main tech                                               |
| ------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------- |
| `inventory_management_api`     | REST API: auth, inventory, sales, reports, audit logs, email            | PHP, Composer, Doctrine ORM, PHPMailer, MySQL           |
| `front`                        | Admin / back-office web app                                             | React, TypeScript, Vite, Tailwind CSS, shadcn/ui        |
| `POS`                          | Cashier-facing point-of-sale web app                                    | React, TypeScript, Vite, Tailwind CSS, Socket.IO client |
| `sAndJSocket`                  | Real-time server that relays events and submits transactions to the API | Node.js, Express, Socket.IO                             |
| `inventory_management_printer` | Local agent that prints receipts using ESC/P commands                   | PHP                                                     |

## Tech Stack

**Front-end:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix UI), TanStack Router, TanStack Query, TanStack Table, Zustand, Recharts

**Back-end:** PHP (PSR-4, Composer), Doctrine ORM, PHPMailer, Node.js, Express, Socket.IO

**Database:** MySQL

**Tooling:** ESLint, Git, qrcode and jsbarcode for QR / barcode generation

## Features

- Authentication, password reset and email notifications
- Role-based employee and account management
- Items, item variants, attribute catalog, categories, brands and branches
- Stock units, stock adjustments and stock checking
- Sales and sales invoices
- Customers and service reports
- Dashboard and reports with charts
- QR code and barcode generation
- Audit log with filters and a before/after diff view
- Real-time events (stock inserted, catalog updated, branch inventory updated, transaction submitted)
- Receipt printing through a local agent

## Getting Started

### Prerequisites

- PHP 8+ and Composer
- MySQL
- Node.js 18+ (the socket server uses Node's native `fetch`) and npm
- A web server for the API (e.g. Apache/XAMPP; the project includes an `.htaccess`)

### 1. API

```bash
cd inventory_management_api
composer install
cp .env.example .env     # then edit your database and mail settings
mysql -u root -p < database/schema.sql
```

If your database was created before a schema change, apply the migrations listed in the API's own `README.md`.

### 2. Socket server

```bash
cd sAndJSocket
npm install
API_BASE_URL=http://localhost/inventory_management_api node index.js
```

### 3. Admin dashboard

```bash
cd front
npm install
npm run dev
```

### 4. POS

```bash
cd POS
npm install
npm run dev
```

### 5. Print agent (on the cashier PC)

```bash
cd inventory_management_printer
php -S 127.0.0.1:8080 print_agent.php
```

The agent only accepts `POST` requests with a JSON payload.

## Environment Variables

**API (`.env`)**

| Variable                                                   | Description              |
| ---------------------------------------------------------- | ------------------------ |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`  | MySQL connection         |
| `API_URL`                                                  | Base URL of the API      |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` | SMTP settings for emails |
| `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`                      | Sender details           |

**Front-end apps (`.env.local`)**

| Variable          | Description                       |
| ----------------- | --------------------------------- |
| `VITE_API_URL`    | URL of the REST API               |
| `VITE_SOCKET_URL` | URL of the Socket.IO server (POS) |

**Socket server**

| Variable       | Description                                                                            |
| -------------- | -------------------------------------------------------------------------------------- |
| `API_BASE_URL` | URL of the REST API (defaults to a local network address in the code, so set your own) |

> Never commit real `.env` files, passwords or credentials. Keep them in `.gitignore` and share only `.env.example`.

## Architecture Decisions

Lessons from earlier projects shaped how this one is organized:

- **Layered back-end.** The API separates controllers, models/entities, services, routes and middleware, so each part has one job and is easier to change and test.
- **Doctrine ORM instead of hand-written SQL everywhere.** A proven library handles mapping, relations and migrations safely, which reduces repeated code and mistakes.
- **Structured REST API.** Resources are split into their own controllers and route files, with consistent JSON responses.
- **Feature-based React structure.** The front-ends group code by feature (`src/features/items`, `audit`, `reports`, `stock-adjustment`, and so on), each with its own api, components and logic, instead of one big shared folder.
- **Reusable UI components.** Shared building blocks (dialogs, data tables, pagination) live in `components/ui`.
