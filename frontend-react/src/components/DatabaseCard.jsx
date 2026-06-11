function DatabaseCard({ database, summary }) {
    return (
        <article className="database-mini-card">
            <span>{database.environment}</span>
            <strong>{database.label}</strong>
            <small>{database.business_area}</small>
            <small>Owner: {database.owner}</small>
            <small>Sensibilidad: {database.sensitivity_level}</small>
            <small>SLA: {database.sla_level}</small>
            <small>Tablas: {summary?.summary?.total_tables ?? "-"}</small>
        </article>
    );
}

export default DatabaseCard;