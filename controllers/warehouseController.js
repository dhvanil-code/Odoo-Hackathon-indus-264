const db = require('../database/db');

exports.getWarehouses = (req, res) => {
    db.all('SELECT * FROM warehouses ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.status(200).json({ success: true, count: rows.length, data: rows });
    });
};

exports.getWarehouseById = (req, res) => {
    db.get('SELECT * FROM warehouses WHERE id = ?', [req.params.id], (err, warehouse) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });
        res.status(200).json({ success: true, data: warehouse });
    });
};

exports.createWarehouse = (req, res) => {
    const { name, code, address } = req.body;

    if (!name || !code) {
        return res.status(400).json({ success: false, message: 'Name and Code are required' });
    }

    db.run(
        'INSERT INTO warehouses (name, code, address) VALUES (?, ?, ?)',
        [name, code, address],
        function(err) {
            if (err) return res.status(400).json({ success: false, message: 'Error creating warehouse (code must be unique)' });
            res.status(201).json({ success: true, message: 'Warehouse created successfully', data: { id: this.lastID } });
        }
    );
};

exports.updateWarehouse = (req, res) => {
    const { name, code, address } = req.body;
    
    db.run(
        'UPDATE warehouses SET name = ?, code = ?, address = ? WHERE id = ?',
        [name, code, address, req.params.id],
        function(err) {
            if (err) return res.status(400).json({ success: false, message: 'Error updating warehouse' });
            if (this.changes === 0) return res.status(404).json({ success: false, message: 'Warehouse not found' });
            res.status(200).json({ success: true, message: 'Warehouse updated successfully' });
        }
    );
};

exports.deleteWarehouse = (req, res) => {
    // Should check if locations exist
    db.get('SELECT count(*) as count FROM locations WHERE warehouse_id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (row.count > 0) return res.status(400).json({ success: false, message: 'Cannot delete warehouse with existing locations' });

        db.run('DELETE FROM warehouses WHERE id = ?', [req.params.id], function(err) {
            if (err) return res.status(500).json({ success: false, message: 'Error deleting warehouse' });
            if (this.changes === 0) return res.status(404).json({ success: false, message: 'Warehouse not found' });
            res.status(200).json({ success: true, message: 'Warehouse deleted successfully' });
        });
    });
};
