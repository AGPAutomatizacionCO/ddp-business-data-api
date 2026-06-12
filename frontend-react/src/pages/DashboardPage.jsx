import { useEffect, useMemo, useState } from "react";

import {
    getDatabases,
    getDatabaseSummary,
    getDatabaseTables,
    getDatabaseObjects,
    getHealthSummary,
    getTables,
} from "../services/apiClient";

import DashboardShell from "../components/DashboardShell.jsx";
import GuidedExplorerView from "../views/GuidedExplorerView.jsx";
import OverviewView from "../views/OverviewView.jsx";
import AuditView from "../views/AuditView.jsx";
import SourcesView from "../views/SourcesView.jsx";

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
        type: "TABLE",
        type_label: "Tabla",
        family: "DATA",
        family_label: "Datos",
        supports_preview: true,
        supports_definition: false,
        row_key: `${database.id}.TABLE.${schema}.${name}.${index}`,
    };
}

function normalizeObject(database, object, index) {
    const schema =
        object.schema ||
        object.schema_name ||
        object.SCHEMA_NAME ||
        "unknown_schema";

    const name =
        object.name ||
        object.object_name ||
        object.OBJECT_NAME ||
        `object_${index + 1}`;

    const type =
        object.type ||
        object.object_type ||
        object.OBJECT_TYPE ||
        "OTHER";

    const typeLabel =
        object.type_label ||
        object.object_type_description ||
        object.OBJECT_TYPE_DESCRIPTION ||
        "Objeto";

    const family =
        object.family ||
        "SUPPORT";

    const familyLabel =
        object.family_label ||
        "Soporte";

    const fullName =
        object.full_name ||
        `${schema}.${name}`;

    return {
        ...object,
        schema,
        name,
        full_name: fullName,
        type,
        type_label: typeLabel,
        family,
        family_label: familyLabel,
        database_id: database.id,
        database_label: database.label,
        environment: database.environment,
        business_area: database.business_area,
        owner: database.owner,
        sensitivity_level: database.sensitivity_level,
        sla_level: database.sla_level,
        supports_preview: Boolean(object.supports_preview),
        supports_definition: Boolean(object.supports_definition),
        has_sensitive_data: Boolean(object.has_sensitive_data),
        sensitive_columns_count: object.sensitive_columns_count || 0,
        sensitive_columns: object.sensitive_columns || [],
        create_date: object.create_date || null,
        modify_date: object.modify_date || null,
        sql_type: object.sql_type || null,
        sql_type_description: object.sql_type_description || null,
        base_object_name: object.base_object_name || null,
        row_key: `${database.id}.${type}.${schema}.${name}.${index}`,
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

function getObjectsFromResponse(response) {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    if (Array.isArray(response?.data?.data)) {
        return response.data.data;
    }

    if (Array.isArray(response?.objects)) {
        return response.objects;
    }

    if (Array.isArray(response?.result)) {
        return response.result;
    }

    console.warn("No se pudieron extraer objetos desde la respuesta:", response);

    return [];
}

function DashboardPage({ user, onLogout }) {
    const [dashboardStatus, setDashboardStatus] = useState(
        "Cargando dashboard..."
    );
    const [dashboardError, setDashboardError] = useState("");

    const [databases, setDatabases] = useState([]);
    const [databaseSummaries, setDatabaseSummaries] = useState({});
    const [allTables, setAllTables] = useState([]);
    const [allObjects, setAllObjects] = useState([]);

    const [selectedDatabaseId, setSelectedDatabaseId] = useState("");
    const [selectedTable, setSelectedTable] = useState(null);
    const [selectedObject, setSelectedObject] = useState(null);

    const [activeView, setActiveView] = useState("explorer");
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const selectedDatabase = useMemo(() => {
        return databases.find((database) => database.id === selectedDatabaseId);
    }, [databases, selectedDatabaseId]);

    async function safeLoadObjects(database) {
        try {
            const objectsResult = await getDatabaseObjects(database.id);

            return getObjectsFromResponse(objectsResult);
        } catch (objectsError) {
            console.warn(
                `No fue posible cargar objetos para la base ${database.id}. Se continúa solo con tablas.`,
                objectsError
            );

            return [];
        }
    }

    async function loadDatabaseData(database) {
        try {
            const [summaryResult, tablesResult] = await Promise.all([
                getDatabaseSummary(database.id),
                getDatabaseTables(database.id),
            ]);

            const objects = await safeLoadObjects(database);

            return {
                summary: summaryResult,
                tables: getTablesFromResponse(tablesResult),
                objects,
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
                objects: [],
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
            const objectsFromAllDatabases = [];

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
                        const normalizedTable = normalizeTable(
                            database,
                            table,
                            index
                        );

                        tablesFromAllDatabases.push(normalizedTable);
                    });

                    databaseData.objects.forEach((object, index) => {
                        const normalizedObject = normalizeObject(
                            database,
                            object,
                            index
                        );

                        objectsFromAllDatabases.push(normalizedObject);
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

            /*
             * Si el backend todavía no devuelve objetos para una base,
             * usamos las tablas como objetos tipo TABLE para que el explorador
             * pueda seguir funcionando de forma unificada.
             */
            const objectKeys = new Set(
                objectsFromAllDatabases.map(
                    (object) =>
                        `${object.database_id}.${object.type}.${object.schema}.${object.name}`
                )
            );

            tablesFromAllDatabases.forEach((table, index) => {
                const tableObjectKey = `${table.database_id}.TABLE.${table.schema}.${table.name}`;

                if (!objectKeys.has(tableObjectKey)) {
                    objectsFromAllDatabases.push({
                        ...table,
                        type: "TABLE",
                        type_label: "Tabla",
                        family: "DATA",
                        family_label: "Datos",
                        supports_preview: true,
                        supports_definition: false,
                        row_key: `${table.database_id}.TABLE.${table.schema}.${table.name}.fallback.${index}`,
                    });
                }
            });

            setDatabaseSummaries(summariesByDatabase);
            setAllTables(tablesFromAllDatabases);
            setAllObjects(objectsFromAllDatabases);

            if (!selectedObject && objectsFromAllDatabases.length > 0) {
                const firstObjectForSelectedDatabase =
                    objectsFromAllDatabases.find(
                        (object) =>
                            object.database_id === nextSelectedDatabaseId
                    ) || objectsFromAllDatabases[0];

                setSelectedObject(firstObjectForSelectedDatabase);

                if (
                    firstObjectForSelectedDatabase.type === "TABLE" ||
                    firstObjectForSelectedDatabase.type === "VIEW"
                ) {
                    const matchingTable = tablesFromAllDatabases.find(
                        (table) =>
                            table.database_id ===
                                firstObjectForSelectedDatabase.database_id &&
                            table.schema ===
                                firstObjectForSelectedDatabase.schema &&
                            table.name === firstObjectForSelectedDatabase.name
                    );

                    setSelectedTable(matchingTable || null);
                }
            }

            setDashboardStatus("Dashboard cargado correctamente.");
        } catch (loadError) {
            console.error(loadError);

            setDatabases([]);
            setDatabaseSummaries({});
            setAllTables([]);
            setAllObjects([]);
            setSelectedTable(null);
            setSelectedObject(null);

            setDashboardError(
                loadError.message || "No fue posible cargar el dashboard."
            );
            setDashboardStatus("Error cargando dashboard.");
        }
    }

    function handleDatabaseChange(databaseId) {
        setSelectedDatabaseId(databaseId);
        setSelectedTable(null);
        setSelectedObject(null);
    }

    function handleSelectObject(object) {
        setSelectedObject(object);

        if (object?.type === "TABLE" || object?.type === "VIEW") {
            const matchingTable = allTables.find(
                (table) =>
                    table.database_id === object.database_id &&
                    table.schema === object.schema &&
                    table.name === object.name
            );

            setSelectedTable(matchingTable || null);
            return;
        }

        setSelectedTable(null);
    }

    function handleSelectTable(table) {
        setSelectedTable(table);

        const matchingObject = allObjects.find(
            (object) =>
                object.database_id === table.database_id &&
                object.schema === table.schema &&
                object.name === table.name &&
                (object.type === "TABLE" || object.type === "VIEW")
        );

        if (matchingObject) {
            setSelectedObject(matchingObject);
        }
    }

    function isAdminUser() {
        return String(user?.role || "").trim().toUpperCase() === "ADMIN";
    }

    function renderOverviewView() {
        return (
            <OverviewView
                user={user}
                databases={databases}
                databaseSummaries={databaseSummaries}
                allTables={allTables}
                dashboardStatus={dashboardStatus}
                dashboardError={dashboardError}
                onOpenExplorer={() => setActiveView("explorer")}
                onRefreshCatalog={loadMultiDatabaseCatalog}
            />
        );
    }

    function renderActiveView() {
        if (activeView === "overview") {
            return renderOverviewView();
        }

        if (activeView === "audit") {
            if (!isAdminUser()) {
                return renderOverviewView();
            }

            return <AuditView />;
        }

        if (activeView === "sources") {
            if (!isAdminUser()) {
                return renderOverviewView();
            }

            return (
                <SourcesView
                    databases={databases}
                    databaseSummaries={databaseSummaries}
                    allTables={allTables}
                />
            );
        }

        return (
            <GuidedExplorerView
                user={user}
                databases={databases}
                databaseSummaries={databaseSummaries}
                selectedDatabase={selectedDatabase}
                selectedDatabaseId={selectedDatabaseId}
                allTables={allTables}
                allObjects={allObjects}
                selectedTable={selectedTable}
                selectedObject={selectedObject}
                dashboardStatus={dashboardStatus}
                dashboardError={dashboardError}
                onDatabaseChange={handleDatabaseChange}
                onSelectTable={handleSelectTable}
                onSelectObject={handleSelectObject}
                onLogout={onLogout}
                onRefreshCatalog={loadMultiDatabaseCatalog}
            />
        );
    }

    useEffect(() => {
        loadMultiDatabaseCatalog();
    }, []);

    return (
        <DashboardShell
            activeView={activeView}
            isMenuOpen={isMenuOpen}
            user={user}
            dashboardStatus={dashboardStatus}
            onToggleMenu={() => setIsMenuOpen((current) => !current)}
            onCloseMenu={() => setIsMenuOpen(false)}
            onChangeView={setActiveView}
            onLogout={onLogout}
        >
            {renderActiveView()}
        </DashboardShell>
    );
}

export default DashboardPage;