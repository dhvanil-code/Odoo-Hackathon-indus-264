-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'staff', -- admin, manager, staff
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OTP Resets
CREATE TABLE IF NOT EXISTS otp_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    otp TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Locations
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warehouse_id INTEGER NOT NULL,
    code TEXT UNIQUE NOT NULL, -- e.g. WH1-A1
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category_id INTEGER,
    unit TEXT DEFAULT 'pcs',
    reorder_point INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_info TEXT,
    address TEXT
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_info TEXT,
    address TEXT
);

-- Receipts (Incoming)
CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT UNIQUE NOT NULL,
    supplier_id INTEGER,
    status TEXT DEFAULT 'draft', -- draft, done, canceled
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY(receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(location_id) REFERENCES locations(id)
);

-- Deliveries (Outgoing)
CREATE TABLE IF NOT EXISTS deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT UNIQUE NOT NULL,
    customer_id INTEGER,
    status TEXT DEFAULT 'draft', -- draft, done, canceled
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS delivery_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY(delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(location_id) REFERENCES locations(id)
);

-- Internal Transfers
CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'draft', -- draft, done, canceled
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transfer_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    source_location_id INTEGER NOT NULL,
    dest_location_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY(transfer_id) REFERENCES transfers(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(source_location_id) REFERENCES locations(id),
    FOREIGN KEY(dest_location_id) REFERENCES locations(id)
);

-- Adjustments
CREATE TABLE IF NOT EXISTS adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT UNIQUE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'draft', -- draft, done
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS adjustment_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adjustment_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    counted_quantity INTEGER NOT NULL,
    system_quantity INTEGER NOT NULL,
    difference INTEGER NOT NULL, -- counted - system
    FOREIGN KEY(adjustment_id) REFERENCES adjustments(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(location_id) REFERENCES locations(id)
);

-- Stock Ledger / Movements
-- This is where we calculate total valid stock from.
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    source_location_id INTEGER, -- NULL if receipt
    dest_location_id INTEGER, -- NULL if delivery
    quantity INTEGER NOT NULL,
    movement_type TEXT NOT NULL, -- receipt, delivery, transfer, adjustment
    document_reference TEXT,
    status TEXT DEFAULT 'done',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(source_location_id) REFERENCES locations(id),
    FOREIGN KEY(dest_location_id) REFERENCES locations(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Product Stock View (Dynamic calculation based on done stock movements)
-- Actually, a view might be complex for sqlite to do source vs dest easily in one pass without grouping twice.
-- We will handle stock calculation in code: Sum of (dest_location_id = location) - Sum of (source_location_id = location)
-- However, we can create a view or a physical table 'product_stock' that is updated via code. 
-- For simplicity and performance, a material physical table updated on each movement validation might be better.
CREATE TABLE IF NOT EXISTS product_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 0,
    UNIQUE(product_id, location_id),
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id INTEGER,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);
