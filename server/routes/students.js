const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const upload = multer({ dest: path.join(__dirname, '../uploads/') });

module.exports = function (pool) {
    const router = express.Router();

    // Get all students (with program info)
    router.get('/', authMiddleware, async (req, res) => {
        const { program_id, year, search } = req.query;
        let sql = `SELECT s.*, p.name as program_name FROM students s JOIN programs p ON s.program_id = p.id WHERE 1=1`;
        const params = [];
        let idx = 1;
        if (program_id) { sql += ` AND s.program_id = $${idx++}`; params.push(program_id); }
        if (year) { sql += ` AND s.year = $${idx++}`; params.push(year); }
        if (search) { sql += ` AND (s.name ILIKE $${idx} OR s.reg_number ILIKE $${idx})`; idx++; params.push(`%${search}%`); }
        sql += ' ORDER BY s.name';
        try {
            const { rows } = await pool.query(sql, params);
            res.json(rows);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // Get single student
    router.get('/:id', authMiddleware, async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT s.*, p.name as program_name FROM students s JOIN programs p ON s.program_id = p.id WHERE s.id = $1', [req.params.id]);
            if (!rows[0]) return res.status(404).json({ error: 'Student not found' });
            res.json(rows[0]);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // Create student
    router.post('/', authMiddleware, adminOnly, async (req, res) => {
        const { name, reg_number, program_id, year } = req.body;
        if (!name || !reg_number || !program_id) return res.status(400).json({ error: 'Name, registration number, and program required' });
        try {
            const { rows } = await pool.query('INSERT INTO students (name, reg_number, program_id, year) VALUES ($1, $2, $3, $4) RETURNING id', [name, reg_number, program_id, year || 1]);
            res.json({ id: rows[0].id, name, reg_number, program_id, year: year || 1 });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // Update student
    router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
        const { name, reg_number, program_id, year } = req.body;
        try {
            await pool.query('UPDATE students SET name = $1, reg_number = $2, program_id = $3, year = $4 WHERE id = $5', [name, reg_number, program_id, year || 1, req.params.id]);
            res.json({ success: true });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // Delete student
    router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
        try {
            await pool.query('DELETE FROM students WHERE id = $1', [req.params.id]);
            res.json({ success: true });
        } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // Bulk import CSV
    router.post('/import', authMiddleware, adminOnly, upload.single('file'), async (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        try {
            const content = fs.readFileSync(req.file.path, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim());

            if (lines.length < 2) return res.status(400).json({ error: 'CSV must have headers and at least one data row' });

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const nameIdx = headers.findIndex(h => h.includes('name') && !h.includes('program'));
            const regIdx = headers.findIndex(h => h.includes('reg') || h.includes('id') || h.includes('number'));
            const progIdx = headers.findIndex(h => h.includes('program'));
            const yearIdx = headers.findIndex(h => h.includes('year'));

            if (nameIdx === -1 || regIdx === -1) {
                return res.status(400).json({ error: 'CSV must have "name" and "registration number/id" columns' });
            }

            // Get programs map
            const { rows: programs } = await pool.query('SELECT * FROM programs');
            const programMap = {};
            programs.forEach(p => { programMap[p.name.toLowerCase()] = p.id; });

            let imported = 0;
            let skipped = 0;

            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
                    const name = cols[nameIdx];
                    const reg = cols[regIdx];
                    if (!name || !reg) { skipped++; continue; }

                    let programId = 1;
                    if (progIdx !== -1 && cols[progIdx]) {
                        const key = cols[progIdx].toLowerCase();
                        programId = programMap[key] || 1;
                    }

                    let year = 1;
                    if (yearIdx !== -1 && cols[yearIdx]) {
                        year = parseInt(cols[yearIdx]) || 1;
                    }

                    const result = await client.query(
                        'INSERT INTO students (name, reg_number, program_id, year) VALUES ($1, $2, $3, $4) ON CONFLICT (reg_number) DO NOTHING',
                        [name, reg, programId, year]
                    );
                    if (result.rowCount) imported++;
                    else skipped++;
                }
                await client.query('COMMIT');
            } catch (txErr) {
                await client.query('ROLLBACK');
                throw txErr;
            } finally {
                client.release();
            }

            // Cleanup uploaded file
            fs.unlinkSync(req.file.path);

            res.json({ imported, skipped, total: lines.length - 1 });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    return router;
};
