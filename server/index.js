require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize schema + auto-seed on startup
(async () => {
    try {
        // Create tables if they don't exist
        const check = await pool.query("SELECT to_regclass('public.admins')");
        if (!check.rows[0].to_regclass) {
            const schemaPath = path.join(__dirname, 'db', 'schema.sql');
            if (fs.existsSync(schemaPath)) {
                const schema = fs.readFileSync(schemaPath, 'utf-8');
                await pool.query(schema);
                console.log('📋 Database schema initialized');
            }
        }

        // Auto-seed admin if admins table is empty
        const adminCount = await pool.query('SELECT COUNT(*) as count FROM admins');
        if (parseInt(adminCount.rows[0].count) === 0) {
            const hashedPassword = await bcrypt.hash('mAttedance@2026', 10);
            await pool.query(
                'INSERT INTO admins (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET password_hash = $2',
                ['admin', hashedPassword]
            );
            console.log('🌱 Admin user auto-seeded (admin / mAttedance@2026)');
        }
    } catch (err) {
        console.error('Schema/seed init error:', err.message);
    }
})();

// Routes — pass pool instead of db
app.use('/api/auth', require('./routes/auth')(pool));
app.use('/api/programs', require('./routes/programs')(pool));
app.use('/api/subjects', require('./routes/subjects')(pool));
app.use('/api/students', require('./routes/students')(pool));
app.use('/api/faculty', require('./routes/faculty')(pool));
app.use('/api/attendance', require('./routes/attendance')(pool));
app.use('/api/reports', require('./routes/reports')(pool));
app.use('/api/dashboard', require('./routes/dashboard')(pool));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ONE-TIME SETUP: Visit this URL in browser to initialize DB & create admin
// e.g. https://your-app.onrender.com/api/setup
app.get('/api/setup', async (req, res) => {
    try {
        // Create tables
        const schemaPath = path.join(__dirname, 'db', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await pool.query(schema);

        // Delete existing admin and re-create
        await pool.query('DELETE FROM admins');
        const hashedPassword = await bcrypt.hash('mAttedance@2026', 10);
        await pool.query(
            'INSERT INTO admins (username, password_hash) VALUES ($1, $2)',
            ['admin', hashedPassword]
        );

        res.json({
            success: true,
            message: 'Database initialized and admin user created!',
            login: { username: 'admin', password: 'mAttedance@2026' }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, stack: err.stack });
    }
});

// DEBUG: Check database state
app.get('/api/debug/db', async (req, res) => {
    try {
        const tables = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' ORDER BY table_name
        `);
        const admins = await pool.query('SELECT id, username, LENGTH(password_hash) as hash_length FROM admins');
        res.json({
            tables: tables.rows.map(r => r.table_name),
            admins: admins.rows,
            env: {
                NODE_ENV: process.env.NODE_ENV,
                hasDbUrl: !!process.env.DATABASE_URL,
                hasJwtSecret: !!process.env.JWT_SECRET
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve frontend static files in production
const clientBuild = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuild)) {
    app.use(express.static(clientBuild));
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientBuild, 'index.html'));
    });
}

// Error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 mAttedance Server running on http://localhost:${PORT}`);
});
