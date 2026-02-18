import { useState, useEffect, useRef } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUpload, FiDownload } from 'react-icons/fi';
import api from '../../utils/api';

export default function Students() {
    const [students, setStudents] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [search, setSearch] = useState('');
    const [filterProgram, setFilterProgram] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', reg_number: '', program_id: '', year: 1 });
    const [importResult, setImportResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const fileRef = useRef(null);

    const fetchData = async () => {
        const params = {};
        if (filterProgram) params.program_id = filterProgram;
        if (filterYear) params.year = filterYear;
        if (search) params.search = search;
        const [stuRes, progRes] = await Promise.all([api.get('/students', { params }), api.get('/programs')]);
        setStudents(stuRes.data);
        setPrograms(progRes.data);
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, [filterProgram, filterYear, search]);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editing) { await api.put(`/students/${editing.id}`, form); }
            else { await api.post('/students', form); }
            setShowModal(false); setEditing(null);
            setForm({ name: '', reg_number: '', program_id: '', year: 1 });
            fetchData();
        } catch (err) { alert(err.response?.data?.error || 'Error'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this student?')) return;
        await api.delete(`/students/${id}`);
        fetchData();
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/students/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setImportResult(res.data);
            fetchData();
        } catch (err) { alert(err.response?.data?.error || 'Import failed'); }
    };

    const openEdit = (s) => {
        setEditing(s);
        setForm({ name: s.name, reg_number: s.reg_number, program_id: s.program_id, year: s.year });
        setShowModal(true);
    };

    if (loading) return <div className="loading-spinner" />;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>🎓 Students</h2>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
                        <FiUpload /> Import CSV
                    </button>
                    <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', reg_number: '', program_id: programs[0]?.id || '', year: 1 }); setShowModal(true); }}>
                        <FiPlus /> Add Student
                    </button>
                </div>
            </div>

            <div className="filter-bar">
                <div className="search-box">
                    <FiSearch />
                    <input placeholder="Search by name or reg number..." value={search} onChange={e => setSearch(e.target.value)} />
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
                <span style={{ marginLeft: 'auto', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{students.length} student(s)</span>
            </div>

            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Reg Number</th>
                            <th>Program</th>
                            <th>Year</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((s, i) => (
                            <tr key={s.id}>
                                <td style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                                <td style={{ fontWeight: 600 }}>{s.name}</td>
                                <td><span className="badge badge-info">{s.reg_number}</span></td>
                                <td>{s.program_name}</td>
                                <td>Year {s.year === 1 ? 'I' : 'II'}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}><FiEdit2 /></button>
                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-danger)' }} onClick={() => handleDelete(s.id)}><FiTrash2 /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {students.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>No students found</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">{editing ? 'Edit Student' : 'Add Student'}</div>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Student Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Registration Number</label>
                                <input className="form-input" value={form.reg_number} onChange={e => setForm({ ...form, reg_number: e.target.value })} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Program</label>
                                    <select className="form-select" value={form.program_id} onChange={e => setForm({ ...form, program_id: e.target.value })} required>
                                        <option value="">Select</option>
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

            {/* Import Modal */}
            {showImport && (
                <div className="modal-overlay" onClick={() => { setShowImport(false); setImportResult(null); }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">📤 Import Students from CSV</div>
                            <button className="modal-close" onClick={() => { setShowImport(false); setImportResult(null); }}>✕</button>
                        </div>
                        <div className="upload-zone" onClick={() => fileRef.current?.click()}>
                            <FiUpload style={{ fontSize: '2.5rem', color: 'var(--accent-primary)', marginBottom: 12, display: 'block' }} />
                            <p style={{ fontWeight: 600, marginBottom: 4 }}>Click to upload CSV file</p>
                            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-tertiary)' }}>
                                Required columns: Name, Registration Number/ID<br />
                                Optional: Program, Year
                            </p>
                            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
                        </div>
                        {importResult && (
                            <div style={{ marginTop: 16, padding: 14, background: 'var(--accent-success-light)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-sm)' }}>
                                ✅ Imported: <strong>{importResult.imported}</strong> | Skipped: {importResult.skipped} | Total rows: {importResult.total}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
