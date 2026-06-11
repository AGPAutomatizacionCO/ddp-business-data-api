import { useEffect, useMemo, useState } from "react";

import { getDatabaseTablePreview } from "../services/apiClient";

function groupTablesBySchema(tables) {
    const grouped = {};

    for (const table of tables) {
        const schema = table.schema || "unknown_schema";

        if (!grouped[schema]) {
            grouped[schema] = {
                name: schema,
                totalTables: 0,
                sensitiveTables: 0,
                tables: [],
            };
        }

        grouped[schema].tables.push(table);
        grouped[schema].totalTables += 1;

        if (table.has_sensitive_data) {
            grouped[schema].sensitiveTables += 1;
        }
    }

    return Object.values(grouped);
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

function DataExplorerWorkspace({
    user,
    databases,
    databaseSummaries,
    selectedDatabase,
    selectedDatabaseId,
    allTables,
    selectedTable,
    dashboardStatus,
    dashboardError,
    onDatabaseChange,
    onSelectTable,
    onLogout,
    onRefreshCatalog,
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [collapsedSchemas, setCollapsedSchemas] = useState({});
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState("");
    const [startRecord, setStartRecord] = useState(1);
    const [endRecord, setEndRecord] = useState(20);

    const databaseTables = useMemo(() => {
        if (!selectedDatabaseId) {
            return allTables;
        }

        return allTables.filter(
            (table) => table.database_id === selectedDatabaseId
        );
    }, [allTables, selectedDatabaseId]);

    const filteredTables = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        if (!normalizedSearch) {
            return databaseTables;
        }

        return databaseTables.filter((table) => {
            const searchableText = [
                table.database_label,
                table.schema,
                table.name,
                table.full_name,
                table.sensitive_columns?.join(" "),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(normalizedSearch);
        });
    }, [databaseTables, searchTerm]);

    const schemas = useMemo(() => {
        return groupTablesBySchema(filteredTables);
    }, [filteredTables]);

    const selectedSummary = databaseSummaries?.[selectedDatabaseId];

    const totalSchemas =
        selectedSummary?.summary?.total_schemas ??
        schemas.length ??
        0;

    const totalTables =
        selectedSummary?.summary?.total_tables ??
        databaseTables.length ??
        0;

    const totalSensitiveTables = databaseTables.filter(
        (table) => table.has_sensitive_data
    ).length;

    const currentDatabaseLabel =
        selectedDatabase?.label ||
        selectedTable?.database_label ||
        "Sin base seleccionada";

    const currentDatabaseName =
        selectedDatabase?.database ||
        selectedDatabase?.name ||
        "-";

    const userName =
        user?.name ||
        user?.username ||
        "Usuario";

    const userRole =
        user?.role ||
        "Sin rol";

    function toggleSchema(schemaName) {
        setCollapsedSchemas((current) => ({
            ...current,
            [schemaName]: !current[schemaName],
        }));
    }

    function handleDatabaseChange(databaseId) {
        setPreviewData(null);
        setPreviewError("");
        setStartRecord(1);
        setEndRecord(20);
        setSearchTerm("");
        setCollapsedSchemas({});
        onDatabaseChange(databaseId);
    }

    function handleSelectTable(table) {
        setPreviewData(null);
        setPreviewError("");
        setStartRecord(1);
        setEndRecord(20);
        onSelectTable(table);
    }

    useEffect(() => {
        async function loadPreview() {
            if (!selectedTable) {
                setPreviewData(null);
                setPreviewError("");
                return;
            }

            try {
                setPreviewLoading(true);
                setPreviewError("");

                const result = await getDatabaseTablePreview(
                    selectedTable.database_id,
                    selectedTable.schema,
                    selectedTable.name,
                    startRecord,
                    endRecord
                );

                setPreviewData(result.data);
            } catch (error) {
                console.error(error);

                setPreviewData(null);
                setPreviewError(
                    error.message ||
                    "No fue posible cargar la vista previa."
                );
            } finally {
                setPreviewLoading(false);
            }
        }

        loadPreview();
    }, [selectedTable, startRecord, endRecord]);

    return (
        <main className="data-explorer-page">
            <header className="explorer-topbar">
                <div className="brand-block">
                    <div className="brand-logo">DDP</div>

                    <div>
                        <strong>Data Explorer</strong>
                        <span>
                            Gestión, monitoreo y exploración controlada de datos
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
                        <div className="avatar">
                            {getInitials(userName)}
                        </div>

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

                        <label className="field-label">
                            Base de datos
                        </label>

                        <select
                            className="database-select full-select"
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

                        <div className="mini-kpi-grid">
                            <div>
                                <span>Esquemas</span>
                                <strong>{totalSchemas}</strong>
                            </div>

                            <div>
                                <span>Tablas</span>
                                <strong>{totalTables}</strong>
                            </div>

                            <div>
                                <span>Sensibles</span>
                                <strong>{totalSensitiveTables}</strong>
                            </div>
                        </div>
                    </section>

                    <section className="sidebar-card table-nav-card">
                        <h2>Esquemas y tablas</h2>
                        <p>Seleccione una tabla para consultar.</p>

                        <input
                            className="search-input full-search"
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(event.target.value)
                            }
                            placeholder="Buscar esquema o tabla..."
                        />

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
                                                toggleSchema(schema.name)
                                            }
                                        >
                                            <span>
                                                {isCollapsed ? "▸" : "▾"}
                                            </span>

                                            <strong>
                                                Esquema: {schema.name}
                                            </strong>

                                            <small>
                                                {schema.totalTables}
                                            </small>

                                            {schema.sensitiveTables > 0 && (
                                                <mark>
                                                    {schema.sensitiveTables} sensibles
                                                </mark>
                                            )}
                                        </button>

                                        {!isCollapsed && (
                                            <div className="schema-table-list">
                                                {schema.tables.map((table) => {
                                                    const isSelected =
                                                        selectedTable?.row_key ===
                                                        table.row_key;

                                                    return (
                                                        <button
                                                            type="button"
                                                            key={table.row_key}
                                                            className={
                                                                isSelected
                                                                    ? "schema-table-button selected"
                                                                    : "schema-table-button"
                                                            }
                                                            onClick={() =>
                                                                handleSelectTable(
                                                                    table
                                                                )
                                                            }
                                                        >
                                                            <span>
                                                                {table.name}
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
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {schemas.length === 0 && (
                                <div className="empty-state">
                                    No hay tablas disponibles para esta base.
                                </div>
                            )}
                        </div>
                    </section>
                </aside>

                <section className="explorer-content">
                    {dashboardStatus && (
                        <div className="status-banner">
                            <strong>Estado:</strong> {dashboardStatus}
                        </div>
                    )}

                    {dashboardError && (
                        <div className="error-box">
                            {dashboardError}
                        </div>
                    )}

                    {!selectedTable && (
                        <div className="preview-panel empty-preview">
                            <h2>Seleccione una tabla</h2>
                            <p>
                                Elija una base, luego un esquema y una tabla
                                para consultar su vista previa.
                            </p>
                        </div>
                    )}

                    {selectedTable && (
                        <>
                            <section className="selected-table-header">
                                <div>
                                    <span>Vista controlada</span>
                                    <h1>{selectedTable.name}</h1>
                                    <p>
                                        {currentDatabaseLabel} ·{" "}
                                        {selectedTable.full_name}
                                    </p>
                                </div>

                                <div className="selected-kpis">
                                    <div>
                                        <span>Total registros</span>
                                        <strong>
                                            {previewData?.total_records ?? "-"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Total columnas</span>
                                        <strong>
                                            {previewData?.columns?.length ?? "-"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Columnas sensibles</span>
                                        <strong>
                                            {
                                                selectedTable.sensitive_columns_count
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Mostrados</span>
                                        <strong>
                                            {previewData?.returned_records ?? "-"}
                                        </strong>
                                    </div>
                                </div>
                            </section>

                            <section className="preview-panel">
                                <div className="preview-heading">
                                    <div>
                                        <h2>Vista previa de datos</h2>
                                        <p>
                                            Los campos sensibles se enmascaran
                                            desde el backend.
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
                                                            event.target.value
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
                                                            event.target.value
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
                                            Consultando datos desde el backend
                                            seguro.
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
                                                            (columnName) => (
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
                                                        (row, rowIndex) => (
                                                            <tr key={rowIndex}>
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
                                                Selecciona una tabla para cargar
                                                sus registros.
                                            </p>
                                        </div>
                                    )}
                            </section>
                        </>
                    )}
                </section>
            </section>
        </main>
    );
}

export default DataExplorerWorkspace;