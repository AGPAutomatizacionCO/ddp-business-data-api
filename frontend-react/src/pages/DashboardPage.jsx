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
import CatalogLoadingOverlay from "../components/CatalogLoadingOverlay.jsx";
import GuidedExplorerView from "../views/GuidedExplorerView.jsx";
import OverviewView from "../views/OverviewView.jsx";
import AuditView from "../views/AuditView.jsx";
import SourcesView from "../views/SourcesView.jsx";

function normalizeRoleValue(value) {
    return String(value || "")
        .trim()
        .toUpperCase();
}

function getUserRoleValues(user) {
    if (!user) {
        return [];
    }

    const roleCandidates = [
        user.role,
        user.app_role,
        user.role_name,
        user.backend_role,
        user.profile?.role,
        user.user?.role,
    ];

    if (Array.isArray(user.roles)) {
        roleCandidates.push(...user.roles);
    }

    if (Array.isArray(user.permissions)) {
        roleCandidates.push(...user.permissions);
    }

    return roleCandidates.filter(Boolean).map(normalizeRoleValue);
}

function isAdminUser(user) {
    const roleValues = getUserRoleValues(user);

    return roleValues.some((role) =>
        [
            "ADMIN",
            "ADMINISTRATOR",
            "SUPERADMIN",
            "ROLE_ADMIN",
            "DDP_ADMIN",
        ].includes(role)
    );
}

function getListFromResponse(response, preferredKey = "data") {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.[preferredKey])) {
        return response[preferredKey];
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    if (Array.isArray(response?.data?.data)) {
        return response.data.data;
    }

    if (Array.isArray(response?.data?.items)) {
        return response.data.items;
    }

    if (Array.isArray(response?.data?.results)) {
        return response.data.results;
    }

    if (Array.isArray(response?.data?.tables)) {
        return response.data.tables;
    }

    if (Array.isArray(response?.data?.objects)) {
        return response.data.objects;
    }

    if (Array.isArray(response?.items)) {
        return response.items;
    }

    if (Array.isArray(response?.results)) {
        return response.results;
    }

    if (Array.isArray(response?.tables)) {
        return response.tables;
    }

    if (Array.isArray(response?.objects)) {
        return response.objects;
    }

    if (Array.isArray(response?.result)) {
        return response.result;
    }

    return [];
}

function getTablesFromResponse(response) {
    const tables = getListFromResponse(response, "tables");

    if (!Array.isArray(tables)) {
        console.warn("No se pudieron extraer tablas desde la respuesta:", response);
        return [];
    }

    return tables;
}

function getObjectsFromResponse(response) {
    const objects = getListFromResponse(response, "objects");

    if (!Array.isArray(objects)) {
        console.warn("No se pudieron extraer objetos desde la respuesta:", response);
        return [];
    }

    return objects;
}

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

    const family = object.family || "SUPPORT";
    const familyLabel = object.family_label || "Soporte";

    const fullName = object.full_name || `${schema}.${name}`;

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

function findFirstDatabaseWithCatalog({
    currentDatabaseId,
    databaseCatalog,
    objectsFromAllDatabases,
    tablesFromAllDatabases,
}) {
    const hasCatalogForCurrentDatabase =
        Boolean(currentDatabaseId) &&
        (
            objectsFromAllDatabases.some(
                (object) => object.database_id === currentDatabaseId
            ) ||
            tablesFromAllDatabases.some(
                (table) => table.database_id === currentDatabaseId
            )
        );

    if (hasCatalogForCurrentDatabase) {
        return currentDatabaseId;
    }

    if (objectsFromAllDatabases.length > 0) {
        return objectsFromAllDatabases[0].database_id;
    }

    if (tablesFromAllDatabases.length > 0) {
        return tablesFromAllDatabases[0].database_id;
    }

    if (currentDatabaseId) {
        return currentDatabaseId;
    }

    return databaseCatalog[0]?.id || "";
}

