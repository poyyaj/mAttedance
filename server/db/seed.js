require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  const client = await pool.connect();

  try {
    // Drop all tables for fresh seed
    await client.query(`
      DROP TABLE IF EXISTS faculty_activity_log CASCADE;
      DROP TABLE IF EXISTS attendance CASCADE;
      DROP TABLE IF EXISTS faculty_subjects CASCADE;
      DROP TABLE IF EXISTS students CASCADE;
      DROP TABLE IF EXISTS subjects CASCADE;
      DROP TABLE IF EXISTS programs CASCADE;
      DROP TABLE IF EXISTS faculty CASCADE;
      DROP TABLE IF EXISTS admins CASCADE;
    `);

    // Run schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await client.query(schema);

    // Seed Admin
    const adminHash = bcrypt.hashSync('mAttedance@2026', 10);
    await client.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', ['admin', adminHash]);

    // Seed Programs
    const programs = ['Biomedical Science', 'M.Sc. by Research', 'Human Genetics', 'Computational Biology'];
    for (const p of programs) {
      await client.query('INSERT INTO programs (name, description) VALUES ($1, $2)', [p, `Master of Science in ${p}`]);
    }

    // Seed Subjects
    const subjects = [
      { paper_id: 'BMS101', name: 'Molecular Biology', program_id: 1, year: 1 },
      { paper_id: 'BMS102', name: 'Biochemistry', program_id: 1, year: 1 },
      { paper_id: 'BMS201', name: 'Advanced Genomics', program_id: 1, year: 2 },
      { paper_id: 'RES101', name: 'Research Methodology', program_id: 2, year: 1 },
      { paper_id: 'RES201', name: 'Advanced Research Methods', program_id: 2, year: 2 },
      { paper_id: 'HG101', name: 'Principles of Human Genetics', program_id: 3, year: 1 },
      { paper_id: 'HG102', name: 'Clinical Genetics', program_id: 3, year: 1 },
      { paper_id: 'HG201', name: 'Genetic Counseling', program_id: 3, year: 2 },
      { paper_id: 'CB101', name: 'Bioinformatics', program_id: 4, year: 1 },
      { paper_id: 'CB102', name: 'Systems Biology', program_id: 4, year: 1 },
      { paper_id: 'CB201', name: 'Machine Learning in Biology', program_id: 4, year: 2 },
    ];
    for (const s of subjects) {
      await client.query('INSERT INTO subjects (paper_id, name, program_id, year) VALUES ($1, $2, $3, $4)', [s.paper_id, s.name, s.program_id, s.year]);
    }

    // Seed Faculty
    const facultyHash = bcrypt.hashSync('faculty123', 10);
    const facultyMembers = [
      { name: 'Dr. Priya Sharma', email: 'priya@university.edu' },
      { name: 'Dr. Rahul Mehta', email: 'rahul@university.edu' },
      { name: 'Dr. Anita Desai', email: 'anita@university.edu' },
    ];
    for (const f of facultyMembers) {
      await client.query('INSERT INTO faculty (name, email, password_hash) VALUES ($1, $2, $3)', [f.name, f.email, facultyHash]);
    }

    // Assign faculty to subjects
    const assignments = [[1, 1], [1, 2], [2, 3], [2, 4], [3, 6], [3, 9]];
    for (const [fid, sid] of assignments) {
      await client.query('INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES ($1, $2)', [fid, sid]);
    }

    // Seed Students
    const studentData = [
      { name: 'Aarav Patel', reg: 'BMS2024001', pid: 1, yr: 1 },
      { name: 'Ishita Gupta', reg: 'BMS2024002', pid: 1, yr: 1 },
      { name: 'Rohan Singh', reg: 'BMS2024003', pid: 1, yr: 1 },
      { name: 'Sneha Reddy', reg: 'BMS2024004', pid: 1, yr: 1 },
      { name: 'Vikram Kumar', reg: 'BMS2024005', pid: 1, yr: 1 },
      { name: 'Meera Nair', reg: 'BMS2024006', pid: 1, yr: 1 },
      { name: 'Arjun Joshi', reg: 'BMS2024007', pid: 1, yr: 1 },
      { name: 'Pooja Verma', reg: 'BMS2024008', pid: 1, yr: 1 },
      { name: 'Karan Malhotra', reg: 'BMS2023001', pid: 1, yr: 2 },
      { name: 'Divya Sharma', reg: 'BMS2023002', pid: 1, yr: 2 },
      { name: 'Nikhil Agarwal', reg: 'BMS2023003', pid: 1, yr: 2 },
      { name: 'Ananya Iyer', reg: 'HG2024001', pid: 3, yr: 1 },
      { name: 'Siddharth Rao', reg: 'HG2024002', pid: 3, yr: 1 },
      { name: 'Riya Chatterjee', reg: 'HG2024003', pid: 3, yr: 1 },
      { name: 'Aditya Menon', reg: 'HG2024004', pid: 3, yr: 1 },
      { name: 'Nandini Das', reg: 'HG2024005', pid: 3, yr: 1 },
      { name: 'Kabir Saxena', reg: 'CB2024001', pid: 4, yr: 1 },
      { name: 'Tanya Bose', reg: 'CB2024002', pid: 4, yr: 1 },
      { name: 'Harsh Pandey', reg: 'CB2024003', pid: 4, yr: 1 },
      { name: 'Shreya Mishra', reg: 'CB2024004', pid: 4, yr: 1 },
      { name: 'Amit Tiwari', reg: 'RES2024001', pid: 2, yr: 1 },
      { name: 'Priyanka Kulkarni', reg: 'RES2024002', pid: 2, yr: 1 },
    ];
    for (const s of studentData) {
      await client.query('INSERT INTO students (name, reg_number, program_id, year) VALUES ($1, $2, $3, $4)', [s.name, s.reg, s.pid, s.yr]);
    }

    // Seed attendance data
    const today = new Date();
    for (let dayOffset = 1; dayOffset <= 30; dayOffset++) {
      const d = new Date(today);
      d.setDate(d.getDate() - dayOffset);
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      const dateStr = d.toISOString().split('T')[0];
      const sessionId = `sess_${dateStr}_1`;
      const classType = dayOffset % 2 === 0 ? 'Theory' : 'Practical';

      for (let sid = 1; sid <= 8; sid++) {
        const isPresent = Math.random() > 0.2;
        const status = (sid === 5 && Math.random() > 0.4) ? 'Absent' : (isPresent ? 'Present' : 'Absent');
        await client.query(
          'INSERT INTO attendance (student_id, subject_id, paper_id, date, time, class_type, status, remarks, marked_by, session_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
          [sid, 1, 'BMS101', dateStr, '09:00', classType, status, '', 1, sessionId]
        );
      }
    }

    for (let dayOffset = 1; dayOffset <= 20; dayOffset++) {
      const d = new Date(today);
      d.setDate(d.getDate() - dayOffset);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const dateStr = d.toISOString().split('T')[0];
      const sessionId = `sess_hg_${dateStr}_1`;

      for (let sid = 12; sid <= 16; sid++) {
        const status = Math.random() > 0.15 ? 'Present' : 'Absent';
        await client.query(
          'INSERT INTO attendance (student_id, subject_id, paper_id, date, time, class_type, status, remarks, marked_by, session_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
          [sid, 6, 'HG101', dateStr, '10:00', 'Theory', status, '', 3, sessionId]
        );
      }
    }

    console.log('✅ Database seeded successfully!');
    console.log('   Admin: admin / mAttedance@2026');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
