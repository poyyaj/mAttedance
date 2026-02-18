import { useMemo } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AttendanceHeatmap({ data = [], months = 6 }) {
    const heatmapData = useMemo(() => {
        const map = {};
        data.forEach(d => { map[d.date] = d; });

        const cells = [];
        const today = new Date();
        const start = new Date(today);
        start.setMonth(start.getMonth() - months);
        start.setDate(start.getDate() - start.getDay()); // Align to Sunday

        const current = new Date(start);
        while (current <= today) {
            const dateStr = current.toISOString().split('T')[0];
            const dayOfWeek = current.getDay();
            const weeksSinceStart = Math.floor((current - start) / (7 * 24 * 60 * 60 * 1000));

            cells.push({
                date: dateStr,
                dayOfWeek,
                week: weeksSinceStart,
                percentage: map[dateStr]?.percentage ?? null,
                total: map[dateStr]?.total ?? 0,
                month: current.getMonth(),
                isToday: dateStr === today.toISOString().split('T')[0],
            });
            current.setDate(current.getDate() + 1);
        }
        return cells;
    }, [data, months]);

    const getColor = (pct) => {
        if (pct === null) return 'var(--bg-tertiary)';
        if (pct >= 90) return '#10b981';
        if (pct >= 75) return '#34d399';
        if (pct >= 60) return '#fbbf24';
        if (pct >= 40) return '#f59e0b';
        return '#ef4444';
    };

    const totalWeeks = heatmapData.length > 0 ? heatmapData[heatmapData.length - 1].week + 1 : 0;

    // Month labels
    const monthLabels = [];
    let lastMonth = -1;
    heatmapData.forEach(cell => {
        if (cell.dayOfWeek === 0 && cell.month !== lastMonth) {
            monthLabels.push({ week: cell.week, label: MONTHS[cell.month] });
            lastMonth = cell.month;
        }
    });

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-title">📅 Attendance Heatmap</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
                {/* Month labels */}
                <div style={{ display: 'flex', marginBottom: 4, marginLeft: 36 }}>
                    {monthLabels.map((m, i) => (
                        <div key={i} className="heatmap-label" style={{ position: 'relative', left: m.week * 17 - (i > 0 ? monthLabels[i - 1].week * 17 + 30 : 0), width: 30 }}>
                            {m.label}
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    {/* Day labels */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 4 }}>
                        {DAYS.map((d, i) => (
                            <div key={i} className="heatmap-label" style={{ height: 14, lineHeight: '14px', width: 28 }}>{i % 2 === 1 ? d : ''}</div>
                        ))}
                    </div>
                    {/* Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${totalWeeks}, 14px)`, gridTemplateRows: 'repeat(7, 14px)', gap: 3 }}>
                        {heatmapData.map((cell, i) => (
                            <div
                                key={i}
                                className="heatmap-cell"
                                style={{
                                    gridColumn: cell.week + 1,
                                    gridRow: cell.dayOfWeek + 1,
                                    background: getColor(cell.percentage),
                                    opacity: cell.total === 0 ? 0.3 : 1,
                                    outline: cell.isToday ? '2px solid var(--accent-primary)' : 'none',
                                    outlineOffset: 1,
                                }}
                                title={`${cell.date}: ${cell.percentage !== null ? cell.percentage + '%' : 'No data'} (${cell.total} records)`}
                            />
                        ))}
                    </div>
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, justifyContent: 'flex-end', fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                    Less
                    {[0, 40, 60, 75, 90].map(pct => (
                        <div key={pct} style={{ width: 12, height: 12, borderRadius: 2, background: getColor(pct === 0 ? 30 : pct) }} />
                    ))}
                    More
                </div>
            </div>
        </div>
    );
}
