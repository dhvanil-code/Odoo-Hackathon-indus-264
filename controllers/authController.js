const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user.id, user.role);

    const options = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        httpOnly: true,
    };

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    });
};

exports.register = (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide all fields' });
    }

    db.get('SELECT email FROM users WHERE email = ?', [email], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (row) return res.status(400).json({ success: false, message: 'Email already exists' });

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);

        db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword], function(err) {
            if (err) return res.status(500).json({ success: false, message: 'Failed to create user' });

            db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, user) => {
                sendTokenResponse(user, 201, res);
            });
        });
    });
};

exports.login = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        sendTokenResponse(user, 200, res);
    });
};

exports.logout = (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
};

exports.getMe = (req, res) => {
    db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        
        res.status(200).json({ success: true, data: user });
    });
};

// Simplified OTP reset for demonstration (creates OTP and allows immediate reset)
exports.forgotPassword = (req, res) => {
    const { email } = req.body;
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
        if (err || !user) return res.status(404).json({ success: false, message: 'User not found' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60000).toISOString(); // 10 mins

        db.run('INSERT INTO otp_resets (user_id, otp, expires_at) VALUES (?, ?, ?)', [user.id, otp, expiresAt], function(err) {
            if (err) return res.status(500).json({ success: false, message: 'Could not generate OTP' });
            
            // In a real app, send this via email.
            res.status(200).json({ success: true, message: 'OTP generated successfully', otp: otp }); 
        });
    });
};

exports.resetPassword = (req, res) => {
    const { email, otp, newPassword } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err || !user) return res.status(404).json({ success: false, message: 'User not found' });

        db.get('SELECT * FROM otp_resets WHERE user_id = ? AND otp = ? ORDER BY id DESC LIMIT 1', [user.id, otp], (err, otpRecord) => {
            if (err || !otpRecord) return res.status(400).json({ success: false, message: 'Invalid OTP' });
            
            if (new Date() > new Date(otpRecord.expires_at)) {
                return res.status(400).json({ success: false, message: 'OTP expired' });
            }

            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(newPassword, salt);

            db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id], (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Error updating password' });
                
                db.run('DELETE FROM otp_resets WHERE user_id = ?', [user.id]);
                res.status(200).json({ success: true, message: 'Password updated successfully' });
            });
        });
    });
};
