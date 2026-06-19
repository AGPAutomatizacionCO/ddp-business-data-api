function getTablesForDatabase(allTables, databaseId) {
    return allTables.filter((item) => item.database_id === databaseId);
}

function getSchemaCount(items) {
    return new Set(items.map((item) => item.schema)).size;
}

function getObjectCountByType(items, type) {
    return items.filter((item) => item.type === type).length;
}

function SourcesView({
    databases = [],
    databaseSummaries = {},
    allTables = [],
    dashboardStatus,
    dashboardError,
    onRefreshCatalog,
}) {
    const totalSources = databases.length;
    const totalObjects = allTables.length;

    const totalSchemas = new Set(
        allTables.map((item) => `${item.database_id}.${item.schema}`)
    ).size;

    const totalSensitiveObjects = allTables.filter(
        (item) => item.has_sensitive_data
    ).length;

    return (
        <main className="admin-page">
            <section className="admin-hero">
                <div className="admin-kicker">Fuentes / configuración</div>

                <h1 className="admin-title">Catálogo de fuentes conectadas</h1>

                <p className="admin-description">
                    Vista de gobierno para revisar las bases configuradas,
                    nombres funcionales, nombres reales, owners, ambientes,
                    niveles de sensibilidad y estado general del catálogo.
                </p>
            </section>

            <section className="admin-toolbar">
                <div className="admin-toolbar-info">
                    <strong>Estado del catálogo</strong>
                    <span>{dashboardStatus || "Catálogo cargado."}</span>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={onRefreshCatalog}
                >
                    Actualizar catálogo
                </button>
            </section>

            {dashboardError && (
                <section className="admin-section">
                    <div className="error-box">{dashboardError}</div>
                </section>
            )}

            <section className="admin-kpi-grid">
                <article className="admin-kpi-card">
                    <span>Fuentes</span>
                    <strong>{totalSources}</strong>
                    <p>Bases configuradas en el backend.</p>
                </article>

                <article className="admin-kpi-card">
                    <span>Esquemas</span>
                    <strong>{totalSchemas}</strong>
                    <p>Conteo global por base y schema.</p>
                </article>

                <article className="admin-kpi-card">
                    <span>Objetos</span>
                    <strong>{totalObjects}</strong>
                    <p>Tablas, vistas, lógica y restricciones.</p>
                </article>

                <article className="admin-kpi-card">
                    <span>Sensibles</span>
                    <strong>{totalSensitiveObjects}</strong>
                    <p>Objetos con columnas marcadas.</p>
                </article>
            </section>

            <section className="admin-section">
                <div className="admin-section-header">
                    <div>
                        <h2>Fuentes configuradas</h2>
                        <p>
                            Diferencia entre nombre funcional visible y nombre
                            real de base de datos.
                        </p>
                    </div>
                </div>

                <div className="admin-grid">
                    {databases.map((database) => {
                        const items = getTablesForDatabase(allTables, database.id);
                        const summary = databaseSummaries[database.id];

                        const schemaCount = getSchemaCount(items);
                        const tableCount = getObjectCountByType(items, "TABLE");
                        const viewCount = getObjectCountByType(items, "VIEW");
                        const procedureCount = getObjectCountByType(
                            items,
                            "PROCEDURE"
                        );
                        const constraintCount = getObjectCountByType(
                            items,
                            "CONSTRAINT"
                        );

                        const hasError =
                            database.configuration_status === "error" ||
                            summary?.database?.status === "error" ||
                            summary?.database?.status === "configuration_error";

                        return (
                            <article className="admin-card" key={database.id}>
                                <strong>{database.label}</strong>

                                <span>
                                    Base real:{" "}
                                    <b>{database.database || database.name || "-"}</b>
                                </span>

                                <span>
                                    Ambiente:{" "}
                                    <b>{database.environment || "No definido"}</b>
                                </span>

                                <span>
                                    Owner: <b>{database.owner || "Not defined"}</b>
                                </span>

                                <div className="admin-chip-row">
                                    <span
                                        className={
                                            hasError
                                                ? "admin-chip warning"
                                                : "admin-chip success"
                                        }
                                    >
                                        {hasError ? "Revisar" : "OK"}
                                    </span>

                                    <span className="admin-chip">
                                        {schemaCount} schemas
                                    </span>

                                    <span className="admin-chip">
                                        {items.length} objetos
                                    </span>
                                </div>

                                <div className="admin-chip-row">
                                    <span className="admin-chip">
                                        {tableCount} tablas
                                    </span>

                                    <span className="admin-chip">
                                        {viewCount} vistas
                                    </span>

                                    <span className="admin-chip">
                                        {procedureCount} procedimientos
                                    </span>

                                    <span className="admin-chip">
                                        {constraintCount} restricciones
                                    </span>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="admin-section">
                <div className="admin-section-header">
                    <div>
                        <h2>Detalle técnico por fuente</h2>
                        <p>
                            Vista consolidada para validar configuración antes de
                            documentación semántica o agentes IA.
                        </p>
                    </div>
                </div>

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Label funcional</th>
                                <th>Base real</th>
                                <th>Ambiente</th>
                                <th>Owner</th>
                                <th>Sensibilidad</th>
                                <th>SLA</th>
                                <th>Objetos</th>
                            </tr>
                        </thead>

                        <tbody>
                            {databases.map((database) => {
                                const items = getTablesForDatabase(
                                    allTables,
                                    database.id
                                );

                                return (
                                    <tr key={database.id}>
                                        <td>{database.id}</td>
                                        <td>{database.label}</td>
                                        <td>
                                            {database.database ||
                                                database.name ||
                                                "-"}
                                        </td>
                                        <td>{database.environment || "-"}</td>
                                        <td>{database.owner || "Not defined"}</td>
                                        <td>
                                            {database.sensitivity_level || "-"}
                                        </td>
                                        <td>{database.sla_level || "-"}</td>
                                        <td>{items.length}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="admin-section">
                <div className="admin-warning-box">
                    Esta vista no muestra credenciales ni secretos. La
                    configuración sensible debe permanecer exclusivamente en el
                    backend y en variables de entorno protegidas.
                </div>
            </section>
        </main>
    );
}

export default SourcesView;