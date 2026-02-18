import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiLayers } from 'react-icons/fi';
import api from '../../utils/api';

export default function Programs() {
    const [programs, setPrograms] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', description: '' });
    const [loading, setLoading] = useState(true);

    const fetchPrograms = async () => {
        try {
            const res = await api.get('/programs');
            setPrograms(res.data);
        } catch (err) {
            console.error('Error fetching programs:', err);
        }
        setLoading(false);
    };

    useEffect(() => { fetchPrograms(); }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.put(`/programs/${editing.id}`, form);
            } else {
                await api.post('/programs', form);
            }
            setShowModal(false);
            setEditing(null);
            setForm({ name: '', description: '' });
            fetchPrograms();
        } catch (err) {
            alert(err.response?.data?.error || 'Error saving program');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this program? This will also remove related subjects and students.')) return;
        try {
            await api.delete(`/programs/${id}`);
            fetchPrograms();
        } catch (err) {
            alert(err.response?.data?.error || 'Error deleting program');
        }
    };

    const openEdit = (p) => {
        setEditing(p);
        setForm({ name: p.name, description: p.description || '' });
        setShowModal(true);
    };

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', description: '' });
        setShowModal(true);
    };

    const filtered = programs.filter(p =>
        !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="loading-spinner" />;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>🎓 Programs</h2>
                <button className="btn btn-primary" onClick={openAdd}>
                    <FiPlus /> Add Program
                </button>
            </div>

            <div className="filter-bar">
                <div className="search-box">
                    <FiSearch />
                    <input placeholder="Search programs..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Program Name</th>
                            <th>Description</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((p, idx) => (
                            <tr key={p.id}>
                                <td>{idx + 1}</td>
                                <td style={{ fontWeight: 600 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <FiLayers style={{ color: 'var(--accent-primary)' }} />
                                        {p.name}
                                    </div>
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>{p.description || '—'}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><FiEdit2 /></button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id)} style={{ color: 'var(--accent-danger)' }}><FiTrash2 /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
                                    No programs found. Click "Add Program" to create one.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">{editing ? 'Edit Program' : 'Add Program'}</div>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Program Name</label>
                                <input
                                    className="form-input"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. Biomedical Science"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description (optional)</label>
                                <input
                                    className="form-input"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="e.g. Master of Science in Biomedical Science"
                                />
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
