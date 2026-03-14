const db = require('../database/db');

exports.getLocations = (req, res) => {
    const query = `
        SELECT l.*, w.name as warehouse_name 
        FROM locations l 
        LEFT JOIN warehouses w ON l.warehouse_id = w.id
        ORDER BY l.id DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.status(200).json({ success: true, count: rows.length, data: rows });
    });
};

exports.getLocationById = (req, res) => {
    db.get('SELECT * FROM locations WHERE id = ?', [req.params.id], (err, location) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!location) return res.status(404).json({ success: false, message: 'Location not found' });
        res.status(200).json({ success: true, data: location });
    });
};

exports.createLocation = (req, res) => {
    const { warehouse_id, code, description } = req.body;

    if (!warehouse_id || !code) {
        return res.status(400).json({ success: false, message: 'Warehouse ID and Code are required' });
    }

    db.run(
        'INSERT INTO locations (warehouse_id, code, description) VALUES (?, ?, ?)',
        [warehouse_id, code, description],
        function(err) {
            if (err) return res.status(400).json({ success: false, message: 'Error creating location (code must be unique)' });
            res.status(201).json({ success: true, message: 'Location created successfully', data: { id: this.lastID } });
        }
    );
};

exports.updateLocation = (req, res) => {
    const { warehouse_id, code, description } = req.body;
    
    db.run(
        'UPDATE locations SET warehouse_id = ?, code = ?, description = ? WHERE id = ?',
        [warehouse_id, code, description, req.params.id],
        function(err) {
            if (err) return res.status(400).json({ success: false, message: 'Error updating location' });
            if (this.changes === 0) return res.status(404).json({ success: false, message: 'Location not found' });
            res.status(200).json({ success: true, message: 'Location updated successfully' });
        }
    );
};

exports.deleteLocation = (req, res) => {
    // Should check if any stock exists here
    db.get('SELECT count(*) as count FROM stock_movements WHERE source_location_id = ? OR dest_location_id = ?', [req.params.id, req.params.id], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (row.count > 0) return res.status(400).json({ success: false, message: 'Cannot delete location with movement history' });

        db.run('DELETE FROM locations WHERE id = ?', [req.params.id], function(err) {
            if (err) return res.status(500).json({ success: false, message: 'Error deleting location' });
            if (this.changes === 0) return res.status(404).json({ success: false, message: 'Location not found' });
            res.status(200).json({ success: true, message: 'Location deleted successfully' });
        });
    });
};
