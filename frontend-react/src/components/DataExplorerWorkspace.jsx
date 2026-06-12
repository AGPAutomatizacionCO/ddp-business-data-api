import { useEffect, useMemo, useState } from "react";

import {
    getDatabaseObjectDefinition,
    getDatabaseTablePreview,
} from "../services/apiClient";

const OBJECT_TYPE_CONFIG = {
    TABLE: {
        label: "Tabla",
        shortLabel: "Tabla",
        family: "Datos",
        icon: "▦",
        className: "object-table",
        supportsPreview: true,
        supportsDefinition: false,
    },
    VIEW: {
        label: "Vista",
        shortLabel: "Vista",
        family: "Datos",
        icon: "◈",
        className: "object-view",
        supportsPreview: true,
        supportsDefinition: true,
    },
    PROCEDURE: {
        label: "Procedimiento",
        shortLabel: "Proc",
        family: "Lógica SQL",
        icon: "⚙",
        className: "object-procedure",
        supportsPreview: false,
        supportsDefinition: true,
    },
    FUNCTION: {
        label: "Función",
        shortLabel: "Func",
        family: "Lógica SQL",
        icon: "ƒ",
        className: "object-function",
        supportsPreview: false,
        supportsDefinition: true,
    },
    TRIGGER: {
        label: "Trigger",
        shortLabel: "Trig",
        family: "Lógica automática",
        icon: "⚡",
        className: "object-trigger",
        supportsPreview: false,
        supportsDefinition: true,
    },
    SYNONYM: {
        label: "Sinónimo",
        shortLabel: "Syn",
        family: "Soporte",
        icon: "↪",
        className: "object-synonym",
        supportsPreview: false,
        supportsDefinition: false,
    },
    SEQUENCE: {
        label: "Secuencia",
        shortLabel: "Seq",
        family: "Soporte",
        icon: "#",
        className: "object-sequence",
        supportsPreview: false,
        supportsDefinition: false,
    },
    OTHER: {
        label: "Otro objeto",
        shortLabel: "Otro",
        family: "Soporte",
        icon: "◇",
        className: "object-other",
        supportsPreview: false,
        supportsDefinition: false,
    },
};

const OBJECT_TYPE_ORDER = [
    "TABLE",
    "VIEW",
    "PROCEDURE",
    "FUNCTION",
    "TRIGGER",
    "SYNONYM",
    "SEQUENCE",
    "OTHER",
];

const SQL_KEYWORDS = new Set([
    "SELECT",
    "FROM",
    "WHERE",
    "JOIN",
    "INNER",
    "LEFT",
    "RIGHT",
    "FULL",
    "OUTER",
    "ON",
    "GROUP",
    "BY",
    "ORDER",
    "HAVING",
    "INSERT",
    "INTO",
    "VALUES",
    "UPDATE",
    "SET",
    "DELETE",
    "CREATE",
    "ALTER",
    "DROP",
    "PROCEDURE",
    "PROC",
    "FUNCTION",
    "TRIGGER",
    "VIEW",
    "TABLE",
    "AS",
    "BEGIN",
    "END",
    "DECLARE",
    "IF",
    "ELSE",
    "WHILE",
    "RETURN",
    "CASE",
    "WHEN",
    "THEN",
    "AND",
    "OR",
    "NOT",
    "NULL",
    "IS",
    "DISTINCT",
    "TOP",
    "UNION",
    "ALL",
    "EXISTS",
    "IN",
    "LIKE",
    "BETWEEN",
    "CAST",
    "CONVERT",
    "COUNT",
    "SUM",
    "AVG",
    "MIN",
    "MAX",
    "GETDATE",
    "DATEADD",
    "DATEDIFF",
    "TRY_CAST",
    "TRY_CONVERT",
    "WITH",
    "NOLOCK",
    "EXEC",
    "EXECUTE",
    "OUTPUT",
]);

function getObjectTypeConfig(type) {
    return OBJECT_TYPE_CONFIG[type] || OBJECT_TYPE_CONFIG.OTHER;
}

function normalizeText(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function matchValue(value, query) {
    const normalizedValue = normalizeText(value);
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
        return false;
    }

    return normalizedValue.includes(normalizedQuery);
}

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

function getObjectSearchText(object) {
    return [
        object.database_label,
        object.database_id,
        object.schema,
        object.name,
        object.full_name,
        object.type,
        object.type_label,
        object.family,
        object.family_label,
        object.environment,
        object.business_area,
        object.owner,
        object.sql_type,
        object.sql_type_description,
        object.base_object_name,
    ]
        .filter(Boolean)
        .join(" ");
}

function getColumnSearchText(object) {
    return [...(object.sensitive_columns || [])].filter(Boolean).join(" ");
}

