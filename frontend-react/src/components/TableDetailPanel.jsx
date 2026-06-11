function TableDetailPanel({ selectedTable }) {
    if (!selectedTable) {
        return (
            <section className="table-detail-panel empty-detail">
                <h2>Selecciona una tabla</h2>
                <p>
                    Usa el explorador lateral para navegar por base, schema y tabla.
                    Aquí aparecerá el detalle de la tabla seleccionada.
                </p>
            </section>
        );
    }

    return (
        <section className="table-detail-panel">
            <div className="detail-header">
                <div>
                    <span>{selectedTable.database_label}</span>
                    <h2>{selectedTable.name}</h2>
                    <p>{selectedTable.full_name}</p>
                </div>

                {selectedTable.has_sensitive_data ? (
                    <mark>{selectedTable.sensitive_columns_count} columnas sensibles</mark>
                ) : (
                    <small>Sin alerta de sensibilidad</small>
                )}
            </div>

            <div className="detail-grid">
                <div>
                    <span>Base</span>
                    <strong>{selectedTable.database_label}</strong>
                </div>

                <div>
                    <span>Schema</span>
                    <strong>{selectedTable.schema}</strong>
                </div>

                <div>
                    <span>Ambiente</span>
                    <strong>{selectedTable.environment}</strong>
                </div>

                <div>
                    <span>Owner</span>
                    <strong>{selectedTable.owner}</strong>
                </div>

                <div>
                    <span>Área</span>
                    <strong>{selectedTable.business_area}</strong>
                </div>

                <div>
                    <span>SLA</span>
                    <strong>{selectedTable.sla_level}</strong>
                </div>
            </div>

            {selectedTable.sensitive_columns?.length > 0 && (
                <div className="sensitive-list">
                    <h3>Columnas sensibles detectadas</h3>

                    <div>
                        {selectedTable.sensitive_columns.map((column) => (
                            <span key={column}>{column}</span>
                        ))}
                    </div>
                </div>
            )}

            <div className="detail-placeholder">
                <h3>Siguiente bloque</h3>
                <p>
                    Aquí conectaremos columnas y vista previa limitada usando endpoints
                    protegidos del backend.
                </p>
            </div>
        </section>
    );
}

export default TableDetailPanel;