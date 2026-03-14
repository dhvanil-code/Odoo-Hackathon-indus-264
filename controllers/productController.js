const db = require('../database/db');

// Get all products with current valid stock and categories
exports.getProducts = (req, res) => {
    // Current stock requires summing up stock movements per product if we don't use product_stock table
    // For simplicity, let's join with product_stock or calculate on the fly.
    // Let's use product_stock table since we created it in schema, OR a subquery on stock_movements
    
    const query = `
        SELECT p.*, c.name as category_name,
        COALESCE((
            SELECT SUM(quantity) FROM stock_movements sm 
            WHERE sm.product_id = p.id AND sm.dest_location_id IS NOT NULL
        ), 0) - COALESCE((
            SELECT SUM(quantity) FROM stock_movements sm 
            WHERE sm.product_id = p.id AND sm.source_location_id IS NOT NULL
        ), 0) as current_stock
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.id DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        res.status(200).json({ success: true, count: rows.length, data: rows });
    });
};

exports.getProductById = (req, res) => {
    db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, product) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        res.status(200).json({ success: true, data: product });
    });
};

exports.createProduct = (req, res) => {
    const { name, sku, category_id, unit, reorder_point, initial_stock, initial_location_id } = req.body;

    if (!name || !sku) {
        return res.status(400).json({ success: false, message: 'Name and SKU are required' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run(
            'INSERT INTO products (name, sku, category_id, unit, reorder_point) VALUES (?, ?, ?, ?, ?)',
            [name, sku, category_id || null, unit || 'pcs', reorder_point || 0],
            function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(400).json({ success: false, message: 'Error creating product (SKU must be unique)', error: err.message });
                }

                const productId = this.lastID;

                // Handle initial stock if provided
                if (initial_stock && parseInt(initial_stock) > 0 && initial_location_id) {
                    db.run(
                        'INSERT INTO stock_movements (product_id, dest_location_id, quantity, movement_type, document_reference, user_id) VALUES (?, ?, ?, ?, ?, ?)',
                        [productId, initial_location_id, parseInt(initial_stock), 'receipt', 'INIT-STOCK', req.user.id],
                        function(err2) {
                            if (err2) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ success: false, message: 'Error adding initial stock' });
                            }
                            db.run('COMMIT');
                            res.status(201).json({ success: true, message: 'Product created with initial stock', data: { id: productId } });
                        }
                    );
                } else {
                    db.run('COMMIT');
                    res.status(201).json({ success: true, message: 'Product created', data: { id: productId } });
                }
            }
        );
    });
};

exports.updateProduct = (req, res) => {
    const { name, sku, category_id, unit, reorder_point, adjustment_stock, adjustment_location_id } = req.body;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run(
            'UPDATE products SET name = ?, sku = ?, category_id = ? , unit = ?, reorder_point = ? WHERE id = ?',
            [name, sku, category_id || null, unit, reorder_point, req.params.id],
            function(err) {
                if (err) {
                    console.error('Update product error:', err);
                    db.run('ROLLBACK');
                    return res.status(400).json({ success: false, message: 'Error updating product: ' + err.message });
                }

                // If adjustment is provided and NOT zero, and location is provided
                const qtyAdjust = parseInt(adjustment_stock);
                if (!isNaN(qtyAdjust) && qtyAdjust !== 0 && adjustment_location_id) {
                    const isPositive = qtyAdjust > 0;
                    const source = isPositive ? null : adjustment_location_id;
                    const dest = isPositive ? adjustment_location_id : null;
                    const absQty = Math.abs(qtyAdjust);

                    db.run(
                        'INSERT INTO stock_movements (product_id, source_location_id, dest_location_id, quantity, movement_type, document_reference, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [req.params.id, source, dest, absQty, 'adjustment', 'MANUAL-ADJ', req.user.id],
                        function(err2) {
                            if (err2) {
                                console.error('Adjustment error:', err2);
                                db.run('ROLLBACK');
                                return res.status(500).json({ success: false, message: 'Stock adjustment failed: ' + err2.message });
                            }
                            db.run('COMMIT');
                            res.status(200).json({ success: true, message: 'Product updated and stock adjusted' });
                        }
                    );
                } else {
                    db.run('COMMIT');
                    res.status(200).json({ success: true, message: 'Product updated successfully' });
                }
            }
        );
    });
};

exports.deleteProduct = (req, res) => {
    const { force } = req.query;
    const productId = req.params.id;

    if (force === 'true') {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            db.run('DELETE FROM stock_movements WHERE product_id = ?', [productId]);
            db.run('DELETE FROM products WHERE id = ?', [productId], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ success: false, message: 'Force delete failed: ' + err.message });
                }
                db.run('COMMIT');
                res.status(200).json({ success: true, message: 'Product and all history deleted' });
            });
        });
    } else {
        db.get('SELECT COUNT(*) as count FROM stock_movements WHERE product_id = ?', [productId], (err, row) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            
            if (row.count > 0) {
                return res.status(400).json({ success: false, message: 'Cannot delete product with stock movement history. Use "Force Delete" to override.' });
            }

            db.run('DELETE FROM products WHERE id = ?', [productId], function(err) {
                if (err) return res.status(500).json({ success: false, message: 'Error deleting product' });
                res.status(200).json({ success: true, message: 'Product deleted successfully' });
            });
        });
    }
};

exports.getCategories = (req, res) => {
    db.all('SELECT * FROM categories', [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.status(200).json({ success: true, data: rows });
    });
};
