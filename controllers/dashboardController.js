const db = require('../database/db');

// Helper to execute SQL with promises
const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

exports.getDashboardData = async (req, res) => {
    try {
        const kpis = {
            totalProducts: 0,
            lowStock: 0,
            pendingReceipts: 0,
            pendingDeliveries: 0,
            pendingTransfers: 0
        };

        const totalProductRes = await get('SELECT COUNT(*) as count FROM products');
        kpis.totalProducts = totalProductRes.count;

        // Pending operations
        const pReceipts = await get("SELECT COUNT(*) as count FROM receipts WHERE status = 'draft'");
        kpis.pendingReceipts = pReceipts.count;

        const pDeliveries = await get("SELECT COUNT(*) as count FROM deliveries WHERE status = 'draft'");
        kpis.pendingDeliveries = pDeliveries.count;

        const pTransfers = await get("SELECT COUNT(*) as count FROM transfers WHERE status = 'draft'");
        kpis.pendingTransfers = pTransfers.count;

        // Low stock logic requires calculating current stock for all products.
        // We calculate stock per product.
        const stockQuery = `
            SELECT p.id, p.reorder_point,
            COALESCE((SELECT SUM(quantity) FROM stock_movements sm WHERE sm.product_id = p.id AND sm.dest_location_id IS NOT NULL), 0) -
            COALESCE((SELECT SUM(quantity) FROM stock_movements sm WHERE sm.product_id = p.id AND sm.source_location_id IS NOT NULL), 0) as current_stock
            FROM products p
        `;
        const productsStock = await all(stockQuery);
        let lowStockCount = 0;
        for (let p of productsStock) {
            if (p.current_stock <= p.reorder_point) {
                lowStockCount++;
            }
        }
        kpis.lowStock = lowStockCount;

        // Recent Movements for mini-ledger on dashboard
        const recentMovementsQuery = `
            SELECT m.*, p.name as product_name, p.sku
            FROM stock_movements m
            JOIN products p ON m.product_id = p.id
            ORDER BY m.id DESC
            LIMIT 5
        `;
        const recentMovements = await all(recentMovementsQuery);

        res.status(200).json({ success: true, kpis, recentMovements });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};
