import { useEffect, useMemo, useState } from "react";

import {
    getDatabases,
    getDatabaseHealth,
    getDatabaseSummary,
    getDatabaseTables,
    getDatabaseObjects,
} from "../services/apiClient";

import DashboardShell from "../components/DashboardShell.jsx";
import GuidedExplorerView from "../views/GuidedExplorerView.jsx";
import OverviewView from "../views/OverviewView.jsx";
import AuditView from "../views/AuditView.jsx";
import SourcesView from "../views/SourcesView.jsx";
import OperativeQueryView from "../views/OperativeQueryView.jsx";

// --- Utilities ---

function normalizeRoleValue(value) {
    return String(value || "").trim().toUpperCase();
}

function getUserRoleValues(user) {
    if (!user) return [];
    const candidates = [
        user.role, user.app_role, user.role_name, user.backend_role,
        user.profile?.role, user.user?.role,
    ];
    if (Array.isArray(user.roles)) candidates.push(...user.roles);
    if (Array.isArray(user.permissions)) candidates.push(...user.permissions);
    return candidates.filter(Boolean).map(normalizeRoleValue);
}

function isAdminUser(user) {
    return getUserRoleValues(user).some((r) =>
        ["ADMIN", "ADMINISTRATOR", "SUPERADMIN", "ROLE_ADMIN", "DDP_ADMIN"].includes(r)
    );
}

function getListFromResponse(response, preferredKey = "data") {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.[preferredKey])) return response[preferredKey];
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response?.data?.items)) return response.data.items;
    if (Array.isArray(response?.data?.tables)) return response.data.tables;
    if (Array.isArray(response?.data?.objects)) return response.data.objects;
    if (Array.isArray(response?.items)) return response.items;
    if (Array.isArray(response?.tables)) return response.tables;
    if (Array.isArray(response?.objects)) return response.objects;
    return [];
}

function normalizeTable(database, table, index) {
    const schema =
        table.schema || table.table_schema || table.TABLE_SCHEMA ||
        table.schema_name || "unknown_schema";
    const name =
        table.name || table.table_name || table.TABLE_NAME ||
        table.table || `table_${index + 1}`;
    const fullName = table.full_name || table.fullName || `${schema}.${name}`;

    return {
        ...table,
        schema, name,
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
        type: "TABLE", type_label: "Tabla",
        family: "DATA", family_label: "Datos",
        supports_preview: true, supports_definition: false,
        row_key: `${database.id}.TABLE.${schema}.${name}.${index}`,
    };
}

