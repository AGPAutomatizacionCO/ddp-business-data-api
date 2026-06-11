function StatCard({ label, value }) {
    return (
        <div className="status-card">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

export default StatCard;