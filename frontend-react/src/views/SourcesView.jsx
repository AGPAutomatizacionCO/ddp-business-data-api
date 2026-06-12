function SourcesView({ databases, databaseSummaries, allTables }) {
    return (
        <main className="roadmap-view">
            <section className="roadmap-hero compact">
                <div>
                    <span className="roadmap-eyebrow">
                        Fuentes / configuración
                    </span>

                    <h1>Catálogo de fuentes</h1>

                    <p>
                        Vista ejecutiva de bases registradas, ambiente, owner,
                        sensibilidad, SLA y estado de configuración.
                    </p>
                </div>
            </section>

            <section className="source-summary-table">
                <div className="source-list">
                    {databases.map((database) => {
                        const summary = databaseSummaries[database.id];

                        const tablesForDatabase = allTables.filter(
                            (table) => table.database_id === database.id
                        );

                        const schemaCount = new Set(
                            tablesForDatabase.map((table) => table.schema)
                        ).size;

                        const tableCount = tablesForDatabase.length;

                        return (
                            <div
                                className="source-row expanded"
                                key={database.id}
                            >
                                <div>
                                    <strong>{database.label}</strong>
                                    <span>
                                        ID: {database.id} · Base:{" "}
                                        {database.database || database.name}
                                    </span>
                                </div>

                                <small>
                                    {schemaCount} esquemas · {tableCount} tablas ·
                                    Owner: {database.owner || "No definido"} ·
                                    Área:{" "}
                                    {database.business_area || "No definida"} ·
                                    SLA: {database.sla_level || "N/A"}
                                </small>

                                <mark>
                                    {database.configuration_status === "error"
                                        ? "Error"
                                        : "Activa"}
                                </mark>

                                {summary?.database?.message && (
                                    <p>{summary.database.message}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}

export default SourcesView;