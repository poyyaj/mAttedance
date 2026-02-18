import { useEffect, useRef, useState } from 'react';

export default function HalfCircleDotPlot({ data = [], title = "Today's Class Attendance Overview" }) {
    const svgRef = useRef(null);
    const [animated, setAnimated] = useState(false);
    const [classFilter, setClassFilter] = useState('');

    useEffect(() => {
        setAnimated(false);
        const timer = setTimeout(() => setAnimated(true), 100);
        return () => clearTimeout(timer);
    }, [data, classFilter]);

    // Get unique class types from data for the dropdown
    const classTypes = [...new Set(data.map(d => d.class_type).filter(Boolean))];

    // Filter data by selected class type
    const filteredData = classFilter
        ? data.filter(d => d.class_type === classFilter)
        : data;

    if (!data.length) {
        return (
            <div className="card dot-plot-container">
                <div className="dot-plot-title">👉 {title}</div>
                <div className="empty-state">
                    <p>No attendance data for today yet</p>
                </div>
            </div>
        );
    }

    const width = 500;
    const height = 300;
    const centerX = width / 2;
    const centerY = height - 30;
    const maxRadius = 220;
    const minRadius = 60;
    const dotRadius = 8;

    // Simple color: Present = green, Absent/Half-day = orange, Shortage = red
    const getColor = (item) => {
        if (item.overall_pct !== null && item.overall_pct < 75) return '#ef4444'; // Red — shortage
        if (item.status === 'Present') return '#10b981'; // Green
        if (item.status === 'Half-day') return '#f59e0b'; // Orange
        return '#f59e0b'; // Orange — absent
    };

    // Arrange dots in semicircle arcs
    const dots = [];
    const totalDots = filteredData.length;
    const rows = Math.ceil(Math.sqrt(totalDots / 2));
    let dotIndex = 0;

    for (let row = 0; row < rows && dotIndex < totalDots; row++) {
        const radius = minRadius + ((maxRadius - minRadius) * (row + 1)) / rows;
        const dotsInRow = Math.min(
            Math.floor((Math.PI * radius) / (dotRadius * 3)),
            totalDots - dotIndex
        );

        for (let i = 0; i < dotsInRow && dotIndex < totalDots; i++) {
            const angle = Math.PI - (Math.PI * (i + 1)) / (dotsInRow + 1);
            const x = centerX + radius * Math.cos(angle);
            const y = centerY - radius * Math.sin(angle);
            dots.push({
                x, y,
                color: getColor(filteredData[dotIndex]),
                student: filteredData[dotIndex],
                delay: dotIndex * 30,
            });
            dotIndex++;
        }
    }

    // Count present and absent
    const presentCount = filteredData.filter(d => d.status === 'Present').length;
    const absentCount = filteredData.filter(d => d.status === 'Absent').length;
    const halfDayCount = filteredData.filter(d => d.status === 'Half-day').length;

    return (
        <div className="card dot-plot-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div className="dot-plot-title" style={{ margin: 0 }}>👉 {title}</div>
                <select
                    className="form-select"
                    value={classFilter}
                    onChange={e => setClassFilter(e.target.value)}
                    style={{ minWidth: 160, maxWidth: 220 }}
                >
                    <option value="">All Class Types</option>
                    {classTypes.map(ct => (
                        <option key={ct} value={ct}>{ct}</option>
                    ))}
                </select>
            </div>

            {/* Counts */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <span style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: '#10b981' }}>{presentCount}</span>
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Present</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <span style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: '#f59e0b' }}>{absentCount}</span>
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Absent</span>
                </div>
                {halfDayCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <span style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: '#3b82f6' }}>{halfDayCount}</span>
                        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Half-day</span>
                    </div>
                )}
            </div>

            <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: 500, overflow: 'visible' }}>
                {/* Base arc */}
                <path
                    d={`M ${centerX - maxRadius - 10} ${centerY} A ${maxRadius + 10} ${maxRadius + 10} 0 0 1 ${centerX + maxRadius + 10} ${centerY}`}
                    fill="none"
                    stroke="var(--border-color)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.5"
                />
                {/* Dots */}
                {dots.map((dot, i) => (
                    <g key={i}>
                        <circle
                            cx={dot.x}
                            cy={dot.y}
                            r={animated ? dotRadius : 0}
                            fill={dot.color}
                            opacity={animated ? 0.9 : 0}
                            style={{
                                transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${dot.delay}ms`,
                                filter: `drop-shadow(0 2px 4px ${dot.color}44)`,
                                cursor: 'pointer',
                            }}
                        />
                        <title>{dot.student.name}: {dot.student.status}{dot.student.overall_pct != null ? ` (${dot.student.overall_pct}%)` : ''}</title>
                    </g>
                ))}
                {/* Center label */}
                <text x={centerX} y={centerY + 20} textAnchor="middle" style={{ fontSize: '12px', fill: 'var(--text-tertiary)', fontFamily: 'Inter' }}>
                    {totalDots} Students
                </text>
            </svg>
            <div className="dot-plot-legend">
                <div className="legend-item"><div className="legend-dot" style={{ background: '#10b981' }} /> Present</div>
                <div className="legend-item"><div className="legend-dot" style={{ background: '#f59e0b' }} /> Absent</div>
                <div className="legend-item"><div className="legend-dot" style={{ background: '#ef4444' }} /> Shortage Alert</div>
            </div>
        </div>
    );
}
