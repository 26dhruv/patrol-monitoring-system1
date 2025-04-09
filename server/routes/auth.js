const express = require('express');
const { register, login, getMe, logout } = require('../controllers/auth');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateUser, getMe);
router.get('/logout', authenticateUser, logout);

module.exports = router; 