import { useEffect, useRef, useState } from 'react';

export default function HalfCircleDotPlot({ data = [], title = "Today's Class Attendance Overview" }) {
    const svgRef = useRef(null);
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        setAnimated(false);
        const timer = setTimeout(() => setAnimated(true), 100);
        return () => clearTimeout(timer);
    }, [data]);

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

    // Color logic
    const getColor = (item) => {
        if (item.overall_pct !== null && item.overall_pct < 75) return '#ef4444'; // Red — shortage
        if (item.class_type === 'Seminar' || item.class_type === 'Project Presentation') return '#3b82f6'; // Blue
        if (item.status === 'Present') return '#10b981'; // Green
        return '#f59e0b'; // Orange — absent
    };

    // Arrange dots in semicircle arcs
    const dots = [];
    const totalDots = data.length;
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
                color: getColor(data[dotIndex]),
                student: data[dotIndex],
                delay: dotIndex * 30,
            });
            dotIndex++;
        }
    }

    return (
        <div className="card dot-plot-container">
            <div className="dot-plot-title">👉 {title}</div>
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
                <div className="legend-item"><div className="legend-dot" style={{ background: '#3b82f6' }} /> Seminar/Project</div>
                <div className="legend-item"><div className="legend-dot" style={{ background: '#ef4444' }} /> Shortage Alert</div>
            </div>
        </div>
    );
}
