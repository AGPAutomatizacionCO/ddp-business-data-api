import { useEffect, useMemo, useState } from "react";

import {
    getDatabases,
    getDatabaseSummary,
    getDatabaseTables,
    getHealthSummary,
    getTables,
} from "../services/apiClient";

import DataExplorerWorkspace from "../components/DataExplorerWorkspace.jsx";

function normalizeTable(database, table, index) {
    const schema =
        table.schema ||
        table.table_schema ||
        table.TABLE_SCHEMA ||
        table.schema_name ||
        "unknown_schema";

    const name =
        table.name ||
        table.table_name ||
        table.TABLE_NAME ||
        table.table ||
        `table_${index + 1}`;

    const fullName =
        table.full_name ||
        table.fullName ||
        `${schema}.${name}`;

    return {
        ...table,
        schema,
        name,
        full_name: fullName,
        database_id: database.id,
        database_label: database.label,
        environment: database.environment,
        business_area: database.business_area,
        owner: database.owner,
        sensitivity_level: database.sensitivity_level,
        sla_level: database.sla_level,
        has_sensitive_data: Boolean(table.has_sensitive_data),
        sensitive_columns_count: table.sensitive_columns_count || 0,
        sensitive_columns: table.sensitive_columns || [],
        row_key: `${database.id}.${schema}.${name}.${index}`,
    };
}

function getTablesFromResponse(response) {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    if (Array.isArray(response?.data?.data)) {
        return response.data.data;
    }

    if (Array.isArray(response?.data?.tables)) {
        return response.data.tables;
    }

    if (Array.isArray(response?.tables)) {
        return response.tables;
    }

    if (Array.isArray(response?.result)) {
        return response.result;
    }

    console.warn("No se pudieron extraer tablas desde la respuesta:", response);

    return [];
}

function DashboardPage({ user, onLogout }) {
    const [dashboardStatus, setDashboardStatus] = useState("Cargando dashboard...");
    const [dashboardError, setDashboardError] = useState("");

    const [databases, setDatabases] = useState([]);
    const [databaseSummaries, setDatabaseSummaries] = useState({});
    const [allTables, setAllTables] = useState([]);

    const [selectedDatabaseId, setSelectedDatabaseId] = useState("");
    const [selectedTable, setSelectedTable] = useState(null);

    const selectedDatabase = useMemo(() => {
        return databases.find((database) => database.id === selectedDatabaseId);
    }, [databases, selectedDatabaseId]);

    async function loadDatabaseData(database) {
        try {
            const [summaryResult, tablesResult] = await Promise.all([
                getDatabaseSummary(database.id),
                getDatabaseTables(database.id),
            ]);
            console.log("TABLES RAW RESPONSE", {
                databaseId: database.id,
                tablesResult,
                extractedTables: getTablesFromResponse(tablesResult),
            });

            return {
                summary: summaryResult,
                tables: getTablesFromResponse(tablesResult),
                usedFallback: false,
            };
        } catch (databaseError) {
            console.warn(
                `No fue posible cargar endpoints multi-base para ${database.id}`,
                databaseError
            );

            if (database.id !== "main") {
                throw databaseError;
            }

            const [summaryResult, tablesResult] = await Promise.all([
                getHealthSummary(),
                getTables(),
            ]);

            return {
                summary: summaryResult,
                tables: getTablesFromResponse(tablesResult),
                usedFallback: true,
            };
        }
    }

    async function loadMultiDatabaseCatalog() {
        try {
            setDashboardError("");
            setDashboardStatus("Cargando catálogo de bases...");

            const databasesResult = await getDatabases();
            const databaseCatalog = databasesResult.data || [];

            setDatabases(databaseCatalog);

            let nextSelectedDatabaseId = selectedDatabaseId;

            if (!nextSelectedDatabaseId && databaseCatalog.length > 0) {
                nextSelectedDatabaseId = databaseCatalog[0].id;
                setSelectedDatabaseId(nextSelectedDatabaseId);
            }

            const summariesByDatabase = {};
            const tablesFromAllDatabases = [];

            for (const database of databaseCatalog) {
                if (database.configuration_status === "error") {
                    summariesByDatabase[database.id] = {
                        database: {
                            status: "configuration_error",
                            message: database.configuration_error,
                        },
                        summary: {
                            total_tables: 0,
                            total_schemas: 0,
                        },
                    };

                    continue;
                }

                try {
                    const databaseData = await loadDatabaseData(database);

                    summariesByDatabase[database.id] = databaseData.summary;

                    databaseData.tables.forEach((table, index) => {
                        tablesFromAllDatabases.push(
                            normalizeTable(database, table, index)
                        );
                    });
                } catch (catalogError) {
                    console.warn(
                        `No fue posible cargar la base ${database.id}`,
                        catalogError
                    );

                    summariesByDatabase[database.id] = {
                        database: {
                            status: "error",
                            message:
                                catalogError.backendMessage ||
                                catalogError.message ||
                                "No fue posible cargar esta base.",
                        },
                        summary: {
                            total_tables: 0,
                            total_schemas: 0,
                        },
                    };
                }
            }

            setDatabaseSummaries(summariesByDatabase);
            setAllTables(tablesFromAllDatabases);
            if (!selectedTable && tablesFromAllDatabases.length > 0) {
                const firstTableForSelectedDatabase =
                    tablesFromAllDatabases.find(
                        (table) => table.database_id === nextSelectedDatabaseId
                    ) || tablesFromAllDatabases[0];

                setSelectedTable(firstTableForSelectedDatabase);
            }

            setDashboardStatus("Dashboard cargado correctamente.");
        } catch (loadError) {
            console.error(loadError);

            setDatabases([]);
            setDatabaseSummaries({});
            setAllTables([]);
            setDashboardError(
                loadError.message || "No fue posible cargar el dashboard."
            );
            setDashboardStatus("Error cargando dashboard.");
        }
    }

    function handleDatabaseChange(databaseId) {
        setSelectedDatabaseId(databaseId);
        setSelectedTable(null);
    }

    useEffect(() => {
        loadMultiDatabaseCatalog();
    }, []);

    return (
        <DataExplorerWorkspace
            user={user}
            databases={databases}
            databaseSummaries={databaseSummaries}
            selectedDatabase={selectedDatabase}
            selectedDatabaseId={selectedDatabaseId}
            allTables={allTables}
            selectedTable={selectedTable}
            dashboardStatus={dashboardStatus}
            dashboardError={dashboardError}
            onDatabaseChange={handleDatabaseChange}
            onSelectTable={setSelectedTable}
            onLogout={onLogout}
            onRefreshCatalog={loadMultiDatabaseCatalog}
        />
    );
}

export default DashboardPage;