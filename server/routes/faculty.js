const express = require('express');
const bcrypt = require('bcryptjs');
const { authMiddleware, adminOnly } = require('../middleware/auth');

module.exports = function (pool) {
    const router = express.Router();

    // Get all faculty (with assigned subjects)
    router.get('/', authMiddleware, async (req, res) => {
        try {
            const { rows: faculty } = await pool.query('SELECT id, name, email, created_at FROM faculty ORDER BY name');
            for (const f of faculty) {
                const { rows: subjects } = await pool.query(`
                    SELECT s.id, s.paper_id, s.name, p.name as program_name
                    FROM faculty_subjects fs
                    JOIN subjects s ON fs.subject_id = s.id
                    JOIN programs p ON s.program_id = p.id
                    WHERE fs.faculty_id = $1
                `, [f.id]);
                f.subjects = subjects;
            }
            res.json(faculty);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // Get single faculty
    router.get('/:id', authMiddleware, async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT id, name, email, created_at FROM faculty WHERE id = $1', [req.params.id]);
            if (!rows[0]) return res.status(404).json({ error: 'Faculty not found' });
            const faculty = rows[0];
            const { rows: subjects } = await pool.query(`
                SELECT s.id, s.paper_id, s.name FROM faculty_subjects fs
                JOIN subjects s ON fs.subject_id = s.id WHERE fs.faculty_id = $1
            `, [faculty.id]);
            faculty.subjects = subjects;
            res.json(faculty);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // Create faculty (admin only)
    router.post('/', authMiddleware, adminOnly, async (req, res) => {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password required' });
        try {
            const hash = bcrypt.hashSync(password, 10);
            const { rows } = await pool.query('INSERT INTO faculty (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id', [name, email, hash]);
            res.json({ id: rows[0].id, name, email });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // Update faculty
    router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
        const { name, email, password } = req.body;
        try {
            if (password) {
                const hash = bcrypt.hashSync(password, 10);
                await pool.query('UPDATE faculty SET name = $1, email = $2, password_hash = $3 WHERE id = $4', [name, email, hash, req.params.id]);
            } else {
                await pool.query('UPDATE faculty SET name = $1, email = $2 WHERE id = $3', [name, email, req.params.id]);
            }
            res.json({ success: true });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // Delete faculty
    router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
        try {
            await pool.query('DELETE FROM faculty WHERE id = $1', [req.params.id]);
            res.json({ success: true });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // Assign subject to faculty
    router.post('/:id/subjects', authMiddleware, adminOnly, async (req, res) => {
        const { subject_id } = req.body;
        try {
            await pool.query('INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, subject_id]);
            res.json({ success: true });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // Remove subject from faculty
    router.delete('/:id/subjects/:subjectId', authMiddleware, adminOnly, async (req, res) => {
        try {
            await pool.query('DELETE FROM faculty_subjects WHERE faculty_id = $1 AND subject_id = $2', [req.params.id, req.params.subjectId]);
            res.json({ success: true });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // Get faculty activity log
    router.get('/:id/activity', authMiddleware, async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT * FROM faculty_activity_log WHERE faculty_id = $1 ORDER BY timestamp DESC LIMIT 50', [req.params.id]);
            res.json(rows);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    return router;
};