function buildGlobalSearchResults({ allObjects, query }) {
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
        return [];
    }

    const results = [];

    for (const object of allObjects) {
        const objectText = getObjectSearchText(object);
        const columnText = getColumnSearchText(object);

        const objectMatches = matchValue(objectText, normalizedQuery);
        const columnMatches = matchValue(columnText, normalizedQuery);

        const matchingColumns = (object.sensitive_columns || []).filter(
            (columnName) => matchValue(columnName, normalizedQuery)
        );

        if (!objectMatches && !columnMatches) {
            continue;
        }

        let resultType = "object";
        let matchedField = "Objeto";
        let matchedValue = object.full_name;

        if (columnMatches && !objectMatches) {
            resultType = "column";
            matchedField = "Columna";
            matchedValue = matchingColumns.join(", ");
        }

        if (objectMatches && columnMatches) {
            resultType = "mixed";
            matchedField = "Objeto y columna";
            matchedValue = `${object.full_name} · ${matchingColumns.join(", ")}`;
        }

        results.push({
            id: object.row_key,
            resultType,
            matchedField,
            matchedValue,
            matchingColumns,
            object,
        });
    }

    return results.sort((a, b) => {
        const databaseCompare = normalizeText(
            a.object.database_label
        ).localeCompare(normalizeText(b.object.database_label));

        if (databaseCompare !== 0) {
            return databaseCompare;
        }

        const typeCompare =
            OBJECT_TYPE_ORDER.indexOf(a.object.type) -
            OBJECT_TYPE_ORDER.indexOf(b.object.type);

        if (typeCompare !== 0) {
            return typeCompare;
        }

        const schemaCompare = normalizeText(a.object.schema).localeCompare(
            normalizeText(b.object.schema)
        );

        if (schemaCompare !== 0) {
            return schemaCompare;
        }

        return normalizeText(a.object.name).localeCompare(
            normalizeText(b.object.name)
        );
    });
}

function groupResultsByDatabase(results) {
    const grouped = {};

    for (const result of results) {
        const databaseId = result.object.database_id;

        if (!grouped[databaseId]) {
            grouped[databaseId] = {
                databaseId,
                databaseLabel: result.object.database_label,
                results: [],
            };
        }

        grouped[databaseId].results.push(result);
    }

    return Object.values(grouped);
}

function groupObjectsBySchema(objects) {
    const grouped = {};

    for (const object of objects) {
        const schema = object.schema || "unknown_schema";

        if (!grouped[schema]) {
            grouped[schema] = {
                name: schema,
                totalObjects: 0,
                sensitiveObjects: 0,
                objectsByType: {},
            };
        }

        if (!grouped[schema].objectsByType[object.type]) {
            grouped[schema].objectsByType[object.type] = [];
        }

        grouped[schema].objectsByType[object.type].push(object);
        grouped[schema].totalObjects += 1;

        if (object.has_sensitive_data) {
            grouped[schema].sensitiveObjects += 1;
        }
    }

    return Object.values(grouped).map((schema) => ({
        ...schema,
        typeGroups: OBJECT_TYPE_ORDER.map((type) => ({
            type,
            config: getObjectTypeConfig(type),
            objects: schema.objectsByType[type] || [],
        })).filter((group) => group.objects.length > 0),
    }));
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    try {
        return new Intl.DateTimeFormat("es-CO", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(value));
    } catch {
        return value;
    }
}

function getLineCount(content) {
    if (!content) {
        return 0;
    }

    return String(content).split(/\r\n|\r|\n/).length;
}

function getSearchScopeLabel(searchScope, selectedDatabase, customSearchDatabaseIds) {
    if (searchScope === "current") {
        return selectedDatabase?.label || "Base actual";
    }

    if (searchScope === "custom") {
        if (customSearchDatabaseIds.length === 0) {
            return "Todas las bases";
        }

        return `${customSearchDatabaseIds.length} bases`;
    }

    return "Todas las bases";
}

function getSearchSourceObjects({
    allObjects,
    allTables,
    selectedDatabaseId,
    searchScope,
    customSearchDatabaseIds,
}) {
    const sourceObjects = allObjects.length > 0 ? allObjects : allTables;

    if (searchScope === "current" && selectedDatabaseId) {
        return sourceObjects.filter(
            (object) => object.database_id === selectedDatabaseId
        );
    }

    if (searchScope === "custom" && customSearchDatabaseIds.length > 0) {
        return sourceObjects.filter((object) =>
            customSearchDatabaseIds.includes(object.database_id)
        );
    }

    return sourceObjects;
}

function toggleArrayValue(values, value) {
    if (values.includes(value)) {
        return values.filter((item) => item !== value);
    }

    return [...values, value];
}

function tokenizeSql(sql) {
    if (!sql) {
        return [];
    }

    const tokenRegex =
        /(--.*?$|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|\b\d+(?:\.\d+)?\b|@[A-Za-z_][A-Za-z0-9_]*|\b[A-Za-z_][A-Za-z0-9_]*\b|\s+|.)/gm;

    return String(sql).match(tokenRegex) || [];
}

