import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import api from '../../utils/api';

export default function Subjects() {
    const [subjects, setSubjects] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [search, setSearch] = useState('');
    const [filterProgram, setFilterProgram] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ paper_id: '', name: '', program_id: '', year: 1 });
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        const [subRes, progRes] = await Promise.all([api.get('/subjects'), api.get('/programs')]);
        setSubjects(subRes.data);
        setPrograms(progRes.data);
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.put(`/subjects/${editing.id}`, form);
            } else {
                await api.post('/subjects', form);
            }
            setShowModal(false);
            setEditing(null);
            setForm({ paper_id: '', name: '', program_id: '', year: 1 });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Error saving subject');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this subject? This will also remove related attendance records.')) return;
        await api.delete(`/subjects/${id}`);
        fetchData();
    };

    const openEdit = (s) => {
        setEditing(s);
        setForm({ paper_id: s.paper_id, name: s.name, program_id: s.program_id, year: s.year });
        setShowModal(true);
    };

    const filtered = subjects.filter(s => {
        if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.paper_id.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterProgram && s.program_id !== parseInt(filterProgram)) return false;
        if (filterYear && s.year !== parseInt(filterYear)) return false;
        return true;
    });

    if (loading) return <div className="loading-spinner" />;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>📚 Subjects</h2>
                <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ paper_id: '', name: '', program_id: programs[0]?.id || '', year: 1 }); setShowModal(true); }}>
                    <FiPlus /> Add Subject
                </button>
            </div>

            <div className="filter-bar">
                <div className="search-box">
                    <FiSearch />
                    <input placeholder="Search subjects..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-select" value={filterProgram} onChange={e => setFilterProgram(e.target.value)}>
                    <option value="">All Programs</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className="form-select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                    <option value="">All Years</option>
                    <option value="1">Year I</option>
                    <option value="2">Year II</option>
                </select>
            </div>

            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Paper ID</th>
                            <th>Subject Name</th>
                            <th>Program</th>
                            <th>Year</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(s => (
                            <tr key={s.id}>
                                <td><span className="badge badge-primary">{s.paper_id}</span></td>
                                <td style={{ fontWeight: 600 }}>{s.name}</td>
                                <td>{s.program_name}</td>
                                <td>Year {s.year === 1 ? 'I' : 'II'}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}><FiEdit2 /></button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id)} style={{ color: 'var(--accent-danger)' }}><FiTrash2 /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>No subjects found</td></tr>}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">{editing ? 'Edit Subject' : 'Add Subject'}</div>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Paper ID</label>
                                <input className="form-input" value={form.paper_id} onChange={e => setForm({ ...form, paper_id: e.target.value })} placeholder="e.g. BMS101" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Subject Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Molecular Biology" required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Program</label>
                                    <select className="form-select" value={form.program_id} onChange={e => setForm({ ...form, program_id: e.target.value })} required>
                                        <option value="">Select Program</option>
                                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Year</label>
                                    <select className="form-select" value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })}>
                                        <option value={1}>Year I</option>
                                        <option value={2}>Year II</option>
                                    </select>
                                </div>
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
