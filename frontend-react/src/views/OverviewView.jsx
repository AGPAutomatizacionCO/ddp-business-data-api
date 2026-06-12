function getInitials(value) {
    if (!value) {
        return "U";
    }

    return value
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();
}

function countUniqueSchemasByDatabase(tables) {
    return new Set(
        tables.map((table) => `${table.database_id}.${table.schema}`)
    ).size;
}

function OverviewView({
    user,
    databases,
    databaseSummaries,
    allTables,
    dashboardStatus,
    dashboardError,
    onOpenExplorer,
    onRefreshCatalog,
}) {
    const totalDatabases = databases.length;
    const totalTables = allTables.length;
    const totalSchemas = countUniqueSchemasByDatabase(allTables);

    const totalSensitiveTables = allTables.filter(
        (table) => table.has_sensitive_data
    ).length;

    const connectedDatabases = databases.filter(
        (database) => database.configuration_status !== "error"
    ).length;

    const errorDatabases = totalDatabases - connectedDatabases;

    return (
        <main className="roadmap-view">
            <section className="roadmap-hero">
                <div>
                    <span className="roadmap-eyebrow">
                        Resumen ejecutivo
                    </span>

                    <h1>DDP Data Explorer</h1>

                    <p>
                        Herramienta interna para exploración controlada de bases,
                        esquemas y tablas, con autenticación corporativa,
                        auditoría, roles y trazabilidad por recurso.
                    </p>
                </div>

                <div className="roadmap-user-card">
                    <div className="drawer-avatar large">
                        {getInitials(user?.name || user?.username)}
                    </div>

                    <div>
                        <span>Usuario autenticado</span>
                        <strong>{user?.name || user?.username}</strong>
                        <small>{user?.role || "Sin rol"}</small>
                    </div>
                </div>
            </section>

            {dashboardError && (
                <div className="error-box">
                    {dashboardError}
                </div>
            )}

            <section className="roadmap-kpi-grid">
                <div>
                    <span>Bases conectadas</span>
                    <strong>{connectedDatabases}</strong>
                    <small>{errorDatabases} con error de configuración</small>
                </div>

                <div>
                    <span>Esquemas detectados</span>
                    <strong>{totalSchemas}</strong>
                    <small>Conteo por fuente y esquema</small>
                </div>

                <div>
                    <span>Tablas indexadas</span>
                    <strong>{totalTables}</strong>
                    <small>Catálogo técnico disponible</small>
                </div>

                <div>
                    <span>Tablas sensibles</span>
                    <strong>{totalSensitiveTables}</strong>
                    <small>Con columnas marcadas para control</small>
                </div>
            </section>

            <section className="roadmap-next-panel">
                <div>
                    <span>Próximo paso recomendado</span>
                    <h2>Cerrar flujo de consulta guiada y auditoría enriquecida</h2>
                    <p>
                        El siguiente hito es fortalecer la vista previa por tabla,
                        registrar explícitamente cada acceso por base, esquema
                        y tabla, y preparar el módulo visual de auditoría.
                    </p>
                </div>

                <div className="roadmap-actions">
                    <button
                        type="button"
                        className="primary-button"
                        onClick={onOpenExplorer}
                    >
                        Ir a vista guiada
                    </button>

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={onRefreshCatalog}
                    >
                        Actualizar catálogo
                    </button>
                </div>
            </section>

            <section className="source-summary-table">
                <div className="source-summary-header">
                    <h2>Fuentes disponibles</h2>
                    <p>{dashboardStatus}</p>
                </div>

                <div className="source-list">
                    {databases.map((database) => {
                        const tablesForDatabase = allTables.filter(
                            (table) => table.database_id === database.id
                        );

                        const schemaCount = new Set(
                            tablesForDatabase.map((table) => table.schema)
                        ).size;

                        const tableCount = tablesForDatabase.length;

                        return (
                            <div
                                className="source-row"
                                key={database.id}
                            >
                                <div>
                                    <strong>{database.label}</strong>
                                    <span>
                                        {database.database || database.name} ·{" "}
                                        {database.environment || "sin ambiente"}
                                    </span>
                                </div>

                                <small>
                                    {schemaCount} esquemas · Owner:{" "}
                                    {database.owner || "No definido"}
                                </small>

                                <mark>
                                    {tableCount} tablas
                                </mark>
                            </div>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}

export default OverviewView;