function renderSqlToken(token, index) {
    const upperToken = token.toUpperCase();

    let className = "";

    if (token.startsWith("--") || token.startsWith("/*")) {
        className = "sql-token-comment";
    } else if (token.startsWith("'")) {
        className = "sql-token-string";
    } else if (/^\d+(\.\d+)?$/.test(token)) {
        className = "sql-token-number";
    } else if (token.startsWith("@")) {
        className = "sql-token-variable";
    } else if (SQL_KEYWORDS.has(upperToken)) {
        className = "sql-token-keyword";
    }

    return (
        <span key={`${index}-${token}`} className={className}>
            {token}
        </span>
    );
}

function buildMetadataContent(object) {
    return JSON.stringify(
        {
            database_id: object?.database_id || null,
            database_label: object?.database_label || null,
            schema: object?.schema || null,
            name: object?.name || null,
            full_name: object?.full_name || null,
            type: object?.type || null,
            type_label: object?.type_label || null,
            family: object?.family || null,
            family_label: object?.family_label || null,
            sql_type: object?.sql_type || null,
            sql_type_description: object?.sql_type_description || null,
            create_date: object?.create_date || null,
            modify_date: object?.modify_date || null,
            base_object_name: object?.base_object_name || null,
        },
        null,
        2
    );
}

function findPossibleDependencies(content, allObjects, activeObject) {
    const normalizedContent = normalizeText(content);

    if (!normalizedContent) {
        return [];
    }

    return allObjects
        .filter((object) => object.row_key !== activeObject?.row_key)
        .filter((object) => {
            const objectName = normalizeText(object.name);
            const fullName = normalizeText(object.full_name);
            const bracketedFullName = normalizeText(
                `[${object.schema}].[${object.name}]`
            );

            return (
                (objectName.length > 3 && normalizedContent.includes(objectName)) ||
                normalizedContent.includes(fullName) ||
                normalizedContent.includes(bracketedFullName)
            );
        })
        .slice(0, 60);
}

