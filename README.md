# Inventory Management System (IMS)

A complete, production-ready web application for managing inventory, warehouses, and stock movements. Built with Node.js, Express, SQLite, and Bootstrap 5.

## Features

- **Authentication & Authorization**: Secure JWT-based login, signup, and password reset (OTP).
- **Dashboard**: Real-time KPIs for total products, low stock alerts, and pending operations tracking.
- **Product Management**: Track SKUs, categories, and reorder points.
- **Warehouse Management**: Support for multiple warehouses and hierarchical internal locations (racks, bins).
- **Operations Tracking**:
  - **Receipts**: Inbound deliveries to increase stock.
  - **Delivery Orders**: Outbound shipments to decrease stock.
  - **Internal Transfers**: Move stock between locations accurately.
  - **Stock Adjustments**: Correct physical counts against system recorded quantities.
- **Stock Ledger (History)**: Complete, immutable audit log of all stock movements.

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: SQLite (via `sqlite3` driver)
- **Security**: `bcryptjs` (password hashing), `jsonwebtoken` (auth tokens)
- **Frontend**: HTML5, Vanilla JavaScript, CSS3
- **UI Framework**: Bootstrap 5
- **Icons**: Bootstrap Icons

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Setup & Installation

1. **Clone or Extract the Repository**

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Check the `.env` file in the root directory. Ensure the `PORT`, `JWT_SECRET`, and `DB_FILE` are set.
   ```env
   PORT=3000
   JWT_SECRET=super-secret-ims-key-change-in-production
   DB_FILE=./database/ims.db
   ```

4. **Initialize the Database**
   Run the seed script to create the database tables and insert default demo data (including an admin user).
   ```bash
   npm run seed
   ```

5. **Start the Server**
   ```bash
   npm start
   # Or for development with nodemon:
   npm run dev
   ```

6. **Access the Application**
   Open your browser and navigate to: `http://localhost:3000`

## Demo Credentials

A default admin user is created when you run the seed script:
- **Email**: `admin@example.com`
- **Password**: `admin123`

*(Note: In a production environment, ensure to change this password immediately and use a stronger `JWT_SECRET`.)*

## Architecture

- `server.js`: Standard Express API setup, mounting modules.
- `database/`: Contains the SQLite connection logic, schema definition, and seed data.
- `controllers/` & `routes/`: Modularized by feature (Auth, Products, Warehouses, Locations, Operations, Dashboard).
- `views/`: Standard HTML templates for the frontend UI.
- `public/`: Static assets (CSS, JS, Images).

## License
MIT License
