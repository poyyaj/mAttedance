const express = require('express');
const { authMiddleware, adminOnly } = require('../middleware/auth');

module.exports = function (pool) {
    const router = express.Router();

    // Get all subjects (with program info)
    router.get('/', authMiddleware, async (req, res) => {
        const { program_id, year } = req.query;
        let sql = `SELECT s.*, p.name as program_name FROM subjects s JOIN programs p ON s.program_id = p.id WHERE 1=1`;
        const params = [];
        let idx = 1;
        if (program_id) { sql += ` AND s.program_id = $${idx++}`; params.push(program_id); }
        if (year) { sql += ` AND s.year = $${idx++}`; params.push(year); }
        sql += ' ORDER BY s.paper_id';
        try {
            const { rows } = await pool.query(sql, params);
            res.json(rows);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // Get single subject
    router.get('/:id', authMiddleware, async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT s.*, p.name as program_name FROM subjects s JOIN programs p ON s.program_id = p.id WHERE s.id = $1', [req.params.id]);
            if (!rows[0]) return res.status(404).json({ error: 'Subject not found' });
            res.json(rows[0]);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // Create subject (admin)
    router.post('/', authMiddleware, adminOnly, async (req, res) => {
        const { paper_id, name, program_id, year } = req.body;
        if (!paper_id || !name || !program_id) return res.status(400).json({ error: 'Paper ID, name, and program required' });
        try {
            const { rows } = await pool.query('INSERT INTO subjects (paper_id, name, program_id, year) VALUES ($1, $2, $3, $4) RETURNING id', [paper_id, name, program_id, year || 1]);
            res.json({ id: rows[0].id, paper_id, name, program_id, year: year || 1 });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // Update subject
    router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
        const { paper_id, name, program_id, year } = req.body;
        try {
            await pool.query('UPDATE subjects SET paper_id = $1, name = $2, program_id = $3, year = $4 WHERE id = $5', [paper_id, name, program_id, year || 1, req.params.id]);
            res.json({ success: true });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // Delete subject
    router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
        try {
            await pool.query('DELETE FROM subjects WHERE id = $1', [req.params.id]);
            res.json({ success: true });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    return router;
};
