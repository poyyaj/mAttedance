import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FiHome, FiBook, FiUsers, FiUserCheck, FiBarChart2, FiLogOut, FiSun, FiMoon, FiMenu, FiX, FiEdit, FiClock } from 'react-icons/fi';

export default function Layout() {
    const { user, logout, isAdmin } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => { logout(); navigate('/login'); };

    const adminNav = [
        { to: '/admin', icon: <FiHome />, label: 'Dashboard', end: true },
        { to: '/admin/subjects', icon: <FiBook />, label: 'Subjects' },
        { to: '/admin/students', icon: <FiUsers />, label: 'Students' },
        { to: '/admin/faculty', icon: <FiUserCheck />, label: 'Faculty' },
        { to: '/admin/reports', icon: <FiBarChart2 />, label: 'Reports' },
    ];

    const facultyNav = [
        { to: '/faculty', icon: <FiHome />, label: 'Dashboard', end: true },
        { to: '/faculty/mark', icon: <FiEdit />, label: 'Mark Attendance' },
        { to: '/faculty/history', icon: <FiClock />, label: 'History' },
    ];

    const navItems = isAdmin ? adminNav : facultyNav;

    return (
        <div className="app-layout">
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        📋 <span>mAttedance</span>
                    </div>
                    <div className="sidebar-role">{user?.role} Panel</div>
                </div>
                <nav className="sidebar-nav">
                    <div className="nav-section-title">Navigation</div>
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            {item.icon}
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <button className="nav-item" onClick={handleLogout} style={{ width: '100%', border: 'none', background: 'none', fontFamily: 'inherit' }}>
                        <FiLogOut /> Sign Out
                    </button>
                </div>
            </aside>

            <div className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            {sidebarOpen ? <FiX /> : <FiMenu />}
                        </button>
                        <div className="topbar-title">
                            {isAdmin ? 'Admin Dashboard' : `Welcome, ${user?.name || 'Faculty'}`}
                        </div>
                    </div>
                    <div className="topbar-right">
                        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
                            {theme === 'light' ? <FiMoon /> : <FiSun />}
                        </button>
                    </div>
                </header>
                <div className="page-content">
                    <Outlet />
                </div>
            </div>

            {sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }} onClick={() => setSidebarOpen(false)} />}
        </div>
    );
}
