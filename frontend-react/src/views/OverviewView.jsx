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

function getTablesCountFromSummary(summary) {
    return (
        summary?.summary?.total_tables ||
        summary?.data?.summary?.total_tables ||
        summary?.total_tables ||
        0
    );
}

function getSchemasCountFromSummary(summary) {
    return (
        summary?.summary?.total_schemas ||
        summary?.data?.summary?.total_schemas ||
        summary?.total_schemas ||
        0
    );
}

function OverviewView({
    user,
    databases,
    databaseSummaries,
    healthStates = {},
    connectionStates = {},
    allTables,
    dashboardStatus,
    dashboardError,
    onOpenExplorer,
    onRefreshCatalog,
    onConnectDatabase,
}) {
    const userName = user?.name || user?.username || "Usuario";
    const userRole = user?.role || "Sin rol";

    const totalDatabases = databases.length;

    const connectedCount = databases.filter(
        (db) => connectionStates[db.id]?.status === "loaded"
    ).length;

    const accessibleCount = databases.filter(
        (db) => healthStates[db.id]?.status === "active"
    ).length;

    const totalSchemas = new Set(
        allTables.map((table) => `${table.database_id}.${table.schema}`)
    ).size;

    const totalTables = allTables.length;

    const totalSensitiveTables = allTables.filter(
        (table) => table.has_sensitive_data
    ).length;

    return (
        <main className="overview-page">
            <section className="overview-hero">
                <div className="overview-kicker">Resumen ejecutivo</div>

                <h1 className="overview-title">DDP Data Explorer</h1>

                <p className="overview-description">
                    Herramienta interna para exploración controlada de bases,
                    esquemas, tablas y objetos de base de datos, con
                    autenticación corporativa, auditoría, roles y trazabilidad
                    por recurso.
                </p>

                <div className="overview-user-row">
                    <div className="overview-avatar">
                        {getInitials(userName)}
                    </div>

                    <div>
                        <strong>{userName}</strong>
                        <span>Usuario autenticado · {userRole}</span>
                    </div>
                </div>
            </section>

            <section className="overview-kpi-grid">
                <article className="overview-kpi-card">
                    <span>Fuentes configuradas</span>
                    <strong>{totalDatabases}</strong>
                    <p>{accessibleCount} accesibles · {connectedCount} conectadas</p>
                </article>

                <article className="overview-kpi-card">
                    <span>Esquemas detectados</span>
                    <strong>{totalSchemas}</strong>
                    <p>Conteo por fuente y esquema</p>
                </article>

                <article className="overview-kpi-card">
                    <span>Tablas indexadas</span>
                    <strong>{totalTables}</strong>
                    <p>Catálogo técnico disponible</p>
                </article>

                <article className="overview-kpi-card">
                    <span>Tablas sensibles</span>
                    <strong>{totalSensitiveTables}</strong>
                    <p>Con columnas marcadas para control</p>
                </article>
            </section>

            <section className="overview-action-panel">
                <span className="overview-kicker">Próximo paso recomendado</span>

                <h2>Cerrar flujo de consulta guiada y auditoría enriquecida</h2>

                <p>
                    El siguiente hito es fortalecer la vista previa por tabla,
                    registrar explícitamente cada acceso por base, esquema y
                    objeto, y preparar el módulo visual de auditoría para roles
                    administrativos.
                </p>

                <div className="overview-actions">
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

            <section className="overview-sources-section">
                <div className="overview-section-header">
                    <div>
                        <h2>Fuentes disponibles</h2>
                        <p>{dashboardStatus}</p>
                    </div>
                </div>

                {dashboardError && (
                    <div className="error-box">{dashboardError}</div>
                )}

                <div className="overview-source-grid">
                    {databases.map((database) => {
                        const summary = databaseSummaries[database.id];
                        const health = healthStates[database.id];
                        const connection = connectionStates[database.id];

                        const isConnected = connection?.status === "loaded";
                        const isConnecting = connection?.status === "loading";
                        const isHealthChecking = health?.status === "checking";
                        const isAccessible = health?.status === "active";
                        const isUnreachable = health?.status === "unreachable";
                        const hasConfigError = database.configuration_status === "error";
                        const canConnect = isAccessible && !isConnected && !isConnecting;

                        const tablesCount = isConnected
                            ? allTables.filter((t) => t.database_id === database.id).length
                            : null;

                        const schemasCount = isConnected
                            ? new Set(
                                  allTables
                                      .filter((t) => t.database_id === database.id)
                                      .map((t) => t.schema)
                              ).size
                            : null;

                        return (
                            <article
                                className={[
                                    "overview-source-card",
                                    isConnected ? "connected" : "",
                                    (isUnreachable || hasConfigError) ? "warning" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                                key={database.id}
                            >
                                <div className="overview-source-top">
                                    <strong>{database.label}</strong>

                                    <div className="overview-source-badges">
                                        {isHealthChecking && (
                                            <mark className="badge-checking">
                                                <span className="mini-spinner-sm" /> Verificando
                                            </mark>
                                        )}
                                        {isAccessible && !isConnected && !isConnecting && (
                                            <mark className="badge-active">Accesible</mark>
                                        )}
                                        {isConnecting && (
                                            <mark className="badge-loading">
                                                <span className="mini-spinner-sm" /> Conectando
                                            </mark>
                                        )}
                                        {isConnected && (
                                            <mark className="badge-connected">Conectada</mark>
                                        )}
                                        {(isUnreachable || hasConfigError) && (
                                            <mark className="badge-error">Sin acceso</mark>
                                        )}
                                    </div>
                                </div>

                                <span>
                                    {database.database || database.name || "-"} ·{" "}
                                    {database.environment || "local"}
                                </span>

                                <div className="overview-source-meta">
                                    <small>
                                        {schemasCount !== null ? `${schemasCount} esquemas` : "—"}
                                    </small>
                                    <small>Owner: {database.owner || "Not defined"}</small>
                                </div>

                                <div className="overview-source-count">
                                    {tablesCount !== null ? `${tablesCount} tablas` : "—"}
                                </div>

                                {canConnect && (
                                    <button
                                        type="button"
                                        className="overview-connect-button"
                                        onClick={() => onConnectDatabase?.(database.id)}
                                    >
                                        Conectar y explorar
                                    </button>
                                )}

                                {isConnecting && (
                                    <p className="overview-connecting">
                                        Cargando esquemas y objetos...
                                    </p>
                                )}

                                {health?.status === "unreachable" && health?.message && (
                                    <p className="overview-error-hint">{health.message}</p>
                                )}
                            </article>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}

export default OverviewView;