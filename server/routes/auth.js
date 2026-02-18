const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middleware/auth');

module.exports = function (pool) {
    const router = express.Router();

    // Admin Login
    router.post('/admin/login', async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

        try {
            const { rows } = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
            const admin = rows[0];
            if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

            if (!bcrypt.compareSync(password, admin.password_hash)) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign({ id: admin.id, role: 'admin', username: admin.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
            res.json({ token, user: { id: admin.id, username: admin.username, role: 'admin' } });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Faculty Login
    router.post('/faculty/login', async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        try {
            const { rows } = await pool.query('SELECT * FROM faculty WHERE email = $1', [email]);
            const faculty = rows[0];
            if (!faculty) return res.status(401).json({ error: 'Invalid credentials' });

            if (!bcrypt.compareSync(password, faculty.password_hash)) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign({ id: faculty.id, role: 'faculty', name: faculty.name, email: faculty.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
            res.json({ token, user: { id: faculty.id, name: faculty.name, email: faculty.email, role: 'faculty' } });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Get current user
    router.get('/me', authMiddleware, (req, res) => {
        res.json({ user: req.user });
    });

    return router;
};