function normalizeObject(database, object, index) {
    const schema =
        object.schema || object.schema_name || object.SCHEMA_NAME || "unknown_schema";
    const name =
        object.name || object.object_name || object.OBJECT_NAME || `object_${index + 1}`;
    const type = object.type || object.object_type || object.OBJECT_TYPE || "OTHER";
    const typeLabel =
        object.type_label || object.object_type_description ||
        object.OBJECT_TYPE_DESCRIPTION || "Objeto";
    const family = object.family || "SUPPORT";
    const familyLabel = object.family_label || "Soporte";
    const fullName = object.full_name || `${schema}.${name}`;

    return {
        ...object,
        schema, name,
        full_name: fullName,
        type, type_label: typeLabel,
        family, family_label: familyLabel,
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

// --- Component ---

function DashboardPage({ user, onLogout }) {
    // Catalog: just the list of configured databases (no DB connection needed)
    const [databases, setDatabases] = useState([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [catalogError, setCatalogError] = useState("");

    // Health state per database  (lightweight SELECT 1 check)
    // { [id]: { status: 'checking' | 'active' | 'unreachable', database: string, message: string|null } }
    const [healthStates, setHealthStates] = useState({});

    // Connection state per database (tables + objects loaded on demand)
    // { [id]: { status: 'idle' | 'loading' | 'loaded' | 'error', tables: [], objects: [], summary: null, error: null } }
    const [connectionStates, setConnectionStates] = useState({});

    const [selectedDatabaseId, setSelectedDatabaseId] = useState("");
    const [selectedTable, setSelectedTable] = useState(null);
    const [selectedObject, setSelectedObject] = useState(null);
    const [activeView, setActiveView] = useState("explorer");
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const userIsAdmin = isAdminUser(user);

    // --- Derived state ---

    const allTables = useMemo(() =>
        Object.values(connectionStates)
            .filter((s) => s.status === "loaded")
            .flatMap((s) => s.tables)
    , [connectionStates]);

    const allObjects = useMemo(() =>
        Object.values(connectionStates)
            .filter((s) => s.status === "loaded")
            .flatMap((s) => s.objects)
    , [connectionStates]);

    const databaseSummaries = useMemo(() => {
        const summaries = {};
        for (const [id, state] of Object.entries(connectionStates)) {
            if (state.summary) summaries[id] = state.summary;
        }
        return summaries;
    }, [connectionStates]);

    const selectedDatabase = useMemo(() =>
        databases.find((db) => db.id === selectedDatabaseId)
    , [databases, selectedDatabaseId]);

    const catalogObjects = allObjects.length > 0 ? allObjects : allTables;

    const connectedCount = Object.values(connectionStates).filter(
        (s) => s.status === "loaded"
    ).length;

    const dashboardStatus = catalogLoading
        ? "Cargando catálogo de fuentes..."
        : catalogError
        ? `Error: ${catalogError}`
        : databases.length === 0
        ? "Sin fuentes configuradas."
        : `${databases.length} fuentes detectadas · ${connectedCount} conectadas`;

    // --- Load catalog (fast, just metadata — no DB connections) ---

    async function loadCatalog() {
        try {
            setCatalogLoading(true);
            setCatalogError("");
            setSelectedTable(null);
            setSelectedObject(null);

            const result = await getDatabases();
            const catalog = getListFromResponse(result);
            setDatabases(catalog);

            // Initialize all states
            const initHealth = {};
            const initConnection = {};
            for (const db of catalog) {
                initHealth[db.id] = {
                    status: "checking",
                    database: db.database,
                    message: null,
                };
                initConnection[db.id] = {
                    status: "idle",
                    tables: [],
                    objects: [],
                    summary: null,
                    error: null,
                };
            }
            setHealthStates(initHealth);
            setConnectionStates(initConnection);

            if (catalog.length > 0) {
                setSelectedDatabaseId((prev) => prev || catalog[0].id);
            }

            // Fire health checks in parallel — lightweight SELECT 1 per database
            for (const db of catalog) {
                if (db.configuration_status === "error") {
                    setHealthStates((prev) => ({
                        ...prev,
                        [db.id]: {
                            status: "unreachable",
                            database: db.database,
                            message: db.configuration_error || "Error de configuración",
                        },
                    }));
                } else {
                    checkDatabaseHealth(db.id);
                }
            }
        } catch (error) {
            setCatalogError(error.message || "No fue posible cargar el catálogo.");
        } finally {
            setCatalogLoading(false);
        }
    }

    // --- Health check (SELECT 1 per database) ---

    async function checkDatabaseHealth(databaseId) {
        try {
            setHealthStates((prev) => ({
                ...prev,
                [databaseId]: { ...prev[databaseId], status: "checking" },
            }));

            const result = await getDatabaseHealth(databaseId);

            setHealthStates((prev) => ({
                ...prev,
                [databaseId]: {
                    status: result.status === "ok" ? "active" : "unreachable",
                    database: result.database || prev[databaseId]?.database,
                    message: result.message || null,
                },
            }));
        } catch (error) {
            setHealthStates((prev) => ({
                ...prev,
                [databaseId]: {
                    ...prev[databaseId],
                    status: "unreachable",
                    message: error.backendMessage || error.message || "No accesible",
                },
            }));
        }
    }

    // --- Connect a single database (loads tables + objects on demand) ---

    async function connectDatabase(databaseId) {
        const database = databases.find((db) => db.id === databaseId);
        if (!database) return;

        setConnectionStates((prev) => ({
            ...prev,
            [databaseId]: { ...prev[databaseId], status: "loading", error: null },
        }));

        try {
            const [summaryResult, tablesResult, objectsResult] = await Promise.allSettled([
                getDatabaseSummary(databaseId),
                getDatabaseTables(databaseId),
                getDatabaseObjects(databaseId),
            ]);

            const summary =
                summaryResult.status === "fulfilled" ? summaryResult.value : null;

            const rawTables =
                tablesResult.status === "fulfilled"
                    ? getListFromResponse(tablesResult.value, "data")
                    : [];

            const rawObjects =
                objectsResult.status === "fulfilled"
                    ? getListFromResponse(objectsResult.value, "data")
                    : [];

            const tables = rawTables.map((t, i) => normalizeTable(database, t, i));
            const objects =
                rawObjects.length > 0
                    ? rawObjects.map((o, i) => normalizeObject(database, o, i))
                    : tables;

            setConnectionStates((prev) => ({
                ...prev,
                [databaseId]: {
                    status: "loaded",
                    tables,
                    objects,
                    summary,
                    error: null,
                },
            }));

            setSelectedDatabaseId(databaseId);
        } catch (error) {
            setConnectionStates((prev) => ({
                ...prev,
                [databaseId]: {
                    ...prev[databaseId],
                    status: "error",
                    error: error.message || "No fue posible conectar.",
                },
            }));
        }
    }

    // --- Handlers ---

    function handleDatabaseChange(databaseId) {
        setSelectedDatabaseId(databaseId);
        setSelectedTable(null);
        setSelectedObject(null);
    }

    function handleSelectObject(object) {
        setSelectedObject(object);
        setSelectedTable(object);
    }

    // --- Render views ---

    function renderOverviewView() {
        return (
            <OverviewView
                user={user}
                databases={databases}
                databaseSummaries={databaseSummaries}
                healthStates={healthStates}
                connectionStates={connectionStates}
                allTables={catalogObjects}
                dashboardStatus={dashboardStatus}
                dashboardError={catalogError}
                onOpenExplorer={() => setActiveView("explorer")}
                onRefreshCatalog={loadCatalog}
                onConnectDatabase={connectDatabase}
            />
        );
    }

    function renderActiveView() {
        if (activeView === "overview") return renderOverviewView();

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
            if (!userIsAdmin) return renderOverviewView();
            return (
                <SourcesView
                    databases={databases}
                    databaseSummaries={databaseSummaries}
                    allTables={catalogObjects}
                    dashboardStatus={dashboardStatus}
                    dashboardError={catalogError}
                    onRefreshCatalog={loadCatalog}
                />
            );
        }

        if (activeView === "queries") {
            return (
                <OperativeQueryView
                    user={user}
                    databases={databases}
                    connectionStates={connectionStates}
                    onConnectDatabase={connectDatabase}
                />
            );
        }

        return (
            <GuidedExplorerView
                user={user}
                databases={databases}
                databaseSummaries={databaseSummaries}
                healthStates={healthStates}
                connectionStates={connectionStates}
                selectedDatabase={selectedDatabase}
                selectedDatabaseId={selectedDatabaseId}
                allTables={allTables}
                allObjects={allObjects}
                selectedTable={selectedTable}
                selectedObject={selectedObject}
                dashboardStatus={dashboardStatus}
                dashboardError={catalogError}
                onDatabaseChange={handleDatabaseChange}
                onSelectTable={setSelectedTable}
                onSelectObject={handleSelectObject}
                onLogout={onLogout}
                onRefreshCatalog={loadCatalog}
                onConnectDatabase={connectDatabase}
            />
        );
    }

    useEffect(() => {
        loadCatalog();
    }, []);

    return (
        <DashboardShell
            activeView={activeView}
            isMenuOpen={isMenuOpen}
            user={user}
            dashboardStatus={dashboardStatus}
            onToggleMenu={() => setIsMenuOpen((c) => !c)}
            onCloseMenu={() => setIsMenuOpen(false)}
            onChangeView={setActiveView}
            onLogout={onLogout}
        >
            {catalogLoading && (
                <div className="catalog-init-banner" role="status">
                    <span className="catalog-init-spinner" />
                    Cargando catálogo de fuentes...
                </div>
            )}
            {renderActiveView()}
        </DashboardShell>
    );
}

export default DashboardPage;
