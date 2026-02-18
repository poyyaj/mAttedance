import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminSubjects from './pages/admin/Subjects';
import AdminStudents from './pages/admin/Students';
import AdminFaculty from './pages/admin/Faculty';
import AdminReports from './pages/admin/Reports';
import FacultyDashboard from './pages/faculty/Dashboard';
import MarkAttendance from './pages/faculty/MarkAttendance';
import AttendanceHistory from './pages/faculty/AttendanceHistory';

function ProtectedRoute({ children, role }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-spinner" />;
    if (!user) return <Navigate to="/login" />;
    if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/faculty'} />;
    return children;
}

export default function App() {
    const { user, loading } = useAuth();

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="loading-spinner" /></div>;

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/faculty'} /> : <Login />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><Layout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="subjects" element={<AdminSubjects />} />
                <Route path="students" element={<AdminStudents />} />
                <Route path="faculty" element={<AdminFaculty />} />
                <Route path="reports" element={<AdminReports />} />
            </Route>

            {/* Faculty Routes */}
            <Route path="/faculty" element={<ProtectedRoute role="faculty"><Layout /></ProtectedRoute>}>
                <Route index element={<FacultyDashboard />} />
                <Route path="mark" element={<MarkAttendance />} />
                <Route path="history" element={<AttendanceHistory />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    );
}