function ContentCodeViewer({ content, object, allObjects }) {
    const [copied, setCopied] = useState(false);
    const [showDependencies, setShowDependencies] = useState(false);

    const normalizedContent = String(content || "").replace(/\r\n/g, "\n");

    const lines = useMemo(() => {
        return normalizedContent.split("\n");
    }, [normalizedContent]);

    const dependencies = useMemo(() => {
        return findPossibleDependencies(normalizedContent, allObjects, object);
    }, [normalizedContent, allObjects, object]);

    async function handleCopyContent() {
        try {
            await navigator.clipboard.writeText(normalizedContent);
            setCopied(true);

            window.setTimeout(() => {
                setCopied(false);
            }, 1800);
        } catch {
            setCopied(false);
        }
    }

    return (
        <div className="sql-editor-shell">
            <div className="sql-editor-toolbar">
                <div>
                    <strong>Contenido del objeto</strong>
                    <span>
                        {object?.database_label} · {object?.full_name}
                    </span>
                </div>

                <div className="sql-editor-actions">
                    <mark>{lines.length} líneas</mark>

                    <button
                        type="button"
                        className="compact-button"
                        onClick={() => setShowDependencies((current) => !current)}
                    >
                        {showDependencies ? "Ocultar dependencias" : "Ver dependencias"}
                    </button>

                    <button
                        type="button"
                        className="compact-button"
                        onClick={handleCopyContent}
                    >
                        {copied ? "Copiado" : "Copiar contenido"}
                    </button>
                </div>
            </div>

            {showDependencies && (
                <div className="dependency-panel">
                    <div className="dependency-panel-header">
                        <strong>Objetos posiblemente referenciados</strong>
                        <span>{dependencies.length} coincidencias detectadas</span>
                    </div>

                    {dependencies.length > 0 ? (
                        <div className="dependency-list">
                            {dependencies.map((dependency) => {
                                const config = getObjectTypeConfig(dependency.type);

                                return (
                                    <div
                                        className="dependency-item"
                                        key={dependency.row_key}
                                    >
                                        <mark
                                            className={`object-chip mini ${config.className}`}
                                        >
                                            {config.shortLabel}
                                        </mark>

                                        <div>
                                            <strong>
                                                {dependency.schema}.{dependency.name}
                                            </strong>
                                            <span>{dependency.database_label}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state compact">
                            No se detectaron referencias con el catálogo cargado.
                        </div>
                    )}
                </div>
            )}

            <div className="sql-editor-body">
                {lines.map((line, index) => (
                    <div className="sql-editor-line" key={`${index}-${line}`}>
                        <span className="sql-line-number">{index + 1}</span>

                        <code className="sql-line-code">
                            {tokenizeSql(line).map((token, tokenIndex) =>
                                renderSqlToken(token, tokenIndex)
                            )}
                        </code>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DataExplorerWorkspace({
    user,
    databases,
    selectedDatabase,
    selectedDatabaseId,
    allTables,
    allObjects = [],
    selectedTable,
    selectedObject,
    dashboardStatus,
    dashboardError,
    onDatabaseChange,
    onSelectObject,
    onLogout,
    onRefreshCatalog,
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchScope, setSearchScope] = useState("global");
    const [customSearchDatabaseIds, setCustomSearchDatabaseIds] = useState([]);
    const [showDatabaseScopePanel, setShowDatabaseScopePanel] = useState(false);
    const [collapsedSchemas, setCollapsedSchemas] = useState({});
    const [collapsedTypes, setCollapsedTypes] = useState({});
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState("");
    const [definitionData, setDefinitionData] = useState(null);
    const [definitionLoading, setDefinitionLoading] = useState(false);
    const [definitionError, setDefinitionError] = useState("");
    const [contentMode, setContentMode] = useState("auto");
    const [copyFullNameState, setCopyFullNameState] = useState("Copiar nombre");
    const [startRecord, setStartRecord] = useState(1);
    const [endRecord, setEndRecord] = useState(20);

    const sourceObjects = allObjects.length > 0 ? allObjects : allTables;

    const databaseObjects = useMemo(() => {
        if (!selectedDatabaseId) {
            return sourceObjects;
        }

        return sourceObjects.filter(
            (object) => object.database_id === selectedDatabaseId
        );
    }, [sourceObjects, selectedDatabaseId]);

    const globalSearchResults = useMemo(() => {
        const scopedObjects = getSearchSourceObjects({
            allObjects,
            allTables,
            selectedDatabaseId,
            searchScope,
            customSearchDatabaseIds,
        });

        return buildGlobalSearchResults({
            allObjects: scopedObjects,
            query: searchTerm,
        });
    }, [
        allObjects,
        allTables,
        selectedDatabaseId,
        searchScope,
        customSearchDatabaseIds,
        searchTerm,
    ]);

    const groupedGlobalResults = useMemo(() => {
        return groupResultsByDatabase(globalSearchResults);
    }, [globalSearchResults]);

    const isSearching = searchTerm.trim().length > 0;

    const schemas = useMemo(() => {
        return groupObjectsBySchema(databaseObjects);
    }, [databaseObjects]);

    const totalSchemas = useMemo(() => {
        return new Set(databaseObjects.map((object) => object.schema)).size;
    }, [databaseObjects]);

    const totalObjects = databaseObjects.length;

    const totalLogicObjects = databaseObjects.filter((object) =>
        ["PROCEDURE", "FUNCTION", "TRIGGER"].includes(object.type)
    ).length;

    const currentDatabaseName =
        selectedDatabase?.database || selectedDatabase?.name || "-";

    const userName = user?.name || user?.username || "Usuario";
    const userRole = user?.role || "Sin rol";

    const activeObject = selectedObject || selectedTable || null;
    const activeObjectConfig = getObjectTypeConfig(activeObject?.type);

    const supportsPreview =
        activeObject?.supports_preview ||
        activeObjectConfig.supportsPreview ||
        activeObject?.type === "TABLE" ||
        activeObject?.type === "VIEW";

    const supportsDefinition =
        activeObject?.supports_definition ||
        activeObjectConfig.supportsDefinition;

    const activeContentMode =
        contentMode === "auto"
            ? supportsPreview
                ? "preview"
                : "content"
            : contentMode;

    const objectContent =
        definitionData?.definition ||
        activeObject?.base_object_name ||
        buildMetadataContent(activeObject);

    function toggleSchema(schemaName) {
        setCollapsedSchemas((current) => ({
            ...current,
            [schemaName]: !current[schemaName],
        }));
    }

    function toggleType(schemaName, type) {
        const key = `${schemaName}.${type}`;

        setCollapsedTypes((current) => ({
            ...current,
            [key]: !current[key],
        }));
    }

    function resetObjectState() {
        setPreviewData(null);
        setPreviewError("");
        setDefinitionData(null);
        setDefinitionError("");
        setContentMode("auto");
        setStartRecord(1);
        setEndRecord(20);
    }

    function handleDatabaseChange(databaseId) {
        resetObjectState();
        setSearchTerm("");
        setCollapsedSchemas({});
        setCollapsedTypes({});
        onDatabaseChange(databaseId);
    }

    function handleSelectObject(object) {
        resetObjectState();
        onSelectObject(object);
    }

    function handleGlobalResultClick(result) {
        const object = result.object;

        resetObjectState();

        setCollapsedSchemas((current) => ({
            ...current,
            [object.schema]: false,
        }));

        setCollapsedTypes((current) => ({
            ...current,
            [`${object.schema}.${object.type}`]: false,
        }));

        onDatabaseChange(object.database_id);
        onSelectObject(object);
    }

    async function handleCopyFullName() {
        try {
            await navigator.clipboard.writeText(activeObject?.full_name || "");
            setCopyFullNameState("Copiado");

            window.setTimeout(() => {
                setCopyFullNameState("Copiar nombre");
            }, 1600);
        } catch {
            setCopyFullNameState("Error");
        }
    }

    useEffect(() => {
        async function loadPreview() {
            if (!activeObject || !supportsPreview) {
                setPreviewData(null);
                setPreviewError("");
                return;
            }

            try {
                setPreviewLoading(true);
                setPreviewError("");

                const result = await getDatabaseTablePreview(
                    activeObject.database_id,
                    activeObject.schema,
                    activeObject.name,
                    startRecord,
                    endRecord
                );

                setPreviewData(result.data);
            } catch (error) {
                console.error(error);

                setPreviewData(null);
                setPreviewError(
                    error.message || "No fue posible cargar la vista previa."
                );
            } finally {
                setPreviewLoading(false);
            }
        }

        loadPreview();
    }, [activeObject, supportsPreview, startRecord, endRecord]);

    useEffect(() => {
        async function loadDefinition() {
            if (!activeObject || !supportsDefinition) {
                setDefinitionData(null);
                setDefinitionError("");
                return;
            }

            try {
                setDefinitionLoading(true);
                setDefinitionError("");

                const result = await getDatabaseObjectDefinition(
                    activeObject.database_id,
                    activeObject.type,
                    activeObject.schema,
                    activeObject.name
                );

                setDefinitionData(result.data);
            } catch (error) {
                console.error(error);

                setDefinitionData(null);
                setDefinitionError(
                    error.message ||
                        "No fue posible cargar la definición SQL del objeto."
                );
            } finally {
                setDefinitionLoading(false);
            }
        }

        loadDefinition();
    }, [activeObject, supportsDefinition]);

    return (
        <main className="data-explorer-page">
            <header className="explorer-topbar">
                <div className="brand-block">
                    <div className="brand-logo">DDP</div>

                    <div>
                        <strong>Database Object Explorer</strong>
                        <span>
                            Datos, lógica SQL y objetos de soporte controlados
                        </span>
                    </div>
                </div>

                <div className="topbar-status">
                    <div className="topbar-pill">
                        <span>API</span>
                        <strong>Activa</strong>
                    </div>

                    <div className="topbar-pill">
                        <span>DB</span>
                        <strong>Conectada</strong>
                    </div>

                    <div className="topbar-pill wide">
                        <span>Base</span>
                        <strong>{currentDatabaseName}</strong>
                    </div>

                    <div className="user-mini-card">
                        <div className="avatar">{getInitials(userName)}</div>

                        <div>
                            <strong>{userName}</strong>
                            <span>Autenticado · {userRole}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={onLogout}
                    >
                        Cerrar sesión
                    </button>
                </div>
            </header>

            <section className="explorer-body">
                <aside className="explorer-sidebar">
                    <section className="sidebar-card">
                        <div className="sidebar-title-row">
                            <div>
                                <h2>Resumen</h2>
                                <p>Fuente conectada</p>
                            </div>

                            <button
                                type="button"
                                className="compact-button"
                                onClick={onRefreshCatalog}
                            >
                                Actualizar
                            </button>
                        </div>

                        <label className="field-label">Base de datos</label>

                        <div className="database-selector-row">
                            <select
                                className="database-select full-select ddp-select"
                                value={selectedDatabaseId || ""}
                                onChange={(event) =>
                                    handleDatabaseChange(event.target.value)
                                }
                            >
                                {databases.map((database) => (
                                    <option
                                        key={database.id}
                                        value={database.id}
                                    >
                                        {database.label}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                className="scope-toggle-button"
                                onClick={() =>
                                    setShowDatabaseScopePanel(
                                        (current) => !current
                                    )
                                }
                                title="Configurar alcance de búsqueda"
                            >
                                {getSearchScopeLabel(
                                    searchScope,
                                    selectedDatabase,
                                    customSearchDatabaseIds
                                )}
                            </button>
                        </div>

                        {showDatabaseScopePanel && (
                            <div className="database-scope-panel">
                                <div className="scope-mode-grid">
                                    <button
                                        type="button"
                                        className={
                                            searchScope === "global"
                                                ? "scope-mode-button active"
                                                : "scope-mode-button"
                                        }
                                        onClick={() => setSearchScope("global")}
                                    >
                                        Global
                                        <span>Todas las bases</span>
                                    </button>

                                    <button
                                        type="button"
                                        className={
                                            searchScope === "current"
                                                ? "scope-mode-button active"
                                                : "scope-mode-button"
                                        }
                                        onClick={() => setSearchScope("current")}
                                    >
                                        Base actual
                                        <span>
                                            {selectedDatabase?.label ||
                                                "Seleccionada"}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        className={
                                            searchScope === "custom"
                                                ? "scope-mode-button active"
                                                : "scope-mode-button"
                                        }
                                        onClick={() => setSearchScope("custom")}
                                    >
                                        Personalizada
                                        <span>Varias bases</span>
                                    </button>
                                </div>

                                {searchScope === "custom" && (
                                    <div className="database-checkbox-list">
                                        {databases.map((database) => (
                                            <label
                                                key={database.id}
                                                className="database-checkbox-item"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={customSearchDatabaseIds.includes(
                                                        database.id
                                                    )}
                                                    onChange={() =>
                                                        setCustomSearchDatabaseIds(
                                                            (current) =>
                                                                toggleArrayValue(
                                                                    current,
                                                                    database.id
                                                                )
                                                        )
                                                    }
                                                />

                                                <span>{database.label}</span>
                                            </label>
                                        ))}

                                        <button
                                            type="button"
                                            className="scope-clear-button"
                                            onClick={() =>
                                                setCustomSearchDatabaseIds([])
                                            }
                                        >
                                            Limpiar selección
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mini-kpi-grid">
                            <div>
                                <span>Esquemas</span>
                                <strong>{totalSchemas}</strong>
                            </div>

                            <div>
                                <span>Objetos</span>
                                <strong>{totalObjects}</strong>
                            </div>

                            <div>
                                <span>Lógica</span>
                                <strong>{totalLogicObjects}</strong>
                            </div>
                        </div>
                    </section>

                    <section className="sidebar-card table-nav-card">
                        <h2>Explorador global</h2>
                        <p>Busque objetos en las bases configuradas.</p>

                        <input
                            className="search-input full-search"
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(event.target.value)
                            }
                            placeholder="Buscar tabla, vista, procedimiento, columna..."
                        />

                        <div className="search-helper-card">
                            <strong>Búsqueda inteligente</strong>
                            <span>
                                Busca por base, esquema, tabla, vista,
                                procedimiento, función, trigger o columna
                                registrada.
                            </span>
                        </div>

                        {isSearching && (
                            <div className="global-results-panel">
                                <div className="global-results-header">
                                    <strong>Resultados globales</strong>

                                    <span>
                                        {globalSearchResults.length} coincidencias ·{" "}
                                        {getSearchScopeLabel(
                                            searchScope,
                                            selectedDatabase,
                                            customSearchDatabaseIds
                                        )}
                                    </span>
                                </div>

                                {groupedGlobalResults.map((group) => (
                                    <div
                                        className="global-result-group"
                                        key={group.databaseId}
                                    >
                                        <div className="global-result-database">
                                            {group.databaseLabel}
                                        </div>

                                        {group.results.map((result) => {
                                            const object = result.object;
                                            const config = getObjectTypeConfig(
                                                object.type
                                            );

                                            return (
                                                <button
                                                    type="button"
                                                    key={result.id}
                                                    className={
                                                        activeObject?.row_key ===
                                                        object.row_key
                                                            ? "global-result-item selected"
                                                            : "global-result-item"
                                                    }
                                                    onClick={() =>
                                                        handleGlobalResultClick(
                                                            result
                                                        )
                                                    }
                                                >
                                                    <div>
                                                        <span>
                                                            {config.icon}{" "}
                                                            {object.schema}.
                                                            {object.name}
                                                        </span>

                                                        <small>
                                                            {result.matchedField}:{" "}
                                                            {result.matchedValue}
                                                        </small>
                                                    </div>

                                                    <mark
                                                        className={`object-chip ${config.className}`}
                                                    >
                                                        {config.shortLabel}
                                                    </mark>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}

                                {globalSearchResults.length === 0 && (
                                    <div className="empty-state">
                                        No se encontraron coincidencias.
                                    </div>
                                )}
                            </div>
                        )}

                        {!isSearching && (
                            <>
                                <h2 className="schema-section-title">
                                    Esquemas y objetos
                                </h2>

                                <p>Seleccione un objeto para consultar.</p>

                                <div className="schema-tree">
                                    {schemas.map((schema) => {
                                        const isCollapsed =
                                            collapsedSchemas[schema.name];

                                        return (
                                            <div
                                                className="schema-group"
                                                key={schema.name}
                                            >
                                                <button
                                                    type="button"
                                                    className="schema-header-button"
                                                    onClick={() =>
                                                        toggleSchema(
                                                            schema.name
                                                        )
                                                    }
                                                >
                                                    <span>
                                                        {isCollapsed
                                                            ? "▸"
                                                            : "▾"}
                                                    </span>

                                                    <strong>
                                                        Esquema: {schema.name}
                                                    </strong>

                                                    <small>
                                                        {schema.totalObjects}
                                                    </small>

                                                    {schema.sensitiveObjects >
                                                        0 && (
                                                        <mark>
                                                            {
                                                                schema.sensitiveObjects
                                                            }{" "}
                                                            sensibles
                                                        </mark>
                                                    )}
                                                </button>

                                                {!isCollapsed && (
                                                    <div className="schema-type-list">
                                                        {schema.typeGroups.map(
                                                            (group) => {
                                                                const typeKey = `${schema.name}.${group.type}`;
                                                                const isTypeCollapsed =
                                                                    collapsedTypes[
                                                                        typeKey
                                                                    ];

                                                                return (
                                                                    <div
                                                                        className="schema-object-type-group"
                                                                        key={
                                                                            group.type
                                                                        }
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            className={`schema-object-type-header ${group.config.className}`}
                                                                            onClick={() =>
                                                                                toggleType(
                                                                                    schema.name,
                                                                                    group.type
                                                                                )
                                                                            }
                                                                        >
                                                                            <span>
                                                                                {isTypeCollapsed
                                                                                    ? "▸"
                                                                                    : "▾"}
                                                                            </span>

                                                                            <strong>
                                                                                {
                                                                                    group
                                                                                        .config
                                                                                        .icon
                                                                                }{" "}
                                                                                {
                                                                                    group
                                                                                        .config
                                                                                        .label
                                                                                }
                                                                            </strong>

                                                                            <small>
                                                                                {
                                                                                    group
                                                                                        .objects
                                                                                        .length
                                                                                }
                                                                            </small>
                                                                        </button>

                                                                        {!isTypeCollapsed && (
                                                                            <div className="schema-table-list">
                                                                                {group.objects.map(
                                                                                    (
                                                                                        object
                                                                                    ) => {
                                                                                        const config =
                                                                                            getObjectTypeConfig(
                                                                                                object.type
                                                                                            );

                                                                                        const isSelected =
                                                                                            activeObject?.row_key ===
                                                                                            object.row_key;

                                                                                        return (
                                                                                            <button
                                                                                                type="button"
                                                                                                key={
                                                                                                    object.row_key
                                                                                                }
                                                                                                className={
                                                                                                    isSelected
                                                                                                        ? "schema-table-button selected"
                                                                                                        : "schema-table-button"
                                                                                                }
                                                                                                onClick={() =>
                                                                                                    handleSelectObject(
                                                                                                        object
                                                                                                    )
                                                                                                }
                                                                                            >
                                                                                                <span>
                                                                                                    {
                                                                                                        config.icon
                                                                                                    }{" "}
                                                                                                    {
                                                                                                        object.name
                                                                                                    }
                                                                                                </span>

                                                                                                <mark
                                                                                                    className={`object-chip mini ${config.className}`}
                                                                                                >
                                                                                                    {
                                                                                                        config.shortLabel
                                                                                                    }
                                                                                                </mark>
                                                                                            </button>
                                                                                        );
                                                                                    }
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {schemas.length === 0 && (
                                        <div className="empty-state">
                                            No hay objetos disponibles para esta
                                            base.
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </section>
                </aside>

                <section className="explorer-content">
                    {dashboardStatus && (
                        <div className="status-banner">
                            <strong>Estado:</strong> {dashboardStatus}
                        </div>
                    )}

                    {dashboardError && (
                        <div className="error-box">{dashboardError}</div>
                    )}

                    {!activeObject && (
                        <div className="preview-panel empty-preview">
                            <h2>Seleccione un objeto</h2>
                            <p>
                                Busque globalmente o elija una base, esquema y
                                objeto para consultar su vista previa o contenido.
                            </p>
                        </div>
                    )}

                    {activeObject && (
                        <>
                            <section className="selected-table-header">
                                <div>
                                    <span>Vista controlada</span>
                                    <h1>{activeObject.name}</h1>
                                    <p>
                                        {activeObject.database_label} ·{" "}
                                        {activeObject.full_name}
                                    </p>

                                    <div className="object-meta-row">
                                        <mark
                                            className={`object-chip ${activeObjectConfig.className}`}
                                        >
                                            {activeObjectConfig.icon}{" "}
                                            {activeObjectConfig.label}
                                        </mark>

                                        <mark className="object-family-chip">
                                            {activeObjectConfig.family}
                                        </mark>

                                        <mark className="object-readonly-chip">
                                            Solo lectura
                                        </mark>

                                        <button
                                            type="button"
                                            className="object-copy-name-button"
                                            onClick={handleCopyFullName}
                                        >
                                            {copyFullNameState}
                                        </button>
                                    </div>
                                </div>

                                <div className="selected-kpis">
                                    {supportsPreview &&
                                        activeContentMode === "preview" && (
                                            <>
                                                <div>
                                                    <span>Total registros</span>
                                                    <strong>
                                                        {previewData
                                                            ?.total_records ?? "-"}
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>Total columnas</span>
                                                    <strong>
                                                        {previewData?.columns
                                                            ?.length ?? "-"}
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>Columnas sensibles</span>
                                                    <strong>
                                                        {
                                                            activeObject.sensitive_columns_count
                                                        }
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>Mostrados</span>
                                                    <strong>
                                                        {previewData
                                                            ?.returned_records ??
                                                            "-"}
                                                    </strong>
                                                </div>
                                            </>
                                        )}

                                    {activeContentMode === "content" && (
                                        <>
                                            <div>
                                                <span>Tipo</span>
                                                <strong>
                                                    {
                                                        activeObjectConfig.shortLabel
                                                    }
                                                </strong>
                                            </div>

                                            <div>
                                                <span>Creación</span>
                                                <strong>
                                                    {formatDateTime(
                                                        activeObject.create_date
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>Modificación</span>
                                                <strong>
                                                    {formatDateTime(
                                                        activeObject.modify_date
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>Líneas</span>
                                                <strong>
                                                    {getLineCount(objectContent) ||
                                                        "-"}
                                                </strong>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </section>

                            {supportsPreview && supportsDefinition && (
                                <div className="object-content-tabs">
                                    <button
                                        type="button"
                                        className={
                                            activeContentMode === "preview"
                                                ? "object-content-tab active"
                                                : "object-content-tab"
                                        }
                                        onClick={() =>
                                            setContentMode("preview")
                                        }
                                    >
                                        Vista de datos
                                    </button>

                                    <button
                                        type="button"
                                        className={
                                            activeContentMode === "content"
                                                ? "object-content-tab active"
                                                : "object-content-tab"
                                        }
                                        onClick={() =>
                                            setContentMode("content")
                                        }
                                    >
                                        Contenido
                                    </button>
                                </div>
                            )}

                            {supportsPreview &&
                                activeContentMode === "preview" && (
                                    <section className="preview-panel">
                                        <div className="preview-heading">
                                            <div>
                                                <h2>Vista previa de datos</h2>
                                                <p>
                                                    Los campos sensibles se
                                                    enmascaran desde el backend.
                                                </p>
                                            </div>

                                            <div className="range-box">
                                                <span>Rango</span>

                                                <div>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={startRecord}
                                                        onChange={(event) =>
                                                            setStartRecord(
                                                                Number(
                                                                    event.target
                                                                        .value
                                                                )
                                                            )
                                                        }
                                                    />

                                                    <input
                                                        type="number"
                                                        min={startRecord}
                                                        value={endRecord}
                                                        onChange={(event) =>
                                                            setEndRecord(
                                                                Number(
                                                                    event.target
                                                                        .value
                                                                )
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {previewLoading && (
                                            <div className="preview-placeholder">
                                                <h3>Cargando vista previa...</h3>
                                                <p>
                                                    Consultando datos desde el
                                                    backend seguro.
                                                </p>
                                            </div>
                                        )}

                                        {previewError && (
                                            <div className="error-box">
                                                {previewError}
                                            </div>
                                        )}

                                        {!previewLoading &&
                                            !previewError &&
                                            previewData && (
                                                <div className="data-preview-table-wrapper">
                                                    <p className="success-text">
                                                        Vista previa cargada:{" "}
                                                        {
                                                            previewData.returned_records
                                                        }{" "}
                                                        registros mostrados.
                                                    </p>

                                                    <table className="data-preview-table">
                                                        <thead>
                                                            <tr>
                                                                {previewData.columns.map(
                                                                    (
                                                                        columnName
                                                                    ) => (
                                                                        <th
                                                                            key={
                                                                                columnName
                                                                            }
                                                                            className={
                                                                                previewData.sensitive_columns.includes(
                                                                                    columnName
                                                                                )
                                                                                    ? "sensitive-column"
                                                                                    : ""
                                                                            }
                                                                        >
                                                                            {
                                                                                columnName
                                                                            }
                                                                        </th>
                                                                    )
                                                                )}
                                                            </tr>
                                                        </thead>

                                                        <tbody>
                                                            {previewData.data.map(
                                                                (
                                                                    row,
                                                                    rowIndex
                                                                ) => (
                                                                    <tr
                                                                        key={
                                                                            rowIndex
                                                                        }
                                                                    >
                                                                        {previewData.columns.map(
                                                                            (
                                                                                columnName
                                                                            ) => (
                                                                                <td
                                                                                    key={`${rowIndex}-${columnName}`}
                                                                                    className={
                                                                                        previewData.sensitive_columns.includes(
                                                                                            columnName
                                                                                        )
                                                                                            ? "sensitive-column"
                                                                                            : ""
                                                                                    }
                                                                                >
                                                                                    {String(
                                                                                        row[
                                                                                            columnName
                                                                                        ] ??
                                                                                            ""
                                                                                    )}
                                                                                </td>
                                                                            )
                                                                        )}
                                                                    </tr>
                                                                )
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                        {!previewLoading &&
                                            !previewError &&
                                            !previewData && (
                                                <div className="preview-placeholder">
                                                    <h3>Sin vista previa</h3>
                                                    <p>
                                                        Selecciona un objeto de
                                                        datos para cargar sus
                                                        registros.
                                                    </p>
                                                </div>
                                            )}
                                    </section>
                                )}

                            {activeContentMode === "content" && (
                                <section className="preview-panel sql-panel">
                                    <div className="preview-heading">
                                        <div>
                                            <h2>Contenido del objeto</h2>
                                            <p>
                                                Visualización en modo solo
                                                lectura. Si el contenido es SQL,
                                                se resaltan sentencias básicas.
                                            </p>
                                        </div>
                                    </div>

                                    {definitionLoading && supportsDefinition && (
                                        <div className="preview-placeholder">
                                            <h3>Cargando contenido...</h3>
                                            <p>
                                                Consultando definición del objeto.
                                            </p>
                                        </div>
                                    )}

                                    {definitionError && supportsDefinition && (
                                        <div className="error-box">
                                            {definitionError}
                                        </div>
                                    )}

                                    {!definitionLoading && (
                                        <ContentCodeViewer
                                            content={objectContent}
                                            object={activeObject}
                                            allObjects={sourceObjects}
                                        />
                                    )}
                                </section>
                            )}
                        </>
                    )}
                </section>
            </section>
        </main>
    );
}

export default DataExplorerWorkspace;