const express = require('express');
const { authMiddleware } = require('../middleware/auth');

module.exports = function (pool) {
  const router = express.Router();

  // Dashboard summary
  router.get('/summary', authMiddleware, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    try {
      const totalStudents = (await pool.query('SELECT COUNT(*) as count FROM students')).rows[0].count;
      const totalFaculty = (await pool.query('SELECT COUNT(*) as count FROM faculty')).rows[0].count;
      const totalSubjects = (await pool.query('SELECT COUNT(*) as count FROM subjects')).rows[0].count;
      const totalPrograms = (await pool.query('SELECT COUNT(*) as count FROM programs')).rows[0].count;

      const todayStats = (await pool.query(`
                SELECT 
                    COUNT(DISTINCT a.student_id) as students_marked,
                    SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present,
                    SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent,
                    SUM(CASE WHEN a.status = 'Half-day' THEN 1 ELSE 0 END) as half_day,
                    COUNT(DISTINCT a.session_id) as sessions
                FROM attendance a WHERE a.date = $1
            `, [today])).rows[0];

      const shortageCount = (await pool.query(`
                SELECT COUNT(DISTINCT sub.student_id) as count FROM (
                    SELECT a.student_id,
                        ROUND(SUM(CASE WHEN a.status = 'Present' THEN 1.0 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) * 100.0 / COUNT(*), 1) as pct
                    FROM attendance a GROUP BY a.student_id, a.subject_id HAVING ROUND(SUM(CASE WHEN a.status = 'Present' THEN 1.0 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) * 100.0 / COUNT(*), 1) < 75
                ) sub
            `)).rows[0].count;

      const overallPct = (await pool.query(`
                SELECT ROUND(
                    SUM(CASE WHEN status = 'Present' THEN 1.0 WHEN status = 'Half-day' THEN 0.5 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1
                ) as pct FROM attendance
            `)).rows[0].pct || 0;

      res.json({
        totalStudents: parseInt(totalStudents), totalFaculty: parseInt(totalFaculty),
        totalSubjects: parseInt(totalSubjects), totalPrograms: parseInt(totalPrograms),
        today: todayStats,
        shortageCount: parseInt(shortageCount),
        overallAttendance: parseFloat(overallPct)
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Today's attendance for dot plot
  router.get('/today', authMiddleware, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const { subject_id } = req.query;

    let sql = `
            SELECT a.student_id, s.name, a.status, a.class_type,
                (SELECT ROUND(SUM(CASE WHEN a2.status = 'Present' THEN 1.0 WHEN a2.status = 'Half-day' THEN 0.5 ELSE 0 END) * 100.0 / COUNT(*), 1)
                 FROM attendance a2 WHERE a2.student_id = a.student_id) as overall_pct
            FROM attendance a JOIN students s ON a.student_id = s.id
            WHERE a.date = $1
        `;
    const params = [today];
    let idx = 2;
    if (subject_id) { sql += ` AND a.subject_id = $${idx++}`; params.push(subject_id); }
    sql += ' ORDER BY s.name';

    try {
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Heatmap data
  router.get('/heatmap', authMiddleware, async (req, res) => {
    const { subject_id, program_id, months } = req.query;
    const lookbackMonths = parseInt(months) || 6;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - lookbackMonths);
    const startStr = startDate.toISOString().split('T')[0];

    let filters = '';
    const params = [startStr];
    let idx = 2;
    if (subject_id) { filters += ` AND a.subject_id = $${idx++}`; params.push(subject_id); }
    if (program_id) { filters += ` AND s.program_id = $${idx++}`; params.push(program_id); }

    try {
      const { rows } = await pool.query(`
                SELECT a.date::text,
                    COUNT(*) as total,
                    SUM(CASE WHEN a.status = 'Present' THEN 1 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) as present,
                    ROUND(
                        SUM(CASE WHEN a.status = 'Present' THEN 1.0 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) * 100.0 / COUNT(*), 1
                    ) as percentage
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                WHERE a.date >= $1 ${filters}
                GROUP BY a.date
                ORDER BY a.date
            `, params);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Recent activity
  router.get('/activity', authMiddleware, async (req, res) => {
    try {
      const { rows } = await pool.query(`
                SELECT l.*, f.name as faculty_name
                FROM faculty_activity_log l
                JOIN faculty f ON l.faculty_id = f.id
                ORDER BY l.timestamp DESC LIMIT 20
            `);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  return router;
};
