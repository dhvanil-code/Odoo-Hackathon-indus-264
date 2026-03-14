require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine (we are serving static HTML files from views folder, or using them as templates)
// But for this project, serving static HTML files from public/views or standard static routing
// Let's create an explicit route for each view to ensure auth protection if needed.
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/warehouses', require('./routes/warehouseRoutes'));
app.use('/api/locations', require('./routes/locationRoutes'));
app.use('/api/operations', require('./routes/operationRoutes'));

// View Routes
const serveView = (viewName) => (req, res) => res.sendFile(path.join(__dirname, 'views', viewName));

app.get('/login', serveView('login.html'));
app.get('/signup', serveView('signup.html'));
app.get('/reset-password', serveView('reset-password.html'));

// Protected Layout Views (handled by frontend JS auth check, but served here)
app.get('/dashboard', serveView('dashboard.html'));
app.get('/products', serveView('products.html'));
app.get('/warehouses', serveView('warehouses.html'));
app.get('/locations', serveView('locations.html'));
app.get('/receipts', serveView('receipts.html'));
app.get('/deliveries', serveView('deliveries.html'));
app.get('/transfers', serveView('transfers.html'));
app.get('/adjustments', serveView('adjustments.html'));
app.get('/history', serveView('history.html'));
app.get('/profile', serveView('profile.html'));
app.get('/settings', serveView('settings.html'));

// 404 handler
app.use((req, res) => {
    res.status(404).send('Page not found');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
