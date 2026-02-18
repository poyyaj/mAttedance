import { useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { FiUsers, FiBook, FiUserCheck, FiAlertTriangle, FiCheckCircle, FiActivity, FiRefreshCw } from 'react-icons/fi';
import api from '../../utils/api';
import StatCard from '../../components/StatCard';
import HalfCircleDotPlot from '../../components/HalfCircleDotPlot';
import AttendanceHeatmap from '../../components/AttendanceHeatmap';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function AdminDashboard() {
    const [summary, setSummary] = useState(null);
    const [todayData, setTodayData] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [subjectData, setSubjectData] = useState([]);
    const [classTypeData, setClassTypeData] = useState([]);
    const [heatmapData, setHeatmapData] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(() => {
        Promise.all([
            api.get('/dashboard/summary'),
            api.get('/dashboard/today'),
            api.get('/reports/monthly'),
            api.get('/reports/subject-comparison'),
            api.get('/reports/class-type-distribution'),
            api.get('/dashboard/heatmap'),
        ]).then(([sum, today, monthly, subjects, classTypes, heatmap]) => {
            setSummary(sum.data);
            setTodayData(today.data);
            setMonthlyData(monthly.data);
            setSubjectData(subjects.data);
            setClassTypeData(classTypes.data);
            setHeatmapData(heatmap.data);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
        // Refresh when tab regains focus
        const onFocus = () => fetchData();
        window.addEventListener('focus', onFocus);
        return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
    }, [fetchData]);

    if (loading) return <div className="loading-spinner" />;

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const monthlyChartData = {
        labels: monthlyData.map(d => {
            const [y, m] = d.month.split('-');
            return monthLabels[parseInt(m) - 1] + ' ' + y.slice(2);
        }),
        datasets: [{
            label: 'Attendance %',
            data: monthlyData.map(d => d.percentage),
            backgroundColor: monthlyData.map(d => d.percentage >= 75 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
            borderRadius: 8,
            borderSkipped: false,
        }]
    };

    const subjectChartData = {
        labels: subjectData.map(d => d.paper_id),
        datasets: [{
            label: 'Attendance %',
            data: subjectData.map(d => d.percentage),
            backgroundColor: subjectData.map(d => {
                if (d.percentage >= 85) return 'rgba(99, 102, 241, 0.8)';
                if (d.percentage >= 75) return 'rgba(6, 182, 212, 0.8)';
                return 'rgba(239, 68, 68, 0.8)';
            }),
            borderRadius: 8,
            borderSkipped: false,
        }]
    };

    const classTypeChartData = {
        labels: classTypeData.map(d => d.class_type),
        datasets: [{
            label: 'Sessions',
            data: classTypeData.map(d => d.sessions),
            backgroundColor: ['rgba(99, 102, 241, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(245, 158, 11, 0.8)'],
            borderRadius: 8,
            borderSkipped: false,
        }, {
            label: 'Attendance %',
            data: classTypeData.map(d => d.attendance_pct),
            backgroundColor: ['rgba(99, 102, 241, 0.4)', 'rgba(16, 185, 129, 0.4)', 'rgba(59, 130, 246, 0.4)', 'rgba(245, 158, 11, 0.4)'],
            borderRadius: 8,
            borderSkipped: false,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                padding: 12,
                cornerRadius: 8,
                titleFont: { family: 'Inter', weight: '600' },
                bodyFont: { family: 'Inter' },
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' }
            },
            x: {
                grid: { display: false },
                ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' }
            }
        }
    };

    const stackedOptions = {
        ...chartOptions,
        plugins: { ...chartOptions.plugins, legend: { display: true, labels: { font: { family: 'Inter' }, usePointStyle: true, pointStyle: 'rectRounded' } } },
        scales: { ...chartOptions.scales, x: { ...chartOptions.scales.x, stacked: true }, y: { ...chartOptions.scales.y, stacked: false, max: undefined } }
    };

    return (
        <div>
            {/* Stat Cards */}
            <div className="stat-cards">
                <StatCard icon={<FiUsers />} label="Total Students" value={summary?.totalStudents || 0} variant="primary" />
                <StatCard icon={<FiBook />} label="Total Subjects" value={summary?.totalSubjects || 0} variant="info" />
                <StatCard icon={<FiUserCheck />} label="Total Faculty" value={summary?.totalFaculty || 0} variant="success" />
                <StatCard icon={<FiCheckCircle />} label="Overall Attendance" value={`${summary?.overallAttendance || 0}%`} variant={summary?.overallAttendance >= 75 ? 'success' : 'danger'} />
                <StatCard icon={<FiAlertTriangle />} label="Shortage Alerts" value={summary?.shortageCount || 0} variant="danger" />
                <StatCard icon={<FiActivity />} label="Today's Sessions" value={summary?.today?.sessions || 0} variant="warning" />
            </div>

            {/* Half-circle dot plot */}
            <HalfCircleDotPlot data={todayData} />

            <div style={{ height: 24 }} />

            {/* Charts Grid */}
            <div className="grid-2">
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">📊 Monthly Attendance Trend</div>
                    </div>
                    <div className="chart-container">
                        <Bar data={monthlyChartData} options={chartOptions} />
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <div className="card-title">📈 Subject-wise Comparison</div>
                    </div>
                    <div className="chart-container">
                        <Bar data={subjectChartData} options={chartOptions} />
                    </div>
                </div>
            </div>

            <div style={{ height: 24 }} />

            <div className="grid-2">
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">📋 Theory vs Practical vs Seminar</div>
                    </div>
                    <div className="chart-container">
                        <Bar data={classTypeChartData} options={stackedOptions} />
                    </div>
                </div>

                <AttendanceHeatmap data={heatmapData} months={4} />
            </div>
        </div>
    );
}
