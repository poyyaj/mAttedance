import { useState, useEffect } from 'react';
import { FiDownload, FiAlertTriangle, FiFilter } from 'react-icons/fi';
import api from '../../utils/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reports() {
    const [shortage, setShortage] = useState([]);
    const [predictive, setPredictive] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [filters, setFilters] = useState({ subject_id: '', program_id: '', month: '', threshold: 75 });
    const [activeTab, setActiveTab] = useState('shortage');
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        const [progRes, subRes] = await Promise.all([api.get('/programs'), api.get('/subjects')]);
        setPrograms(progRes.data);
        setSubjects(subRes.data);

        const params = {};
        if (filters.subject_id) params.subject_id = filters.subject_id;
        if (filters.program_id) params.program_id = filters.program_id;
        if (filters.month) params.month = filters.month;
        params.threshold = filters.threshold;

        const [shortRes, predRes] = await Promise.all([
            api.get('/reports/shortage', { params }),
            api.get('/reports/predictive', { params: { threshold: filters.threshold } })
        ]);
        setShortage(shortRes.data);
        setPredictive(predRes.data);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [filters]);

    const exportCSV = () => {
        const data = activeTab === 'shortage' ? shortage : predictive;
        let csv = 'Student Name,Reg Number,Program,Subject,Paper ID,Total Classes,Attended,Percentage\n';
        data.forEach(r => {
            csv += `"${r.name}",${r.reg_number},"${r.program_name}","${r.subject_name}",${r.paper_id},${r.total_classes},${r.attended || '-'},${r.current_pct || r.percentage}%\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${activeTab}_report.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(activeTab === 'shortage' ? 'Attendance Shortage Report' : 'Predictive Alert Report', 14, 22);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleDateString()} | Threshold: ${filters.threshold}%`, 14, 30);

        const data = activeTab === 'shortage' ? shortage : predictive;
        const headers = activeTab === 'shortage'
            ? [['Name', 'Reg No', 'Program', 'Subject', 'Classes', 'Attended', '%']]
            : [['Name', 'Reg No', 'Program', 'Subject', 'Current %', 'Projected %']];

        const rows = data.map(r => activeTab === 'shortage'
            ? [r.name, r.reg_number, r.program_name, r.subject_name, r.total_classes, Math.round(r.attended), `${r.percentage}%`]
            : [r.name, r.reg_number, r.program_name, r.subject_name, `${r.current_pct}%`, `${r.projected_pct_if_absent}%`]
        );

        autoTable(doc, {
            head: headers, body: rows, startY: 36,
            styles: { fontSize: 8, font: 'helvetica' },
            headStyles: { fillColor: [99, 102, 241] },
            alternateRowStyles: { fillColor: [248, 249, 251] },
        });
        doc.save(`${activeTab}_report.pdf`);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>📉 Reports</h2>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary" onClick={exportCSV}><FiDownload /> Export CSV</button>
                    <button className="btn btn-primary" onClick={exportPDF}><FiDownload /> Export PDF</button>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${activeTab === 'shortage' ? 'active' : ''}`} onClick={() => setActiveTab('shortage')}>
                    <FiAlertTriangle style={{ marginRight: 6 }} /> Shortage Report (&lt;{filters.threshold}%)
                </button>
                <button className={`tab ${activeTab === 'predictive' ? 'active' : ''}`} onClick={() => setActiveTab('predictive')}>
                    🔮 Predictive Alerts
                </button>
            </div>

            {/* Filters */}
            <div className="filter-bar">
                <FiFilter />
                <select className="form-select" value={filters.program_id} onChange={e => setFilters({ ...filters, program_id: e.target.value })}>
                    <option value="">All Programs</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className="form-select" value={filters.subject_id} onChange={e => setFilters({ ...filters, subject_id: e.target.value })}>
                    <option value="">All Subjects</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.paper_id} — {s.name}</option>)}
                </select>
                <input className="form-input" type="month" value={filters.month} onChange={e => setFilters({ ...filters, month: e.target.value })} style={{ maxWidth: 180 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, whiteSpace: 'nowrap' }}>Threshold:</label>
                    <input className="form-input" type="number" min="0" max="100" value={filters.threshold} onChange={e => setFilters({ ...filters, threshold: parseInt(e.target.value) || 75 })} style={{ width: 70 }} />
                    <span style={{ fontSize: 'var(--font-sm)' }}>%</span>
                </div>
            </div>

            {loading ? <div className="loading-spinner" /> : (
                <>
                    {activeTab === 'shortage' && (
                        <>
                            {shortage.length > 0 && (
                                <div style={{ padding: 14, background: 'var(--accent-danger-light)', borderRadius: 'var(--radius-md)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 'var(--font-sm)', color: 'var(--accent-danger)' }}>
                                    <FiAlertTriangle /> {shortage.length} student-subject record(s) below {filters.threshold}% attendance
                                </div>
                            )}
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Reg Number</th>
                                            <th>Program</th>
                                            <th>Subject</th>
                                            <th>Total Classes</th>
                                            <th>Attended</th>
                                            <th>Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shortage.map((r, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{r.name}</td>
                                                <td><span className="badge badge-info">{r.reg_number}</span></td>
                                                <td>{r.program_name}</td>
                                                <td>{r.paper_id} — {r.subject_name}</td>
                                                <td>{r.total_classes}</td>
                                                <td>{Math.round(r.attended)}</td>
                                                <td><span className={`badge ${r.percentage < 50 ? 'badge-danger' : 'badge-warning'}`}>{r.percentage}%</span></td>
                                            </tr>
                                        ))}
                                        {shortage.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>🎉 No shortage records found!</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {activeTab === 'predictive' && (
                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Reg Number</th>
                                        <th>Program</th>
                                        <th>Subject</th>
                                        <th>Current %</th>
                                        <th>Projected % (if absent 5 more)</th>
                                        <th>Risk</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {predictive.map((r, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{r.name}</td>
                                            <td><span className="badge badge-info">{r.reg_number}</span></td>
                                            <td>{r.program_name}</td>
                                            <td>{r.paper_id} — {r.subject_name}</td>
                                            <td><span className="badge badge-warning">{r.current_pct}%</span></td>
                                            <td><span className={`badge ${r.projected_pct_if_absent < 75 ? 'badge-danger' : 'badge-warning'}`}>{r.projected_pct_if_absent}%</span></td>
                                            <td>{r.projected_pct_if_absent < 75 ? '🔴 High' : '🟡 Medium'}</td>
                                        </tr>
                                    ))}
                                    {predictive.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>No predictive alerts</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
