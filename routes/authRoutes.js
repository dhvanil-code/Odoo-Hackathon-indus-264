const express = require('express');
const { register, login, logout, getMe, forgotPassword, resetPassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', authMiddleware, getMe);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword', resetPassword);

module.exports = router;
