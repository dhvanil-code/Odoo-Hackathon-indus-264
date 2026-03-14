const db = require('../database/db');

// Helper to execute SQL with promises for easier transaction management
const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

// --- RECEIPTS ---
exports.createReceipt = async (req, res) => {
    const { reference, supplier_id, items } = req.body;
    if (!reference || !items || items.length === 0) return res.status(400).json({ success: false, message: 'Invalid data' });

    try {
        await run('BEGIN TRANSACTION');
        const rRes = await run('INSERT INTO receipts (reference, supplier_id, created_by) VALUES (?, ?, ?)', [reference, supplier_id || null, req.user.id]);
        const receiptId = rRes.lastID;

        for (let item of items) {
            await run('INSERT INTO receipt_items (receipt_id, product_id, location_id, quantity) VALUES (?, ?, ?, ?)', 
                      [receiptId, item.product_id, item.location_id, item.quantity]);
        }
        await run('COMMIT');
        res.status(201).json({ success: true, message: 'Receipt created', data: { id: receiptId } });
    } catch (err) {
        await run('ROLLBACK');
        res.status(500).json({ success: false, message: 'Transaction failed', error: err.message });
    }
};

exports.validateReceipt = async (req, res) => {
    const receiptId = req.params.id;
    try {
        const receipt = await get('SELECT * FROM receipts WHERE id = ?', [receiptId]);
        if (!receipt || receipt.status !== 'draft') return res.status(400).json({ success: false, message: 'Invalid receipt' });

        await run('BEGIN TRANSACTION');
        await run("UPDATE receipts SET status = 'done' WHERE id = ?", [receiptId]);
        
        await new Promise((resolve, reject) => {
            db.all('SELECT * FROM receipt_items WHERE receipt_id = ?', [receiptId], async (err, items) => {
                if (err) return reject(err);
                try {
                    for (let item of items) {
                        await run('INSERT INTO stock_movements (product_id, dest_location_id, quantity, movement_type, document_reference, user_id) VALUES (?, ?, ?, ?, ?, ?)',
                            [item.product_id, item.location_id, item.quantity, 'receipt', receipt.reference, req.user.id]);
                    }
                    resolve();
                } catch(e) { reject(e); }
            });
        });
        
        await run('COMMIT');
        res.status(200).json({ success: true, message: 'Receipt validated and stock updated' });
    } catch (err) {
        await run('ROLLBACK');
        res.status(500).json({ success: false, message: 'Validation failed', error: err.message });
    }
};

// --- DELIVERIES ---
exports.createDelivery = async (req, res) => {
    const { reference, customer_id, items } = req.body;
    if (!reference || !items || items.length === 0) return res.status(400).json({ success: false, message: 'Invalid data' });

    try {
        await run('BEGIN TRANSACTION');
        const dRes = await run('INSERT INTO deliveries (reference, customer_id, created_by) VALUES (?, ?, ?)', [reference, customer_id || null, req.user.id]);
        const deliveryId = dRes.lastID;

        for (let item of items) {
            await run('INSERT INTO delivery_items (delivery_id, product_id, location_id, quantity) VALUES (?, ?, ?, ?)', 
                      [deliveryId, item.product_id, item.location_id, item.quantity]);
        }
        await run('COMMIT');
        res.status(201).json({ success: true, message: 'Delivery created', data: { id: deliveryId } });
    } catch (err) {
        await run('ROLLBACK');
        res.status(500).json({ success: false, message: 'Transaction failed', error: err.message });
    }
};

exports.validateDelivery = async (req, res) => {
    const deliveryId = req.params.id;
    try {
        const delivery = await get('SELECT * FROM deliveries WHERE id = ?', [deliveryId]);
        if (!delivery || delivery.status !== 'draft') return res.status(400).json({ success: false, message: 'Invalid delivery' });

        await run('BEGIN TRANSACTION');
        await run("UPDATE deliveries SET status = 'done' WHERE id = ?", [deliveryId]);
        
        await new Promise((resolve, reject) => {
            db.all('SELECT * FROM delivery_items WHERE delivery_id = ?', [deliveryId], async (err, items) => {
                if (err) return reject(err);
                try {
                    for (let item of items) {
                        // For delivery, stock leaves a location
                        await run('INSERT INTO stock_movements (product_id, source_location_id, quantity, movement_type, document_reference, user_id) VALUES (?, ?, ?, ?, ?, ?)',
                            [item.product_id, item.location_id, item.quantity, 'delivery', delivery.reference, req.user.id]);
                    }
                    resolve();
                } catch(e) { reject(e); }
            });
        });
        
        await run('COMMIT');
        res.status(200).json({ success: true, message: 'Delivery validated and stock updated' });
    } catch (err) {
        await run('ROLLBACK');
        res.status(500).json({ success: false, message: 'Validation failed', error: err.message });
    }
};

// --- TRANSFERS ---
exports.createTransfer = async (req, res) => {
    const { reference, items } = req.body;
    if (!reference || !items || items.length === 0) return res.status(400).json({ success: false, message: 'Invalid data' });

    try {
        await run('BEGIN TRANSACTION');
        const tRes = await run('INSERT INTO transfers (reference, created_by) VALUES (?, ?)', [reference, req.user.id]);
        const transferId = tRes.lastID;

        for (let item of items) {
            await run('INSERT INTO transfer_items (transfer_id, product_id, source_location_id, dest_location_id, quantity) VALUES (?, ?, ?, ?, ?)', 
                      [transferId, item.product_id, item.source_location_id, item.dest_location_id, item.quantity]);
        }
        await run('COMMIT');
        res.status(201).json({ success: true, message: 'Transfer created', data: { id: transferId } });
    } catch (err) {
        await run('ROLLBACK');
        res.status(500).json({ success: false, message: 'Transaction failed', error: err.message });
    }
};

