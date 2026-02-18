import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

export default function StatCard({ icon, label, value, trend, trendLabel, variant = 'primary' }) {
    return (
        <div className="stat-card">
            <div className={`stat-card-icon ${variant}`}>
                {icon}
            </div>
            <div className="stat-card-info">
                <div className="stat-card-label">{label}</div>
                <div className="stat-card-value">{value}</div>
                {trend !== undefined && (
                    <div className={`stat-card-trend ${trend >= 0 ? 'up' : 'down'}`}>
                        {trend >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                        {Math.abs(trend)}% {trendLabel || ''}
                    </div>
                )}
            </div>
        </div>
    );
}
