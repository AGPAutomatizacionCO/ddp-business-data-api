import { useMemo, useState } from "react";

function groupTablesByDatabaseAndSchema(tables) {
    const grouped = {};

    for (const table of tables) {
        const databaseId = table.database_id || "unknown_database";
        const databaseLabel = table.database_label || databaseId;
        const schema = table.schema || "unknown_schema";

        if (!grouped[databaseId]) {
            grouped[databaseId] = {
                id: databaseId,
                label: databaseLabel,
                totalTables: 0,
                schemas: {},
            };
        }

        if (!grouped[databaseId].schemas[schema]) {
            grouped[databaseId].schemas[schema] = {
                name: schema,
                totalTables: 0,
                sensitiveTables: 0,
                tables: [],
            };
        }

        grouped[databaseId].schemas[schema].tables.push(table);
        grouped[databaseId].schemas[schema].totalTables += 1;
        grouped[databaseId].totalTables += 1;

        if (table.has_sensitive_data) {
            grouped[databaseId].schemas[schema].sensitiveTables += 1;
        }
    }

    return grouped;
}

function SidebarExplorer({ tables, selectedTableKey, onSelectTable }) {
    const [collapsedDatabases, setCollapsedDatabases] = useState({});
    const [collapsedSchemas, setCollapsedSchemas] = useState({});

    const groupedData = useMemo(() => {
        return groupTablesByDatabaseAndSchema(tables);
    }, [tables]);

    const databases = Object.values(groupedData);

    function toggleDatabase(databaseId) {
        setCollapsedDatabases((current) => ({
            ...current,
            [databaseId]: !current[databaseId],
        }));
    }

    function toggleSchema(databaseId, schema) {
        const key = `${databaseId}.${schema}`;

        setCollapsedSchemas((current) => ({
            ...current,
            [key]: !current[key],
        }));
    }

    return (
        <aside className="sidebar-explorer">
            <div className="sidebar-header">
                <span>Explorador</span>
                <strong>{tables.length} tablas</strong>
            </div>

            <div className="sidebar-tree">
                {databases.map((database) => {
                    const isDatabaseCollapsed = collapsedDatabases[database.id];
                    const schemas = Object.values(database.schemas);

                    return (
                        <div className="tree-database" key={database.id}>
                            <button
                                type="button"
                                className="tree-database-button"
                                onClick={() => toggleDatabase(database.id)}
                            >
                                <span>{isDatabaseCollapsed ? "▸" : "▾"}</span>

                                <div>
                                    <small>Base de datos</small>
                                    <strong>{database.label}</strong>
                                </div>

                                <mark>{database.totalTables}</mark>
                            </button>

                            {!isDatabaseCollapsed && (
                                <div className="tree-schema-group">
                                    {schemas.map((schemaGroup) => {
                                        const schemaKey = `${database.id}.${schemaGroup.name}`;
                                        const isSchemaCollapsed =
                                            collapsedSchemas[schemaKey];

                                        return (
                                            <div
                                                className="tree-schema"
                                                key={schemaKey}
                                            >
                                                <button
                                                    type="button"
                                                    className="tree-schema-button"
                                                    onClick={() =>
                                                        toggleSchema(
                                                            database.id,
                                                            schemaGroup.name
                                                        )
                                                    }
                                                >
                                                    <span>
                                                        {isSchemaCollapsed
                                                            ? "▸"
                                                            : "▾"}
                                                    </span>

                                                    <strong>
                                                        {schemaGroup.name}
                                                    </strong>

                                                    <small>
                                                        {schemaGroup.totalTables}
                                                    </small>
                                                </button>

                                                {!isSchemaCollapsed && (
                                                    <div className="tree-table-list">
                                                        {schemaGroup.tables.map(
                                                            (table) => {
                                                                const isSelected =
                                                                    selectedTableKey ===
                                                                    table.row_key;

                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        key={
                                                                            table.row_key
                                                                        }
                                                                        className={
                                                                            isSelected
                                                                                ? "tree-table-button selected"
                                                                                : "tree-table-button"
                                                                        }
                                                                        onClick={() =>
                                                                            onSelectTable(
                                                                                table
                                                                            )
                                                                        }
                                                                    >
                                                                        <span>
                                                                            {
                                                                                table.name
                                                                            }
                                                                        </span>

                                                                        {table.has_sensitive_data && (
                                                                            <mark>
                                                                                {
                                                                                    table.sensitive_columns_count
                                                                                }
                                                                            </mark>
                                                                        )}
                                                                    </button>
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                {databases.length === 0 && (
                    <div className="empty-state">
                        No hay bases o tablas disponibles.
                    </div>
                )}
            </div>
        </aside>
    );
}

export default SidebarExplorer;