function DashboardPage({ user, onLogout }) {
    const [dashboardStatus, setDashboardStatus] = useState(
        "Cargando dashboard..."
    );
    const [dashboardError, setDashboardError] = useState("");

    const [catalogLoadingState, setCatalogLoadingState] = useState({
        isLoading: false,
        phase: "",
        message: "",
        current: "",
        completed: 0,
        total: 0,
    });

    const [databases, setDatabases] = useState([]);
    const [databaseSummaries, setDatabaseSummaries] = useState({});
    const [allTables, setAllTables] = useState([]);
    const [allObjects, setAllObjects] = useState([]);

    const [selectedDatabaseId, setSelectedDatabaseId] = useState("");
    const [selectedTable, setSelectedTable] = useState(null);
    const [selectedObject, setSelectedObject] = useState(null);

    const [activeView, setActiveView] = useState("explorer");
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const userIsAdmin = isAdminUser(user);

    const catalogObjects = allObjects.length > 0 ? allObjects : allTables;

    const selectedDatabase = useMemo(() => {
        return databases.find((database) => database.id === selectedDatabaseId);
    }, [databases, selectedDatabaseId]);

    function updateCatalogLoadingState(nextState) {
        setCatalogLoadingState((current) => ({
            ...current,
            ...nextState,
        }));
    }

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

            setCatalogLoadingState({
                isLoading: true,
                phase: "Inicializando catálogo",
                message: "Consultando fuentes configuradas y preparando la carga.",
                current: "",
                completed: 0,
                total: 0,
            });

            const databasesResult = await getDatabases();
            const databaseCatalog = getListFromResponse(databasesResult);

            setDatabases(databaseCatalog);

            updateCatalogLoadingState({
                phase: "Fuentes detectadas",
                message: `Se encontraron ${databaseCatalog.length} fuentes configuradas.`,
                total: databaseCatalog.length,
                completed: 0,
            });

            let nextSelectedDatabaseId = selectedDatabaseId;

            if (!nextSelectedDatabaseId && databaseCatalog.length > 0) {
                nextSelectedDatabaseId = databaseCatalog[0].id;
            }

            const summariesByDatabase = {};
            const tablesFromAllDatabases = [];
            const objectsFromAllDatabases = [];

            for (const [databaseIndex, database] of databaseCatalog.entries()) {
                updateCatalogLoadingState({
                    phase: "Cargando catálogo de base",
                    message: "Consultando resumen, tablas y objetos SQL.",
                    current: database.label || database.id,
                    completed: databaseIndex,
                    total: databaseCatalog.length,
                });

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

                    updateCatalogLoadingState({
                        completed: databaseIndex + 1,
                        current: database.label || database.id,
                    });

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

                    databaseData.objects.forEach((object, index) => {
                        objectsFromAllDatabases.push(
                            normalizeObject(database, object, index)
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

                updateCatalogLoadingState({
                    completed: databaseIndex + 1,
                    current: database.label || database.id,
                });
            }

            nextSelectedDatabaseId = findFirstDatabaseWithCatalog({
                currentDatabaseId: nextSelectedDatabaseId,
                databaseCatalog,
                objectsFromAllDatabases,
                tablesFromAllDatabases,
            });

            setSelectedDatabaseId(nextSelectedDatabaseId);
            setDatabaseSummaries(summariesByDatabase);
            setAllTables(tablesFromAllDatabases);
            setAllObjects(objectsFromAllDatabases);

            const nextCatalogObjects =
                objectsFromAllDatabases.length > 0
                    ? objectsFromAllDatabases
                    : tablesFromAllDatabases;

            const selectedObjectStillExists =
                selectedObject &&
                nextCatalogObjects.some(
                    (item) => item.row_key === selectedObject.row_key
                );

            if (!selectedObjectStillExists) {
                const firstObjectForSelectedDatabase =
                    nextCatalogObjects.find(
                        (item) => item.database_id === nextSelectedDatabaseId
                    ) || nextCatalogObjects[0] || null;

                setSelectedObject(firstObjectForSelectedDatabase);
                setSelectedTable(firstObjectForSelectedDatabase);
            }

            setDashboardStatus(
                `Dashboard cargado correctamente. Bases: ${databaseCatalog.length}, objetos: ${objectsFromAllDatabases.length}, tablas: ${tablesFromAllDatabases.length}.`
            );

            updateCatalogLoadingState({
                phase: "Catálogo listo",
                message: "La información fue cargada correctamente.",
                completed: databaseCatalog.length,
                total: databaseCatalog.length,
                current: "Proceso completado",
            });

            window.setTimeout(() => {
                setCatalogLoadingState((current) => ({
                    ...current,
                    isLoading: false,
                }));
            }, 650);
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

            setCatalogLoadingState((current) => ({
                ...current,
                isLoading: false,
                phase: "Error cargando catálogo",
                message:
                    loadError.message ||
                    "No fue posible cargar la información.",
            }));
        }
    }

    function handleDatabaseChange(databaseId) {
        setSelectedDatabaseId(databaseId);
        setSelectedTable(null);
        setSelectedObject(null);
    }

    function handleSelectObject(object) {
        setSelectedObject(object);
        setSelectedTable(object);
    }

    function renderOverviewView() {
        return (
            <OverviewView
                user={user}
                databases={databases}
                databaseSummaries={databaseSummaries}
                allTables={catalogObjects}
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
            return (
                <AuditView
                    user={user}
                    databases={databases}
                    allTables={catalogObjects}
                    dashboardStatus={dashboardStatus}
                />
            );
        }

        if (activeView === "sources") {
            if (!userIsAdmin) {
                return renderOverviewView();
            }

            return (
                <SourcesView
                    databases={databases}
                    databaseSummaries={databaseSummaries}
                    allTables={catalogObjects}
                    dashboardStatus={dashboardStatus}
                    dashboardError={dashboardError}
                    onRefreshCatalog={loadMultiDatabaseCatalog}
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
                onSelectTable={setSelectedTable}
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
            <CatalogLoadingOverlay loadingState={catalogLoadingState} />

            {renderActiveView()}
        </DashboardShell>
    );
}

export default DashboardPage;