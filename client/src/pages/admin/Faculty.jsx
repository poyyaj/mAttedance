import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiLink, FiX } from 'react-icons/fi';
import api from '../../utils/api';

export default function Faculty() {
    const [faculty, setFaculty] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showAssign, setShowAssign] = useState(null);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [assignSubject, setAssignSubject] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        const [facRes, subRes] = await Promise.all([api.get('/faculty'), api.get('/subjects')]);
        setFaculty(facRes.data);
        setSubjects(subRes.data);
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editing) { await api.put(`/faculty/${editing.id}`, form); }
            else {
                if (!form.password) return alert('Password required for new faculty');
                await api.post('/faculty', form);
            }
            setShowModal(false); setEditing(null);
            setForm({ name: '', email: '', password: '' });
            fetchData();
        } catch (err) { alert(err.response?.data?.error || 'Error'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this faculty member?')) return;
        await api.delete(`/faculty/${id}`);
        fetchData();
    };

    const handleAssign = async (facultyId) => {
        if (!assignSubject) return;
        await api.post(`/faculty/${facultyId}/subjects`, { subject_id: parseInt(assignSubject) });
        setAssignSubject('');
        fetchData();
    };

    const handleUnassign = async (facultyId, subjectId) => {
        await api.delete(`/faculty/${facultyId}/subjects/${subjectId}`);
        fetchData();
    };

    if (loading) return <div className="loading-spinner" />;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>👩‍🏫 Faculty Management</h2>
                <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', email: '', password: '' }); setShowModal(true); }}>
                    <FiPlus /> Add Faculty
                </button>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
                {faculty.map(f => (
                    <div key={f.id} className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{f.name}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>{f.email}</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowAssign(showAssign === f.id ? null : f.id)}><FiLink /> Assign Subject</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(f); setForm({ name: f.name, email: f.email, password: '' }); setShowModal(true); }}><FiEdit2 /></button>
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-danger)' }} onClick={() => handleDelete(f.id)}><FiTrash2 /></button>
                            </div>
                        </div>

                        {/* Assigned subjects */}
                        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {f.subjects.map(s => (
                                <div key={s.id} className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px' }}>
                                    {s.paper_id} — {s.name}
                                    <button onClick={() => handleUnassign(f.id, s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}><FiX size={12} /></button>
                                </div>
                            ))}
                            {f.subjects.length === 0 && <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-tertiary)' }}>No subjects assigned</span>}
                        </div>

                        {/* Assign dropdown */}
                        {showAssign === f.id && (
                            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                                <select className="form-select" style={{ flex: 1, maxWidth: 300 }} value={assignSubject} onChange={e => setAssignSubject(e.target.value)}>
                                    <option value="">Select subject...</option>
                                    {subjects.filter(s => !f.subjects.some(fs => fs.id === s.id)).map(s => (
                                        <option key={s.id} value={s.id}>{s.paper_id} — {s.name} ({s.program_name})</option>
                                    ))}
                                </select>
                                <button className="btn btn-primary btn-sm" onClick={() => handleAssign(f.id)}>Assign</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">{editing ? 'Edit Faculty' : 'Add Faculty'}</div>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password {editing ? '(leave blank to keep current)' : ''}</label>
                                <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} {...(editing ? {} : { required: true })} />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
