const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

console.log('Running schema creation...');

db.serialize(() => {
    // 1. Run all schema statements
    const statements = schema.split(';');
    for (let statement of statements) {
        if (statement.trim()) {
            db.run(statement + ';', (err) => {
                if (err) console.error('Error executing statement:', err.message);
            });
        }
    }

    // 2. Check if admin user exists, if not create one
    db.get("SELECT id FROM users WHERE email = ?", ['admin@example.com'], (err, row) => {
        if (err) {
            console.error('Error checking admin user:', err.message);
            return;
        }

        if (!row) {
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync('admin123', salt);
            db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", 
                ['Admin User', 'admin@example.com', hashedPassword, 'admin'], 
                function(err) {
                    if (err) {
                        console.error('Error creating admin user:', err.message);
                    } else {
                        console.log('Admin user created successfully.');
                        console.log('Email: admin@example.com');
                        console.log('Password: admin123');
                    }
                }
            );
        } else {
            console.log('Admin user already exists.');
        }
    });

    // 3. Optional: Insert initial categories / locations / warehouses
    db.get("SELECT count(*) as count FROM warehouses", (err, row) => {
        if (row && row.count === 0) {
            db.run("INSERT INTO warehouses (name, code, address) VALUES ('Main Warehouse', 'WH-MAIN', '123 Main St')", function(err) {
                if(!err) {
                    db.run("INSERT INTO locations (warehouse_id, code, description) VALUES (1, 'RACK-A', 'Main Rack A')");
                    db.run("INSERT INTO locations (warehouse_id, code, description) VALUES (1, 'RACK-B', 'Main Rack B')");
                }
            });
        }
    });
    
    db.get("SELECT count(*) as count FROM suppliers", (err, row) => {
        if (row && row.count === 0) {
            db.run("INSERT INTO suppliers (name, contact_info, address) VALUES ('Global Tech Supplies', 'info@globaltech.com', 'Silicon Valley')");
        }
    });
    
    db.get("SELECT count(*) as count FROM customers", (err, row) => {
        if (row && row.count === 0) {
            db.run("INSERT INTO customers (name, contact_info, address) VALUES ('Acme Corp', 'contact@acme.com', 'New York')");
        }
    });

    db.get("SELECT count(*) as count FROM categories", (err, row) => {
        if (row && row.count === 0) {
            db.run("INSERT INTO categories (name, description) VALUES ('Electronics', 'Electronic Devices and Accessories')");
            db.run("INSERT INTO categories (name, description) VALUES ('Furniture', 'Office and Home Furniture')");
        }
    });

    db.get("SELECT count(*) as count FROM products", (err, row) => {
        if (row && row.count === 0) {
            db.run("INSERT INTO products (sku, name, unit, category_id, reorder_point) VALUES ('ELEC-001', 'Laptop Pro 15', 'pcs', 1, 5)");
            db.run("INSERT INTO products (sku, name, unit, category_id, reorder_point) VALUES ('ELEC-002', 'Wireless Mouse', 'pcs', 1, 10)");
            db.run("INSERT INTO products (sku, name, unit, category_id, reorder_point) VALUES ('ELEC-003', 'Mechanical Keyboard', 'pcs', 1, 8)");
            db.run("INSERT INTO products (sku, name, unit, category_id, reorder_point) VALUES ('FURN-001', 'Office Chair Deluxe', 'pcs', 2, 3)");
            db.run("INSERT INTO products (sku, name, unit, category_id, reorder_point) VALUES ('FURN-002', 'Standing Desk', 'pcs', 2, 2)");
        }
    });

    // Wait and close
    setTimeout(() => {
        console.log('Seeding complete.');
        db.close();
    }, 2000);
});
