function TableSearchPanel({
    databases,
    selectedDatabaseId,
    searchTerm,
    filteredTables,
    onDatabaseChange,
    onSearchChange,
    onSelectTable,
    selectedTableKey,
}) {
    return (
        <section className="data-section">
            <div className="section-header">
                <div>
                    <h2>Búsqueda cruzada por metadata</h2>
                    <p>
                        Busca por base, schema, tabla o columnas sensibles detectadas.
                    </p>
                </div>
            </div>

            <div className="search-row">
                <input
                    className="search-input"
                    value={searchTerm}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Buscar tabla, schema, base, customer, invoice, order..."
                />

                <select
                    className="database-select"
                    value={selectedDatabaseId}
                    onChange={(event) => onDatabaseChange(event.target.value)}
                >
                    <option value="all">Todas las bases</option>

                    {databases.map((database) => (
                        <option key={database.id} value={database.id}>
                            {database.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="table-results">
                <div className="table-results-header">
                    <span>Base</span>
                    <span>Schema</span>
                    <span>Tabla</span>
                    <span>Sensibilidad</span>
                </div>

                {filteredTables.slice(0, 80).map((table) => (
                    <button
                        className={
                            selectedTableKey === table.row_key
                                ? "table-result-row selected"
                                : "table-result-row"
                        }
                        key={table.row_key}
                        onClick={() => onSelectTable(table)}
                    >
                        <span>{table.database_label}</span>
                        <span>{table.schema}</span>
                        <strong>{table.name}</strong>
                        <span>
                            {table.has_sensitive_data ? (
                                <mark>{table.sensitive_columns_count} sensible</mark>
                            ) : (
                                "Sin alerta"
                            )}
                        </span>
                    </button>
                ))}

                {filteredTables.length > 80 && (
                    <div className="result-limit-warning">
                        Mostrando 80 de {filteredTables.length} resultados.
                        Refina la búsqueda para reducir resultados.
                    </div>
                )}

                {filteredTables.length === 0 && (
                    <div className="empty-state">
                        No hay resultados para la búsqueda actual.
                    </div>
                )}
            </div>
        </section>
    );
}

export default TableSearchPanel;