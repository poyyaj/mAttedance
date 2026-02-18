const express = require('express');
const { authMiddleware, adminOnly } = require('../middleware/auth');

module.exports = function (pool) {
    const router = express.Router();

    // Get all programs
    router.get('/', authMiddleware, async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT * FROM programs ORDER BY name');
            res.json(rows);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // Create program (admin)
    router.post('/', authMiddleware, adminOnly, async (req, res) => {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Program name required' });
        try {
            const { rows } = await pool.query('INSERT INTO programs (name, description) VALUES ($1, $2) RETURNING id', [name, description || '']);
            res.json({ id: rows[0].id, name, description });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // Update program
    router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
        const { name, description } = req.body;
        try {
            await pool.query('UPDATE programs SET name = $1, description = $2 WHERE id = $3', [name, description || '', req.params.id]);
            res.json({ success: true });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // Delete program
    router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
        try {
            await pool.query('DELETE FROM programs WHERE id = $1', [req.params.id]);
            res.json({ success: true });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    return router;
};
