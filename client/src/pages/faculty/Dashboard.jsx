import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit, FiClock, FiCheckCircle, FiAlertTriangle, FiActivity } from 'react-icons/fi';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../../utils/api';
import StatCard from '../../components/StatCard';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function FacultyDashboard() {
    const [subjects, setSubjects] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([
            api.get('/subjects'),
            api.get('/attendance/sessions'),
        ]).then(([subRes, sessRes]) => {
            setSubjects(subRes.data);
            setSessions(sessRes.data);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="loading-spinner" />;

    const totalSessions = sessions.length;
    const totalStudentsMarked = sessions.reduce((sum, s) => sum + s.total, 0);
    const avgAttendance = sessions.length > 0
        ? Math.round(sessions.reduce((sum, s) => sum + (s.present / s.total * 100), 0) / sessions.length)
        : 0;

    const recentSessions = sessions.slice(0, 8);

    // Subject-wise attendance from sessions
    const subjectMap = {};
    sessions.forEach(s => {
        if (!subjectMap[s.subject_name]) subjectMap[s.subject_name] = { total: 0, present: 0 };
        subjectMap[s.subject_name].total += s.total;
        subjectMap[s.subject_name].present += s.present;
    });

    const chartData = {
        labels: Object.keys(subjectMap),
        datasets: [{
            label: 'Attendance %',
            data: Object.values(subjectMap).map(v => Math.round(v.present / v.total * 100)),
            backgroundColor: Object.values(subjectMap).map(v => {
                const pct = v.present / v.total * 100;
                return pct >= 75 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)';
            }),
            borderRadius: 8,
            borderSkipped: false,
        }]
    };

    return (
        <div>
            <div className="stat-cards">
                <StatCard icon={<FiClock />} label="Total Sessions" value={totalSessions} variant="primary" />
                <StatCard icon={<FiCheckCircle />} label="Students Marked" value={totalStudentsMarked} variant="success" />
                <StatCard icon={<FiActivity />} label="Avg Attendance" value={`${avgAttendance}%`} variant={avgAttendance >= 75 ? 'success' : 'warning'} />
                <StatCard icon={<FiEdit />} label="Subjects" value={subjects.length} variant="info" />
            </div>

            {/* Quick Action */}
            <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: 32 }}>
                <h3 style={{ marginBottom: 12, fontSize: 'var(--font-xl)' }}>📝 Quick Mark Attendance</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Start a new attendance session for your assigned subjects</p>
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/faculty/mark')}>
                    <FiEdit /> Mark Attendance Now
                </button>
            </div>

            <div className="grid-2">
                {/* Subject Chart */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">📊 My Subject Attendance</div>
                    </div>
                    <div className="chart-container">
                        {Object.keys(subjectMap).length > 0 ? (
                            <Bar data={chartData} options={{
                                responsive: true, maintainAspectRatio: false,
                                plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15,23,42,0.9)', padding: 12, cornerRadius: 8 } },
                                scales: {
                                    y: { beginAtZero: true, max: 100, grid: { color: 'rgba(148,163,184,0.1)' } },
                                    x: { grid: { display: false } }
                                }
                            }} />
                        ) : <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>No data yet</p>}
                    </div>
                </div>

                {/* Recent Sessions */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">🕐 Recent Sessions</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recentSessions.map((s, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{s.subject_name}</div>
                                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{s.date} • {s.class_type}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span className="badge badge-success">{s.present}P</span>
                                    <span className="badge badge-danger">{s.absent}A</span>
                                </div>
                            </div>
                        ))}
                        {recentSessions.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 20 }}>No sessions yet</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
