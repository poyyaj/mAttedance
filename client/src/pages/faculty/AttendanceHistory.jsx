import { useState, useEffect } from 'react';
import { FiDownload, FiEdit2, FiSave, FiX, FiFilter } from 'react-icons/fi';
import api from '../../utils/api';

export default function AttendanceHistory() {
    const [sessions, setSessions] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [expandedSession, setExpandedSession] = useState(null);
    const [sessionRecords, setSessionRecords] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [editedRecords, setEditedRecords] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchSessions = async () => {
        const params = {};
        if (selectedSubject) params.subject_id = selectedSubject;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        const res = await api.get('/attendance/sessions', { params });
        setSessions(res.data);
        setLoading(false);
    };

    useEffect(() => {
        api.get('/subjects').then(r => setSubjects(r.data));
        fetchSessions();
    }, []);

    useEffect(() => { fetchSessions(); }, [selectedSubject, dateFrom, dateTo]);

    const viewSession = async (sessionId) => {
        if (expandedSession === sessionId) { setExpandedSession(null); return; }
        const res = await api.get('/attendance', { params: { session_id: sessionId } });
        setSessionRecords(res.data);
        setExpandedSession(sessionId);
        setEditMode(false);
        setEditedRecords({});
    };

    const startEdit = () => {
        setEditMode(true);
        const edits = {};
        sessionRecords.forEach(r => { edits[r.id] = { status: r.status, remarks: r.remarks }; });
        setEditedRecords(edits);
    };

    const saveEdits = async () => {
        const records = Object.entries(editedRecords).map(([id, data]) => ({ id: parseInt(id), ...data }));
        await api.put(`/attendance/session/${expandedSession}`, { records });
        setEditMode(false);
        viewSession(expandedSession);
        fetchSessions();
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (selectedSubject) params.append('subject_id', selectedSubject);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        window.open(`/api/attendance/export?${params.toString()}`, '_blank');
    };

    if (loading) return <div className="loading-spinner" />;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>📜 Attendance History</h2>
                <button className="btn btn-secondary" onClick={handleExport}><FiDownload /> Export CSV</button>
            </div>

            <div className="filter-bar">
                <FiFilter />
                <select className="form-select" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                    <option value="">All Subjects</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.paper_id} — {s.name}</option>)}
                </select>
                <input className="form-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ maxWidth: 170 }} placeholder="From" />
                <input className="form-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ maxWidth: 170 }} placeholder="To" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sessions.map(s => (
                    <div key={s.session_id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        {/* Session header */}
                        <div
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', background: expandedSession === s.session_id ? 'var(--bg-tertiary)' : 'transparent' }}
                            onClick={() => viewSession(s.session_id)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{s.subject_name}</div>
                                    <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-tertiary)' }}>{s.paper_id} • {s.date} • {s.time} • {s.class_type}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span className="badge badge-success">{s.present} Present</span>
                                <span className="badge badge-danger">{s.absent} Absent</span>
                                <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: (s.present / s.total * 100) >= 75 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                    {Math.round(s.present / s.total * 100)}%
                                </span>
                            </div>
                        </div>

                        {/* Expanded records */}
                        {expandedSession === s.session_id && (
                            <div style={{ borderTop: '1px solid var(--border-color)', padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
                                    {editMode ? (
                                        <>
                                            <button className="btn btn-sm btn-secondary" onClick={() => setEditMode(false)}><FiX /> Cancel</button>
                                            <button className="btn btn-sm btn-success" onClick={saveEdits}><FiSave /> Save Changes</button>
                                        </>
                                    ) : (
                                        <button className="btn btn-sm btn-secondary" onClick={startEdit}><FiEdit2 /> Edit</button>
                                    )}
                                </div>
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr><th>#</th><th>Name</th><th>Reg Number</th><th>Status</th><th>Remarks</th></tr>
                                        </thead>
                                        <tbody>
                                            {sessionRecords.map((r, i) => (
                                                <tr key={r.id}>
                                                    <td>{i + 1}</td>
                                                    <td style={{ fontWeight: 600 }}>{r.student_name}</td>
                                                    <td>{r.reg_number}</td>
                                                    <td>
                                                        {editMode ? (
                                                            <select className="form-select" style={{ width: 'auto', padding: '4px 8px' }} value={editedRecords[r.id]?.status || r.status} onChange={e => setEditedRecords(prev => ({ ...prev, [r.id]: { ...prev[r.id], status: e.target.value } }))}>
                                                                <option>Present</option><option>Absent</option><option>Half-day</option>
                                                            </select>
                                                        ) : (
                                                            <span className={`badge ${r.status === 'Present' ? 'badge-success' : r.status === 'Absent' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {editMode ? (
                                                            <input className="form-input" style={{ padding: '4px 8px' }} value={editedRecords[r.id]?.remarks ?? r.remarks} onChange={e => setEditedRecords(prev => ({ ...prev, [r.id]: { ...prev[r.id], remarks: e.target.value } }))} />
                                                        ) : (r.remarks || '—')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {sessions.length === 0 && (
                    <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
                        No attendance sessions found
                    </div>
                )}
            </div>
        </div>
    );
}
