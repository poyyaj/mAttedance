const express = require('express');
const { authMiddleware } = require('../middleware/auth');

module.exports = function (pool) {
    const router = express.Router();

    // Mark attendance (bulk - for a session)
    router.post('/', authMiddleware, async (req, res) => {
        const { subject_id, paper_id, date, time, class_type, records, remarks } = req.body;
        if (!subject_id || !paper_id || !date || !class_type || !records || !records.length) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const sessionId = `sess_${date}_${Date.now()}`;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            for (const rec of records) {
                await client.query(
                    `INSERT INTO attendance (student_id, subject_id, paper_id, date, time, class_type, status, remarks, marked_by, session_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [rec.student_id, subject_id, paper_id, date, time || new Date().toTimeString().slice(0, 5), class_type, rec.status, rec.remarks || remarks || '', req.user.id, sessionId]
                );
            }
            // Log activity
            await client.query(
                'INSERT INTO faculty_activity_log (faculty_id, action, details) VALUES ($1, $2, $3)',
                [req.user.id, 'MARK_ATTENDANCE', `Marked attendance for ${records.length} students in ${paper_id} (${class_type}) on ${date}`]
            );
            await client.query('COMMIT');
            res.json({ success: true, session_id: sessionId, count: records.length });
        } catch (e) {
            await client.query('ROLLBACK');
            res.status(500).json({ error: e.message });
        } finally {
            client.release();
        }
    });

    // Get attendance records with filters
    router.get('/', authMiddleware, async (req, res) => {
        const { subject_id, student_id, date, date_from, date_to, class_type, session_id } = req.query;
        let sql = `SELECT a.*, s.name as student_name, s.reg_number, sub.name as subject_name, sub.paper_id as subject_paper_id
               FROM attendance a
               JOIN students s ON a.student_id = s.id
               JOIN subjects sub ON a.subject_id = sub.id WHERE 1=1`;
        const params = [];
        let idx = 1;

        if (subject_id) { sql += ` AND a.subject_id = $${idx++}`; params.push(subject_id); }
        if (student_id) { sql += ` AND a.student_id = $${idx++}`; params.push(student_id); }
        if (date) { sql += ` AND a.date = $${idx++}`; params.push(date); }
        if (date_from) { sql += ` AND a.date >= $${idx++}`; params.push(date_from); }
        if (date_to) { sql += ` AND a.date <= $${idx++}`; params.push(date_to); }
        if (class_type) { sql += ` AND a.class_type = $${idx++}`; params.push(class_type); }
        if (session_id) { sql += ` AND a.session_id = $${idx++}`; params.push(session_id); }

        if (req.user.role === 'faculty') {
            sql += ` AND a.subject_id IN (SELECT subject_id FROM faculty_subjects WHERE faculty_id = $${idx++})`;
            params.push(req.user.id);
        }

        sql += ' ORDER BY a.date DESC, a.time DESC';
        try {
            const { rows } = await pool.query(sql, params);
            res.json(rows);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // Get attendance sessions
    router.get('/sessions', authMiddleware, async (req, res) => {
        const { subject_id, date_from, date_to } = req.query;
        let sql = `SELECT a.session_id, a.date::text, a.time, a.class_type, a.subject_id, sub.name as subject_name, sub.paper_id,
               COUNT(*) as total, SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present,
               SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent
               FROM attendance a JOIN subjects sub ON a.subject_id = sub.id WHERE 1=1`;
        const params = [];
        let idx = 1;
        if (subject_id) { sql += ` AND a.subject_id = $${idx++}`; params.push(subject_id); }
        if (date_from) { sql += ` AND a.date >= $${idx++}`; params.push(date_from); }
        if (date_to) { sql += ` AND a.date <= $${idx++}`; params.push(date_to); }
        if (req.user.role === 'faculty') {
            sql += ` AND a.marked_by = $${idx++}`; params.push(req.user.id);
        }
        sql += ' GROUP BY a.session_id, a.date, a.time, a.class_type, a.subject_id, sub.name, sub.paper_id ORDER BY a.date DESC, a.time DESC';
        try {
            const { rows } = await pool.query(sql, params);
            res.json(rows);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // Update attendance record
    router.put('/:id', authMiddleware, async (req, res) => {
        const { status, remarks } = req.body;
        try {
            await pool.query('UPDATE attendance SET status = $1, remarks = $2 WHERE id = $3', [status, remarks || '', req.params.id]);
            await pool.query('INSERT INTO faculty_activity_log (faculty_id, action, details) VALUES ($1, $2, $3)',
                [req.user.id, 'EDIT_ATTENDANCE', `Updated attendance record #${req.params.id} to ${status}`]);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Bulk update session
    router.put('/session/:sessionId', authMiddleware, async (req, res) => {
        const { records } = req.body;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const rec of records) {
                await client.query('UPDATE attendance SET status = $1, remarks = $2 WHERE id = $3', [rec.status, rec.remarks || '', rec.id]);
            }
            await client.query('INSERT INTO faculty_activity_log (faculty_id, action, details) VALUES ($1, $2, $3)',
                [req.user.id, 'EDIT_SESSION', `Updated session ${req.params.sessionId}`]);
            await client.query('COMMIT');
            res.json({ success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            res.status(500).json({ error: e.message });
        } finally {
            client.release();
        }
    });

    // Export attendance CSV
    router.get('/export', authMiddleware, async (req, res) => {
        const { subject_id, date_from, date_to } = req.query;
        let sql = `SELECT a.date::text, a.time, a.class_type, a.status, a.remarks, s.name as student_name, s.reg_number, sub.paper_id, sub.name as subject_name
               FROM attendance a JOIN students s ON a.student_id = s.id JOIN subjects sub ON a.subject_id = sub.id WHERE 1=1`;
        const params = [];
        let idx = 1;
        if (subject_id) { sql += ` AND a.subject_id = $${idx++}`; params.push(subject_id); }
        if (date_from) { sql += ` AND a.date >= $${idx++}`; params.push(date_from); }
        if (date_to) { sql += ` AND a.date <= $${idx++}`; params.push(date_to); }
        sql += ' ORDER BY a.date, s.name';

        try {
            const { rows } = await pool.query(sql, params);
            let csv = 'Date,Time,Student Name,Reg Number,Subject,Paper ID,Class Type,Status,Remarks\n';
            rows.forEach(r => {
                csv += `${r.date},${r.time},"${r.student_name}",${r.reg_number},"${r.subject_name}",${r.paper_id},${r.class_type},${r.status},"${r.remarks || ''}"\n`;
            });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=attendance_export.csv');
            res.send(csv);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    return router;
};
