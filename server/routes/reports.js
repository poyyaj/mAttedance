const express = require('express');
const { authMiddleware } = require('../middleware/auth');

module.exports = function (pool) {
  const router = express.Router();

  // Shortage report — students below threshold
  router.get('/shortage', authMiddleware, async (req, res) => {
    const { subject_id, program_id, month, semester, threshold } = req.query;
    const minPct = parseFloat(threshold) || 75;

    let dateFilter = '';
    const params = [];
    let idx = 1;

    if (month) {
      dateFilter = ` AND TO_CHAR(a.date, 'YYYY-MM') = $${idx++}`;
      params.push(month);
    }
    if (semester) {
      const year = new Date().getFullYear();
      if (semester === '1') {
        dateFilter += ` AND a.date >= $${idx++} AND a.date <= $${idx++}`;
        params.push(`${year}-01-01`, `${year}-06-30`);
      } else {
        dateFilter += ` AND a.date >= $${idx++} AND a.date <= $${idx++}`;
        params.push(`${year}-07-01`, `${year}-12-31`);
      }
    }

    let subjectFilter = '';
    if (subject_id) { subjectFilter = ` AND a.subject_id = $${idx++}`; params.push(subject_id); }

    let programFilter = '';
    if (program_id) { programFilter = ` AND s.program_id = $${idx++}`; params.push(program_id); }

    params.push(minPct);

    const sql = `
      SELECT 
        s.id as student_id, s.name, s.reg_number, s.year,
        p.name as program_name,
        sub.paper_id, sub.name as subject_name,
        COUNT(*) as total_classes,
        SUM(CASE WHEN a.status = 'Present' THEN 1 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) as attended,
        ROUND(
          SUM(CASE WHEN a.status = 'Present' THEN 1.0 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) * 100.0 / COUNT(*), 1
        ) as percentage
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN programs p ON s.program_id = p.id
      JOIN subjects sub ON a.subject_id = sub.id
      WHERE 1=1 ${dateFilter} ${subjectFilter} ${programFilter}
      GROUP BY s.id, s.name, s.reg_number, s.year, p.name, sub.paper_id, sub.name, a.subject_id
      HAVING ROUND(
        SUM(CASE WHEN a.status = 'Present' THEN 1.0 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) * 100.0 / COUNT(*), 1
      ) < $${idx}
      ORDER BY percentage ASC
    `;

    try {
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Student attendance summary
  router.get('/student/:id', authMiddleware, async (req, res) => {
    const { date_from, date_to } = req.query;
    let dateFilter = '';
    const params = [req.params.id];
    let idx = 2;
    if (date_from) { dateFilter += ` AND a.date >= $${idx++}`; params.push(date_from); }
    if (date_to) { dateFilter += ` AND a.date <= $${idx++}`; params.push(date_to); }

    try {
      const { rows: summary } = await pool.query(`
                SELECT 
                    sub.id as subject_id, sub.paper_id, sub.name as subject_name,
                    COUNT(*) as total_classes,
                    SUM(CASE WHEN a.status = 'Present' THEN 1 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) as attended,
                    ROUND(
                        SUM(CASE WHEN a.status = 'Present' THEN 1.0 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) * 100.0 / COUNT(*), 1
                    ) as percentage
                FROM attendance a
                JOIN subjects sub ON a.subject_id = sub.id
                WHERE a.student_id = $1 ${dateFilter}
                GROUP BY sub.id, sub.paper_id, sub.name, a.subject_id
            `, params);

      const { rows: studentRows } = await pool.query('SELECT s.*, p.name as program_name FROM students s JOIN programs p ON s.program_id = p.id WHERE s.id = $1', [req.params.id]);
      res.json({ student: studentRows[0], subjects: summary });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Monthly attendance percentages
  router.get('/monthly', authMiddleware, async (req, res) => {
    const { subject_id, program_id, year } = req.query;
    let filters = '';
    const params = [];
    let idx = 1;

    const currentYear = year || new Date().getFullYear();
    params.push(String(currentYear));
    idx++;

    if (subject_id) { filters += ` AND a.subject_id = $${idx++}`; params.push(subject_id); }
    if (program_id) { filters += ` AND s.program_id = $${idx++}`; params.push(program_id); }

    try {
      const { rows } = await pool.query(`
                SELECT 
                    TO_CHAR(a.date, 'YYYY-MM') as month,
                    COUNT(*) as total,
                    SUM(CASE WHEN a.status = 'Present' THEN 1 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) as attended,
                    ROUND(
                        SUM(CASE WHEN a.status = 'Present' THEN 1.0 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) * 100.0 / COUNT(*), 1
                    ) as percentage
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                WHERE EXTRACT(YEAR FROM a.date) = $1 ${filters}
                GROUP BY month
                ORDER BY month
            `, params);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Subject-wise comparison
  router.get('/subject-comparison', authMiddleware, async (req, res) => {
    const { program_id } = req.query;
    let filters = '';
    const params = [];
    let idx = 1;
    if (program_id) { filters += ` AND s.program_id = $${idx++}`; params.push(program_id); }

    try {
      const { rows } = await pool.query(`
                SELECT 
                    sub.id, sub.paper_id, sub.name as subject_name,
                    COUNT(*) as total,
                    ROUND(
                        SUM(CASE WHEN a.status = 'Present' THEN 1.0 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) * 100.0 / COUNT(*), 1
                    ) as percentage
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                JOIN subjects sub ON a.subject_id = sub.id
                WHERE 1=1 ${filters}
                GROUP BY sub.id, sub.paper_id, sub.name, a.subject_id
                ORDER BY sub.paper_id
            `, params);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Class type distribution
  router.get('/class-type-distribution', authMiddleware, async (req, res) => {
    const { subject_id, program_id } = req.query;
    let filters = '';
    const params = [];
    let idx = 1;
    if (subject_id) { filters += ` AND a.subject_id = $${idx++}`; params.push(subject_id); }
    if (program_id) { filters += ` AND s.program_id = $${idx++}`; params.push(program_id); }

    try {
      const { rows } = await pool.query(`
                SELECT 
                    a.class_type,
                    COUNT(DISTINCT a.session_id) as sessions,
                    COUNT(*) as total_records,
                    ROUND(
                        SUM(CASE WHEN a.status = 'Present' THEN 1.0 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) * 100.0 / COUNT(*), 1
                    ) as attendance_pct
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                WHERE 1=1 ${filters}
                GROUP BY a.class_type
            `, params);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Predictive alert
  router.get('/predictive', authMiddleware, async (req, res) => {
    const threshold = parseFloat(req.query.threshold) || 75;
    const warningZone = threshold + 10;

    try {
      const { rows } = await pool.query(`
                SELECT 
                    s.id as student_id, s.name, s.reg_number,
                    p.name as program_name,
                    sub.paper_id, sub.name as subject_name,
                    COUNT(*) as total_classes,
                    ROUND(
                        SUM(CASE WHEN a.status = 'Present' THEN 1.0 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) * 100.0 / COUNT(*), 1
                    ) as current_pct,
                    ROUND(
                        SUM(CASE WHEN a.status = 'Present' THEN 1.0 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) * 100.0 / (COUNT(*) + 5), 1
                    ) as projected_pct_if_absent
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                JOIN programs p ON s.program_id = p.id
                JOIN subjects sub ON a.subject_id = sub.id
                GROUP BY s.id, s.name, s.reg_number, p.name, sub.paper_id, sub.name, a.subject_id
                HAVING ROUND(
                    SUM(CASE WHEN a.status = 'Present' THEN 1.0 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) * 100.0 / COUNT(*), 1
                ) <= $1 AND ROUND(
                    SUM(CASE WHEN a.status = 'Present' THEN 1.0 WHEN a.status = 'Half-day' THEN 0.5 ELSE 0 END) * 100.0 / COUNT(*), 1
                ) >= $2
                ORDER BY current_pct ASC
            `, [warningZone, threshold]);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Consistency score
  router.get('/consistency/:studentId', authMiddleware, async (req, res) => {
    try {
      const { rows: records } = await pool.query('SELECT a.date::text, a.status FROM attendance a WHERE a.student_id = $1 ORDER BY a.date', [req.params.studentId]);

      if (!records.length) return res.json({ score: 0, streak: 0, total: 0 });

      let currentStreak = 0, maxStreak = 0, presentCount = 0;
      records.forEach(r => {
        if (r.status === 'Present') {
          currentStreak++;
          presentCount++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });

      const overallPct = (presentCount / records.length) * 100;
      const score = Math.round(overallPct * 0.7 + (maxStreak / records.length) * 100 * 0.3);
      res.json({ score: Math.min(score, 100), current_streak: currentStreak, max_streak: maxStreak, total_days: records.length, present_days: presentCount });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  return router;
};