exports.validateTransfer = async (req, res) => {
    const transferId = req.params.id;
    try {
        const transfer = await get('SELECT * FROM transfers WHERE id = ?', [transferId]);
        if (!transfer || transfer.status !== 'draft') return res.status(400).json({ success: false, message: 'Invalid transfer' });

        await run('BEGIN TRANSACTION');
        await run("UPDATE transfers SET status = 'done' WHERE id = ?", [transferId]);
        
        await new Promise((resolve, reject) => {
            db.all('SELECT * FROM transfer_items WHERE transfer_id = ?', [transferId], async (err, items) => {
                if (err) return reject(err);
                try {
                    for (let item of items) {
                        await run('INSERT INTO stock_movements (product_id, source_location_id, dest_location_id, quantity, movement_type, document_reference, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [item.product_id, item.source_location_id, item.dest_location_id, item.quantity, 'transfer', transfer.reference, req.user.id]);
                    }
                    resolve();
                } catch(e) { reject(e); }
            });
        });
        
        await run('COMMIT');
        res.status(200).json({ success: true, message: 'Transfer validated and stock updated' });
    } catch (err) {
        await run('ROLLBACK');
        res.status(500).json({ success: false, message: 'Validation failed', error: err.message });
    }
};

// --- ADJUSTMENTS ---
exports.createAdjustment = async (req, res) => {
    const { reference, reason, items } = req.body;
    if (!reference || !items || items.length === 0) return res.status(400).json({ success: false, message: 'Invalid data' });

    try {
        await run('BEGIN TRANSACTION');
        const aRes = await run('INSERT INTO adjustments (reference, reason, created_by) VALUES (?, ?, ?)', [reference, reason, req.user.id]);
        const adjId = aRes.lastID;

        for (let item of items) {
            await run('INSERT INTO adjustment_items (adjustment_id, product_id, location_id, counted_quantity, system_quantity, difference) VALUES (?, ?, ?, ?, ?, ?)', 
                      [adjId, item.product_id, item.location_id, item.counted_quantity, item.system_quantity, item.difference]);
        }
        await run('COMMIT');
        res.status(201).json({ success: true, message: 'Adjustment created', data: { id: adjId } });
    } catch (err) {
        await run('ROLLBACK');
        res.status(500).json({ success: false, message: 'Transaction failed', error: err.message });
    }
};

exports.validateAdjustment = async (req, res) => {
    const adjId = req.params.id;
    try {
        const adj = await get('SELECT * FROM adjustments WHERE id = ?', [adjId]);
        if (!adj || adj.status !== 'draft') return res.status(400).json({ success: false, message: 'Invalid adjustment' });

        await run('BEGIN TRANSACTION');
        await run("UPDATE adjustments SET status = 'done' WHERE id = ?", [adjId]);
        
        await new Promise((resolve, reject) => {
            db.all('SELECT * FROM adjustment_items WHERE adjustment_id = ?', [adjId], async (err, items) => {
                if (err) return reject(err);
                try {
                    for (let item of items) {
                        if (item.difference > 0) {
                            // Positive diff -> increasing stock like receipt
                            await run('INSERT INTO stock_movements (product_id, dest_location_id, quantity, movement_type, document_reference, user_id) VALUES (?, ?, ?, ?, ?, ?)',
                                [item.product_id, item.location_id, item.difference, 'adjustment', adj.reference, req.user.id]);
                        } else if (item.difference < 0) {
                            // Negative diff -> decreasing stock like delivery
                            await run('INSERT INTO stock_movements (product_id, source_location_id, quantity, movement_type, document_reference, user_id) VALUES (?, ?, ?, ?, ?, ?)',
                                [item.product_id, item.location_id, Math.abs(item.difference), 'adjustment', adj.reference, req.user.id]);
                        }
                    }
                    resolve();
                } catch(e) { reject(e); }
            });
        });
        
        await run('COMMIT');
        res.status(200).json({ success: true, message: 'Adjustment validated and stock updated' });
    } catch (err) {
        await run('ROLLBACK');
        res.status(500).json({ success: false, message: 'Validation failed', error: err.message });
    }
};

// Generic list functions
exports.getReceipts = (req, res) => {
    db.all('SELECT * FROM receipts ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, data: rows });
    });
};

exports.getDeliveries = (req, res) => {
    db.all('SELECT * FROM deliveries ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, data: rows });
    });
};

exports.getTransfers = (req, res) => {
    db.all('SELECT * FROM transfers ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, data: rows });
    });
};

exports.getAdjustments = (req, res) => {
    db.all('SELECT * FROM adjustments ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, data: rows });
    });
};

exports.getMovements = (req, res) => {
    const query = `
        SELECT m.*, p.name as product_name, p.sku,
               ls.code as source_code, ld.code as dest_code,
               u.name as user_name
        FROM stock_movements m
        JOIN products p ON m.product_id = p.id
        LEFT JOIN locations ls ON m.source_location_id = ls.id
        LEFT JOIN locations ld ON m.dest_location_id = ld.id
        LEFT JOIN users u ON m.user_id = u.id
        ORDER BY m.id DESC
        LIMIT 100
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, data: rows });
    });
};
