import { useState, useEffect } from 'react';
import { FiCheck, FiSend, FiUsers, FiCalendar } from 'react-icons/fi';
import api from '../../utils/api';

export default function MarkAttendance() {
    const [programs, setPrograms] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedProgram, setSelectedProgram] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [classType, setClassType] = useState('Theory');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
    const [remarks, setRemarks] = useState('');
    const [attendance, setAttendance] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [step, setStep] = useState(1);

    useEffect(() => {
        api.get('/programs').then(r => setPrograms(r.data));
        api.get('/subjects').then(r => setSubjects(r.data));
    }, []);

    const filteredSubjects = subjects.filter(s =>
        (!selectedProgram || s.program_id === parseInt(selectedProgram)) &&
        (!selectedYear || s.year === parseInt(selectedYear))
    );

    const loadStudents = async () => {
        if (!selectedProgram || !selectedSubject) return;
        const subject = subjects.find(s => s.id === parseInt(selectedSubject));
        const res = await api.get('/students', { params: { program_id: selectedProgram, year: subject?.year || selectedYear } });
        setStudents(res.data);
        const initial = {};
        res.data.forEach(s => { initial[s.id] = 'Present'; });
        setAttendance(initial);
        setStep(2);
    };

    const toggleStatus = (studentId) => {
        setAttendance(prev => {
            const current = prev[studentId];
            const next = current === 'Present' ? 'Absent' : current === 'Absent' ? 'Half-day' : 'Present';
            return { ...prev, [studentId]: next };
        });
    };

    const markAll = (status) => {
        const updated = {};
        students.forEach(s => { updated[s.id] = status; });
        setAttendance(updated);
    };

    const handleSubmit = async () => {
        const subject = subjects.find(s => s.id === parseInt(selectedSubject));
        if (!subject) return;
        setSubmitting(true);
        try {
            const records = students.map(s => ({
                student_id: s.id,
                status: attendance[s.id] || 'Present',
                remarks: '',
            }));
            await api.post('/attendance', {
                subject_id: subject.id,
                paper_id: subject.paper_id,
                date, time, class_type: classType,
                records, remarks,
            });
            setSubmitted(true);
        } catch (err) {
            alert(err.response?.data?.error || 'Error submitting');
        } finally {
            setSubmitting(false);
        }
    };

    const presentCount = Object.values(attendance).filter(v => v === 'Present').length;
    const absentCount = Object.values(attendance).filter(v => v === 'Absent').length;
    const halfDayCount = Object.values(attendance).filter(v => v === 'Half-day').length;

    if (submitted) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                <FiCheck style={{ fontSize: 60, color: 'var(--accent-success)', marginBottom: 16 }} />
                <h2 style={{ marginBottom: 8 }}>Attendance Submitted!</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                    {presentCount} Present • {absentCount} Absent • {halfDayCount} Half-day
                </p>
                <button className="btn btn-primary" onClick={() => { setSubmitted(false); setStep(1); setStudents([]); setAttendance({}); }}>
                    Mark Another Session
                </button>
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, marginBottom: 24 }}>✏️ Mark Attendance</h2>

            {/* Step 1: Select Class */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <div className="card-title">
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: step >= 1 ? 'var(--accent-primary)' : 'var(--border-color)', color: '#fff', fontSize: 'var(--font-sm)', fontWeight: 700, marginRight: 10 }}>1</span>
                        Select Class Details
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Program</label>
                        <select className="form-select" value={selectedProgram} onChange={e => { setSelectedProgram(e.target.value); setSelectedSubject(''); }}>
                            <option value="">Select Program</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Year</label>
                        <select className="form-select" value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setSelectedSubject(''); }}>
                            <option value="">Select Year</option>
                            <option value="1">Year I</option>
                            <option value="2">Year II</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Subject</label>
                        <select className="form-select" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                            <option value="">Select Subject</option>
                            {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.paper_id} — {s.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Class Type</label>
                        <select className="form-select" value={classType} onChange={e => setClassType(e.target.value)}>
                            <option>Theory</option>
                            <option>Practical</option>
                            <option>Seminar</option>
                            <option>Project Presentation</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label"><FiCalendar style={{ marginRight: 4 }} /> Date</label>
                        <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Time</label>
                        <input className="form-input" type="time" value={time} onChange={e => setTime(e.target.value)} />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Session Remarks (optional)</label>
                    <textarea className="form-textarea" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any notes about this session..." rows={2} />
                </div>
                <button className="btn btn-primary" onClick={loadStudents} disabled={!selectedProgram || !selectedSubject}>
                    <FiUsers /> Load Students
                </button>
            </div>

            {/* Step 2: Mark Attendance */}
            {step >= 2 && students.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', fontSize: 'var(--font-sm)', fontWeight: 700, marginRight: 10 }}>2</span>
                            Mark Attendance ({students.length} students)
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-sm btn-success" onClick={() => markAll('Present')}>All Present</button>
                            <button className="btn btn-sm btn-danger" onClick={() => markAll('Absent')}>All Absent</button>
                        </div>
                    </div>

                    {/* Summary bar */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 20, padding: 14, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: 'var(--font-sm)' }}>✅ Present: <strong style={{ color: 'var(--accent-success)' }}>{presentCount}</strong></div>
                        <div style={{ fontSize: 'var(--font-sm)' }}>❌ Absent: <strong style={{ color: 'var(--accent-danger)' }}>{absentCount}</strong></div>
                        <div style={{ fontSize: 'var(--font-sm)' }}>⏸️ Half-day: <strong style={{ color: 'var(--accent-warning)' }}>{halfDayCount}</strong></div>
                    </div>

                    {/* Student List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {students.map((s, i) => (
                            <div key={s.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                                borderLeft: `4px solid ${attendance[s.id] === 'Present' ? 'var(--accent-success)' : attendance[s.id] === 'Absent' ? 'var(--accent-danger)' : 'var(--accent-warning)'}`,
                                animation: `slideUp 0.3s ease ${i * 30}ms both`
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)', width: 24 }}>{i + 1}</span>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-base)' }}>{s.name}</div>
                                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{s.reg_number}</div>
                                    </div>
                                </div>
                                <div className="attendance-toggle">
                                    <button className={attendance[s.id] === 'Present' ? 'present' : ''} onClick={() => setAttendance(prev => ({ ...prev, [s.id]: 'Present' }))}>P</button>
                                    <button className={attendance[s.id] === 'Absent' ? 'absent' : ''} onClick={() => setAttendance(prev => ({ ...prev, [s.id]: 'Absent' }))}>A</button>
                                    <button className={attendance[s.id] === 'Half-day' ? 'half-day' : ''} onClick={() => setAttendance(prev => ({ ...prev, [s.id]: 'Half-day' }))}>H</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting}>
                            <FiSend /> {submitting ? 'Submitting...' : 'Submit Attendance'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
