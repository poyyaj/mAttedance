import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiMail, FiLock, FiUser } from 'react-icons/fi';

export default function Login() {
    const [role, setRole] = useState('admin');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const credentials = role === 'admin' ? { username, password } : { email, password };
            const user = await login(role, credentials);
            navigate(user.role === 'admin' ? '/admin' : '/faculty');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <h1>📋 mAttedance</h1>
                    <p>MSc Attendance Management System</p>
                </div>

                <div className="login-tabs">
                    <button className={`login-tab ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')}>Admin</button>
                    <button className={`login-tab ${role === 'faculty' ? 'active' : ''}`} onClick={() => setRole('faculty')}>Faculty</button>
                </div>

                {error && (
                    <div style={{ padding: '10px 14px', background: 'var(--accent-danger-light)', color: 'var(--accent-danger)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: 'var(--font-sm)', fontWeight: 600 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {role === 'admin' ? (
                        <div className="form-group">
                            <label className="form-label"><FiUser style={{ marginRight: 6, verticalAlign: 'middle' }} /> Username</label>
                            <input className="form-input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter admin username" required />
                        </div>
                    ) : (
                        <div className="form-group">
                            <label className="form-label"><FiMail style={{ marginRight: 6, verticalAlign: 'middle' }} /> Email</label>
                            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter faculty email" required />
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label"><FiLock style={{ marginRight: 6, verticalAlign: 'middle' }} /> Password</label>
                        <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
                    </div>
                    <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
