const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/ims.db', (err) => {
    if (err) { console.error(err.message); process.exit(1); }
    console.log('Connected to DB.');
});

db.serialize(() => {
    // Remove any test products
    db.run("DELETE FROM products WHERE sku = 'abc' OR name = 'abccc'");
    
    // Insert sample products (ignore if already exists by sku)
    const products = [
        ['ELEC-001', 'Laptop Pro 15', 'pcs', 1, 5],
        ['ELEC-002', 'Wireless Mouse', 'pcs', 1, 10],
        ['ELEC-003', 'Mechanical Keyboard', 'pcs', 1, 8],
        ['FURN-001', 'Office Chair Deluxe', 'pcs', 2, 3],
        ['FURN-002', 'Standing Desk', 'pcs', 2, 2],
    ];
    const stmt = db.prepare("INSERT OR IGNORE INTO products (sku, name, unit, category_id, reorder_point) VALUES (?, ?, ?, ?, ?)");
    for (const p of products) stmt.run(p);
    stmt.finalize((err) => {
        if (err) console.error(err.message);
        else console.log('Sample products inserted successfully.');
    });
    
    db.all("SELECT sku, name FROM products", [], (err, rows) => {
        console.log('All products:', rows);
        db.close();
    });
});
