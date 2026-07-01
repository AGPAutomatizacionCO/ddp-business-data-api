import { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { getQueryColumns, executeSimpleQuery } from "../services/apiClient";
import "../styles/queries.css";

// ── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_LABELS = ["A", "B", "C"];
const SOURCE_COLORS = ["a", "b", "c"];
const MAX_SOURCES = 3;

// ── Pure helpers ──────────────────────────────────────────────────────────────

function createSource(idx) {
    return {
        databaseId: "",
        schema: "",
        table: "",
        columns: [],
        columnsLoading: false,
        columnsError: "",
        columnSearch: "",
        outputColumns: [],
        orderBy: [],
    };
}

// Normalizes European decimal comma to period: "1234,56" → "1234.56"
function normalizeDecimal(val) {
    return /^\d+,\d+$/.test(val) ? val.replace(",", ".") : val;
}

function parseIndexTuples(raw, columnCount) {
    const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    const errors = [];
    const tuples = [];
    const seen = new Set();
    let duplicates = 0;

    lines.forEach((line, i) => {
        const parts = line.split(/\s+/).map(normalizeDecimal);
        if (parts.length !== columnCount) {
            errors.push(
                `Línea ${i + 1} · "${line}": se esperan ${columnCount} valor${
                    columnCount !== 1 ? "es" : ""
                } separados por espacio, se encontraron ${parts.length}.`
            );
        } else {
            const key = parts.join("\x00");
            if (seen.has(key)) {
                duplicates++;
            } else {
                seen.add(key);
                tuples.push(parts);
            }
        }
    });

    return { tuples, errors, duplicates };
}

function buildUnifiedTable(results) {
    const groups = results.map((r, i) => ({
        label: SOURCE_LABELS[i],
        colorKey: SOURCE_COLORS[i],
        columns: r.output_columns || [],
        execMs: r.execution_time_ms ?? 0,
        rowCount: (r.data || []).length,
    }));

    const allColumns = groups.flatMap((g, gi) =>
        g.columns.map((col) => ({ gi, col, label: g.label, colorKey: g.colorKey }))
    );

    const rows = results.flatMap((r, ri) =>
        (r.data || []).map((row) => ({
            _source: ri,
            _colorKey: SOURCE_COLORS[ri],
            cells: allColumns.map(({ gi, col }) =>
                gi === ri ? row[col] : null
            ),
        }))
    );

    return { groups, allColumns, rows };
}

function formatCell(value) {
    if (value === null || value === undefined) return "";
    if (value === "***") return "***";
    return String(value);
}

function exportToExcel(results) {
    if (!results || results.length === 0) return;
    const { allColumns, rows } = buildUnifiedTable(results);
    const multi = results.length > 1;

    const exportRows = rows.map((row) => {
        const record = {};
        allColumns.forEach(({ gi, col, label }, i) => {
            const key = multi ? `${label}_${col}` : col;
            const v = row.cells[i];
            record[key] = v !== null && v !== undefined ? v : "";
        });
        return record;
    });

    if (exportRows.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultado");
    XLSX.writeFile(wb, "consulta_resultado.xlsx");
}

function saveConfigToFile(indexColumns, indexValuesRaw, sources, limit) {
    const config = {
        index_columns: indexColumns,
        index_values_raw: indexValuesRaw,
        limit,
        sources: sources.map((s) => ({
            database_id: s.databaseId,
            schema_name: s.schema,
            table_name: s.table,
            output_columns: s.outputColumns,
            order_by: s.orderBy,
        })),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consulta_operativa.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── ValidationModal ───────────────────────────────────────────────────────────

function ValidationModal({ errors, onClose }) {
    return (
        <div className="oq-modal-backdrop" onClick={onClose}>
            <div className="oq-modal" onClick={(e) => e.stopPropagation()}>
                <div className="oq-modal-header">
                    <span>Inconsistencia en valores del índice</span>
                    <button
                        type="button"
                        className="oq-modal-close"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>
                <div className="oq-modal-body">
                    <p className="oq-modal-intro">
                        Los valores ingresados no coinciden con las columnas índice
                        seleccionadas. Corrige las siguientes líneas:
                    </p>
                    <ul className="oq-modal-errors">
                        {errors.map((err, i) => (
                            <li key={i}>{err}</li>
                        ))}
                    </ul>
                </div>
                <div className="oq-modal-footer">
                    <button
                        type="button"
                        className="oq-btn-primary"
                        onClick={onClose}
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

function OperativeQueryView({ user, databases, connectionStates, onConnectDatabase }) {
    // Shared index
    const [indexColumns, setIndexColumns] = useState([]);
    const [indexValuesRaw, setIndexValuesRaw] = useState("");
    const [indexModal, setIndexModal] = useState(null);

    // Sources (array of source state)
    const [sources, setSources] = useState([createSource(0)]);
    const [limit, setLimit] = useState(5000);

    // Results
    const [queryResults, setQueryResults] = useState(null);
    const [queryLoading, setQueryLoading] = useState(false);
    const [queryError, setQueryError] = useState("");

    const fileInputRef = useRef(null);
    const dragItem = useRef(null);
    const [dragOver, setDragOver] = useState(null);
    const indexDragItem = useRef(null);
    const [indexDragOver, setIndexDragOver] = useState(null);

    // ── Index value stats (dedup preview) ─────────────────────────────────────

    const indexStats = useMemo(() => {
        const total = indexValuesRaw.trim()
            ? indexValuesRaw.split("\n").filter((l) => l.trim().length > 0).length
            : 0;
        if (total === 0 || indexColumns.length === 0) {
            return { total, unique: total, duplicates: 0 };
        }
        const { tuples, duplicates } = parseIndexTuples(indexValuesRaw, indexColumns.length);
        return { total, unique: tuples.length, duplicates };
    }, [indexValuesRaw, indexColumns.length]);

    // ── Source A column pool (drives the index selector) ──────────────────────

    const sourceAColumns = sources[0]?.columns || [];

    // ── Helpers ───────────────────────────────────────────────────────────────

    function updateSource(idx, changes) {
        setSources((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...changes };
            return next;
        });
    }

    function getDbState(databaseId) {
        return connectionStates[databaseId] || { status: "idle", tables: [] };
    }

    function ensureConnected(databaseId) {
        if (!databaseId) return;
        const state = connectionStates[databaseId];
        if (!state || state.status === "idle") {
            onConnectDatabase(databaseId);
        }
    }

    // ── Source handlers ───────────────────────────────────────────────────────

    function handleSourceDatabaseChange(idx, databaseId) {
        updateSource(idx, {
            databaseId,
            schema: "",
            table: "",
            columns: [],
            columnsLoading: false,
            columnsError: "",
            columnSearch: "",
            outputColumns: [],
            orderBy: [],
        });
        ensureConnected(databaseId);
        if (idx === 0) {
            setIndexColumns([]);
        }
        setQueryResults(null);
        setQueryError("");
    }

    function handleSourceSchemaChange(idx, schema) {
        updateSource(idx, {
            schema,
            table: "",
            columns: [],
            columnsLoading: false,
            columnsError: "",
            columnSearch: "",
            outputColumns: [],
            orderBy: [],
        });
        if (idx === 0) setIndexColumns([]);
        setQueryResults(null);
        setQueryError("");
    }

    async function handleSourceTableChange(idx, tableName) {
        const source = sources[idx];
        updateSource(idx, {
            table: tableName,
            columns: [],
            columnsLoading: true,
            columnsError: "",
            columnSearch: "",
            outputColumns: [],
            orderBy: [],
        });
        if (idx === 0) setIndexColumns([]);
        setQueryResults(null);
        setQueryError("");

        try {
            const response = await getQueryColumns(
                source.databaseId,
                source.schema,
                tableName
            );
            const cols = Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response)
                ? response
                : [];
            updateSource(idx, { columns: cols, columnsLoading: false });
        } catch (error) {
            updateSource(idx, {
                columnsLoading: false,
                columnsError: error.message || "No fue posible cargar las columnas.",
            });
        }
    }

    function handleOutputColumnToggle(sourceIdx, name) {
        const src = sources[sourceIdx];
        const isSelected = src.outputColumns.includes(name);
        const nextOutput = isSelected
            ? src.outputColumns.filter((c) => c !== name)
            : [...src.outputColumns, name];
        const nextOrder = isSelected
            ? src.orderBy.filter((c) => nextOutput.includes(c))
            : [...src.orderBy, name];
        updateSource(sourceIdx, { outputColumns: nextOutput, orderBy: nextOrder });
    }

    function handleSelectAll(sourceIdx, filteredCols) {
        const src = sources[sourceIdx];
        const names = filteredCols.map((c) => c.name);
        const merged = [...new Set([...src.outputColumns, ...names])];
        const newNames = names.filter((n) => !src.orderBy.includes(n));
        const nextOrder = [...src.orderBy, ...newNames];
        updateSource(sourceIdx, { outputColumns: merged, orderBy: nextOrder });
    }

    function handleDeselectAll(sourceIdx, filteredCols) {
        const src = sources[sourceIdx];
        const names = new Set(filteredCols.map((c) => c.name));
        const next = src.outputColumns.filter((c) => !names.has(c));
        const nextOrder = src.orderBy.filter((c) => next.includes(c));
        updateSource(sourceIdx, { outputColumns: next, orderBy: nextOrder });
    }

    function handleOrderDragStart(sourceIdx, name, e) {
        dragItem.current = { sourceIdx, name };
        e.dataTransfer.effectAllowed = "move";
    }

    function handleOrderDragEnter(sourceIdx, name) {
        setDragOver({ sourceIdx, name });
    }

    function handleOrderDragEnd() {
        dragItem.current = null;
        setDragOver(null);
    }

    function handleOrderDrop(sourceIdx, targetName, e) {
        e.preventDefault();
        if (!dragItem.current || dragItem.current.sourceIdx !== sourceIdx) return;
        const fromName = dragItem.current.name;
        if (fromName === targetName) return;
        const order = [...sources[sourceIdx].orderBy];
        const fromIdx = order.indexOf(fromName);
        const toIdx = order.indexOf(targetName);
        order.splice(fromIdx, 1);
        order.splice(toIdx, 0, fromName);
        updateSource(sourceIdx, { orderBy: order });
        setDragOver(null);
    }

    function addSource() {
        if (sources.length >= MAX_SOURCES) return;
        setSources((prev) => [...prev, createSource(prev.length)]);
    }

    function removeSource(idx) {
        setSources((prev) => prev.filter((_, i) => i !== idx));
        setQueryResults(null);
        setQueryError("");
    }

    // ── Index column handlers ─────────────────────────────────────────────────

    function handleIndexColumnToggle(name) {
        setIndexColumns((prev) => {
            if (prev.includes(name)) return prev.filter((c) => c !== name);
            if (prev.length >= 3) return prev;
            return [...prev, name];
        });
    }

    function handleIndexDragStart(name, e) {
        indexDragItem.current = name;
        e.dataTransfer.effectAllowed = "move";
    }

    function handleIndexDragEnter(name) {
        setIndexDragOver(name);
    }

    function handleIndexDragEnd() {
        indexDragItem.current = null;
        setIndexDragOver(null);
    }

    function handleIndexDrop(targetName, e) {
        e.preventDefault();
        const fromName = indexDragItem.current;
        if (!fromName || fromName === targetName) return;
        setIndexColumns((prev) => {
            const order = [...prev];
            const fromIdx = order.indexOf(fromName);
            const toIdx = order.indexOf(targetName);
            order.splice(fromIdx, 1);
            order.splice(toIdx, 0, fromName);
            return order;
        });
        setIndexDragOver(null);
    }

    // ── Execute ───────────────────────────────────────────────────────────────

    const activeSources = sources.filter(
        (s) => s.databaseId && s.schema && s.table && s.outputColumns.length > 0
    );

    const canExecute =
        indexColumns.length > 0 &&
        indexValuesRaw.trim().length > 0 &&
        activeSources.length > 0 &&
        !queryLoading;

    async function handleExecute() {
        if (!canExecute) return;

        const { tuples, errors } = parseIndexTuples(indexValuesRaw, indexColumns.length);

        if (errors.length > 0) {
            setIndexModal({ errors });
            return;
        }

        if (tuples.length === 0) return;

        setQueryLoading(true);
        setQueryError("");
        setQueryResults(null);

        try {
            const results = await Promise.all(
                activeSources.map((source) =>
                    executeSimpleQuery({
                        database_id: source.databaseId,
                        schema_name: source.schema,
                        table_name: source.table,
                        index_columns: indexColumns,
                        index_tuples: tuples,
                        output_columns: source.outputColumns,
                        order_by: source.orderBy,
                        limit,
                    }).then((resp) => resp?.data || resp)
                )
            );
            setQueryResults(results);
        } catch (error) {
            setQueryError(error.message || "La consulta no pudo ejecutarse.");
        } finally {
            setQueryLoading(false);
        }
    }

    // ── Save / Load config ────────────────────────────────────────────────────

    function handleSaveConfig() {
        saveConfigToFile(indexColumns, indexValuesRaw, sources, limit);
    }

    function handleLoadConfigFile(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const cfg = JSON.parse(e.target.result);
                if (Array.isArray(cfg.index_columns)) setIndexColumns(cfg.index_columns);
                if (typeof cfg.index_values_raw === "string")
                    setIndexValuesRaw(cfg.index_values_raw);
                if (cfg.limit) setLimit(Number(cfg.limit) || 500);
                if (Array.isArray(cfg.sources)) {
                    const restored = cfg.sources.map((s, i) => {
                        const outCols = s.output_columns || [];
                        const savedOrder = (s.order_by || []).filter((c) =>
                            outCols.includes(c)
                        );
                        const missing = outCols.filter(
                            (c) => !savedOrder.includes(c)
                        );
                        const hasFullConfig = !!(
                            s.database_id && s.schema_name && s.table_name
                        );
                        return {
                            ...createSource(i),
                            databaseId: s.database_id || "",
                            schema: s.schema_name || "",
                            table: s.table_name || "",
                            outputColumns: outCols,
                            orderBy: [...savedOrder, ...missing],
                            columnsLoading: hasFullConfig,
                        };
                    });
                    setSources(restored);
                    restored.forEach((s) => ensureConnected(s.databaseId));

                    // Re-fetch column metadata so the column list is editable
                    restored.forEach((s, idx) => {
                        if (!s.databaseId || !s.schema || !s.table) return;
                        getQueryColumns(s.databaseId, s.schema, s.table)
                            .then((response) => {
                                const cols = Array.isArray(response?.data)
                                    ? response.data
                                    : Array.isArray(response)
                                    ? response
                                    : [];
                                updateSource(idx, {
                                    columns: cols,
                                    columnsLoading: false,
                                });
                            })
                            .catch(() => {
                                updateSource(idx, {
                                    columnsLoading: false,
                                    columnsError:
                                        "No fue posible recargar las columnas.",
                                });
                            });
                    });
                }
                setQueryResults(null);
                setQueryError("");
            } catch {
                // invalid json — ignore silently
            }
        };
        reader.readAsText(file);
        event.target.value = "";
    }

    // ── Render helpers ────────────────────────────────────────────────────────

    function renderIndexSection() {
        const hasSourceAColumns = sourceAColumns.length > 0;

        const placeholder =
            indexColumns.length === 2
                ? "Ej: 4500012345 CC001\n4500012346 CC002"
                : indexColumns.length === 3
                ? "Ej: 4500012345 CC001 0001\n4500012346 CC002 0002"
                : "Ej: 4500012345\n4500012346\n4500012347";

        return (
            <div className="oq-index-section">
                <div className="oq-index-header">
                    <span className="oq-section-title">Índice compartido</span>
                    <span className="oq-section-hint">
                        Se aplica a todas las fuentes
                    </span>
                </div>

                <div className="oq-index-layout">
                    <div className="oq-index-col">
                        <label className="oq-label">
                            Columnas índice
                            <span className="oq-label-hint"> (máx. 3)</span>
                        </label>

                        {!hasSourceAColumns ? (
                            <p className="oq-index-placeholder">
                                Configura la Fuente A para seleccionar columnas índice.
                            </p>
                        ) : (
                            <div className="oq-column-list oq-column-list--index">
                                {sourceAColumns.map((c) => {
                                    const checked = indexColumns.includes(c.name);
                                    const disabled =
                                        !checked && indexColumns.length >= 3;
                                    const position = indexColumns.indexOf(c.name);
                                    return (
                                        <label
                                            key={c.name}
                                            className={`oq-column-item${disabled ? " oq-column-item--disabled" : ""}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={disabled}
                                                onChange={() =>
                                                    handleIndexColumnToggle(c.name)
                                                }
                                            />
                                            <span className="oq-column-name">
                                                {c.name}
                                            </span>
                                            {checked && (
                                                <span className="oq-index-order">
                                                    {position + 1}
                                                </span>
                                            )}
                                            <span className="oq-column-type">
                                                {c.type}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {indexColumns.length > 1 && (
                            <div className="oq-index-reorder">
                                <span className="oq-label-hint">Arrastra para reordenar</span>
                                <div className="oq-order-list">
                                    {indexColumns.map((name, pos) => (
                                        <div
                                            key={name}
                                            className={`oq-order-item${indexDragOver === name ? " oq-order-item--over" : ""}`}
                                            draggable
                                            onDragStart={(e) => handleIndexDragStart(name, e)}
                                            onDragEnter={() => handleIndexDragEnter(name)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDragEnd={handleIndexDragEnd}
                                            onDrop={(e) => handleIndexDrop(name, e)}
                                        >
                                            <span className="oq-order-handle">⠿</span>
                                            <span className="oq-order-pos">{pos + 1}</span>
                                            <span className="oq-order-name">{name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="oq-index-col">
                        <label className="oq-label">
                            Valores
                            {indexColumns.length > 0 && (
                                <span className="oq-label-hint">
                                    {" "}— {indexColumns.join(" · ")} · uno por línea, separados por espacio
                                </span>
                            )}
                        </label>
                        <textarea
                            className="oq-textarea"
                            rows={6}
                            disabled={indexColumns.length === 0}
                            value={indexValuesRaw}
                            placeholder={
                                indexColumns.length === 0
                                    ? "Selecciona columnas índice primero"
                                    : placeholder
                            }
                            onChange={(e) => setIndexValuesRaw(e.target.value)}
                        />
                        {indexStats.total > 0 && (
                            <span className="oq-value-count">
                                {indexStats.unique.toLocaleString()} única
                                {indexStats.unique !== 1 ? "s" : ""}
                                {indexStats.duplicates > 0 && (
                                    <span className="oq-dup-badge">
                                        · {indexStats.duplicates.toLocaleString()} duplicada
                                        {indexStats.duplicates !== 1 ? "s" : ""} eliminada
                                        {indexStats.duplicates !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    function renderSourcePanel(idx) {
        const source = sources[idx];
        const dbState = getDbState(source.databaseId);
        const allTables = dbState.tables || [];
        const colorKey = SOURCE_COLORS[idx];
        const label = `Fuente ${SOURCE_LABELS[idx]}`;

        const availableSchemas = [
            ...new Set(allTables.map((t) => t.schema)),
        ].sort();

        const tablesForSchema = allTables.filter(
            (t) => t.schema === source.schema
        );

        const filteredColumns = source.columnSearch.trim()
            ? source.columns.filter((c) =>
                  c.name.toLowerCase().includes(source.columnSearch.toLowerCase())
              )
            : source.columns;

        // Warn if index columns don't exist in this source
        const missingIdx =
            source.columns.length > 0 && indexColumns.length > 0
                ? indexColumns.filter(
                      (ic) => !source.columns.find((c) => c.name === ic)
                  )
                : [];

        return (
            <div
                key={idx}
                className={`oq-source-panel oq-source-panel--${colorKey}`}
            >
                <div className="oq-source-panel-header">
                    <span className={`oq-source-badge oq-source-badge--${colorKey}`}>
                        {label}
                    </span>
                    {idx > 0 && (
                        <button
                            type="button"
                            className="oq-source-remove"
                            onClick={() => removeSource(idx)}
                        >
                            Quitar
                        </button>
                    )}
                </div>

                {missingIdx.length > 0 && (
                    <div className="oq-source-warning">
                        Columnas índice ausentes en esta tabla:
                        <strong> {missingIdx.join(", ")}</strong>
                    </div>
                )}

                <div className="oq-section">
                    <label className="oq-label">Fuente de datos</label>
                    <select
                        className="oq-select"
                        value={source.databaseId}
                        onChange={(e) =>
                            handleSourceDatabaseChange(idx, e.target.value)
                        }
                    >
                        <option value="">— Seleccionar —</option>
                        {databases.map((db) => (
                            <option key={db.id} value={db.id}>
                                {db.label} ({db.database})
                            </option>
                        ))}
                    </select>

                    {dbState.status === "loading" && (
                        <div className="oq-status-info">
                            <span className="oq-spinner" /> Conectando…
                        </div>
                    )}
                    {dbState.status === "error" && (
                        <div className="oq-status-error">{dbState.error}</div>
                    )}
                </div>

                {dbState.status === "loaded" && (
                    <>
                        <div className="oq-section">
                            <label className="oq-label">Esquema</label>
                            <select
                                className="oq-select"
                                value={source.schema}
                                onChange={(e) =>
                                    handleSourceSchemaChange(idx, e.target.value)
                                }
                            >
                                <option value="">— Seleccionar esquema —</option>
                                {availableSchemas.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {source.schema && (
                            <div className="oq-section">
                                <label className="oq-label">Tabla / Vista</label>
                                <select
                                    className="oq-select"
                                    value={source.table}
                                    onChange={(e) =>
                                        handleSourceTableChange(idx, e.target.value)
                                    }
                                >
                                    <option value="">— Seleccionar tabla —</option>
                                    {tablesForSchema.map((t) => (
                                        <option key={t.name} value={t.name}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </>
                )}

                {source.columnsLoading && (
                    <div className="oq-status-info">
                        <span className="oq-spinner" /> Cargando columnas…
                    </div>
                )}
                {source.columnsError && (
                    <div className="oq-status-error">{source.columnsError}</div>
                )}

                {source.columns.length > 0 && (
                    <>
                        <div className="oq-divider">Columnas de salida</div>
                        <div className="oq-section">
                            <div className="oq-column-toolbar">
                                <input
                                    className="oq-column-search"
                                    type="text"
                                    placeholder="Buscar…"
                                    value={source.columnSearch}
                                    onChange={(e) =>
                                        updateSource(idx, {
                                            columnSearch: e.target.value,
                                        })
                                    }
                                />
                                <button
                                    type="button"
                                    className="oq-btn-micro"
                                    onClick={() =>
                                        handleSelectAll(idx, filteredColumns)
                                    }
                                >
                                    Todo
                                </button>
                                <button
                                    type="button"
                                    className="oq-btn-micro"
                                    onClick={() =>
                                        handleDeselectAll(idx, filteredColumns)
                                    }
                                >
                                    Nada
                                </button>
                            </div>
                            <div className="oq-column-list">
                                {filteredColumns.map((c) => (
                                    <label key={c.name} className="oq-column-item">
                                        <input
                                            type="checkbox"
                                            checked={source.outputColumns.includes(c.name)}
                                            onChange={() =>
                                                handleOutputColumnToggle(idx, c.name)
                                            }
                                        />
                                        <span className="oq-column-name">
                                            {c.name}
                                            {c.is_sensitive && (
                                                <span className="oq-badge-sensitive">
                                                    sensible
                                                </span>
                                            )}
                                        </span>
                                        <span className="oq-column-type">{c.type}</span>
                                    </label>
                                ))}
                            </div>
                            {source.outputColumns.length > 0 && (
                                <span className="oq-value-count">
                                    {source.outputColumns.length} columna
                                    {source.outputColumns.length !== 1 ? "s" : ""}{" "}
                                    seleccionada
                                    {source.outputColumns.length !== 1 ? "s" : ""}
                                </span>
                            )}
                        </div>

                        {source.orderBy.length > 0 && (
                            <>
                                <div className="oq-divider">
                                    Ordenar por
                                    <span className="oq-label-hint"> · arrastra para reordenar</span>
                                </div>
                                <div className="oq-section">
                                    <div className="oq-order-list">
                                        {source.orderBy.map((name, pos) => {
                                            const isOver =
                                                dragOver?.sourceIdx === idx &&
                                                dragOver?.name === name;
                                            return (
                                                <div
                                                    key={name}
                                                    className={`oq-order-item${isOver ? " oq-order-item--over" : ""}`}
                                                    draggable
                                                    onDragStart={(e) => handleOrderDragStart(idx, name, e)}
                                                    onDragEnter={() => handleOrderDragEnter(idx, name)}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDragEnd={handleOrderDragEnd}
                                                    onDrop={(e) => handleOrderDrop(idx, name, e)}
                                                >
                                                    <span className="oq-order-handle">⠿</span>
                                                    <span className="oq-order-pos">{pos + 1}</span>
                                                    <span className="oq-order-name">{name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        );
    }

    function renderResultsPanel() {
        if (queryError) {
            return (
                <div className="oq-results-placeholder oq-results-placeholder--error">
                    <p>{queryError}</p>
                </div>
            );
        }

        if (!queryResults) {
            return (
                <div className="oq-results-placeholder">
                    <p>
                        Configure el índice y las fuentes, luego presione{" "}
                        <strong>Ejecutar</strong>.
                    </p>
                </div>
            );
        }

        const { groups, allColumns, rows } = buildUnifiedTable(queryResults);
        const totalRows = rows.length;
        const totalMs = groups.reduce((acc, g) => acc + g.execMs, 0);
        const totalDupsRemoved = queryResults.reduce(
            (acc, r) => acc + (r?.duplicates_removed ?? 0),
            0
        );

        return (
            <div className="oq-results">
                <div className="oq-results-header">
                    <div className="oq-results-meta-group">
                        <span className="oq-results-meta">
                            {totalRows.toLocaleString()} fila{totalRows !== 1 ? "s" : ""} ·{" "}
                            {totalMs} ms total
                        </span>
                        {totalDupsRemoved > 0 && (
                            <span className="oq-dup-badge">
                                {totalDupsRemoved.toLocaleString()} duplicada
                                {totalDupsRemoved !== 1 ? "s" : ""} de índice eliminada
                                {totalDupsRemoved !== 1 ? "s" : ""}
                            </span>
                        )}
                        {groups.length > 1 &&
                            groups.map((g) => (
                                <span
                                    key={g.label}
                                    className={`oq-results-source-meta oq-results-source-meta--${g.colorKey}`}
                                >
                                    {g.label}: {g.rowCount} filas · {g.execMs} ms
                                </span>
                            ))}
                    </div>
                    <button
                        type="button"
                        className="oq-btn-export"
                        disabled={totalRows === 0}
                        onClick={() => exportToExcel(queryResults)}
                    >
                        Exportar Excel
                    </button>
                </div>

                {rows.length > 0 ? (
                    <div className="oq-table-wrapper">
                        <table className="oq-table">
                            <thead>
                                <tr>
                                    {allColumns.map(({ gi, col, label, colorKey }, i) => (
                                        <th
                                            key={i}
                                            className={`oq-th-source--${colorKey}`}
                                            title={
                                                groups.length > 1
                                                    ? `Fuente ${label}`
                                                    : undefined
                                            }
                                        >
                                            {groups.length > 1 && (
                                                <span
                                                    className={`oq-th-badge oq-th-badge--${colorKey}`}
                                                >
                                                    {label}
                                                </span>
                                            )}
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr
                                        key={i}
                                        className={`oq-tr-source--${row._colorKey}`}
                                    >
                                        {row.cells.map((cell, ci) => (
                                            <td key={ci}>{formatCell(cell)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="oq-results-placeholder">
                        <p>La consulta no retornó registros.</p>
                    </div>
                )}
            </div>
        );
    }

    // ── Main render ───────────────────────────────────────────────────────────

    return (
        <div className="oq-workspace">
            {indexModal && (
                <ValidationModal
                    errors={indexModal.errors}
                    onClose={() => setIndexModal(null)}
                />
            )}

            <div className="oq-header">
                <div className="oq-header-icon">05</div>
                <div>
                    <h1 className="oq-title">Consulta operativa</h1>
                    <p className="oq-subtitle">Constructor visual de consulta</p>
                </div>
            </div>

            <div className="oq-main-layout">
                {/* Left: config panel */}
                <div className="oq-config-panel">
                    {renderIndexSection()}

                    <div className="oq-sources-section">
                        <div className="oq-sources-header">
                            <span className="oq-section-title">Fuentes</span>
                        </div>
                        <div className="oq-sources-list">
                            {sources.map((_, idx) => renderSourcePanel(idx))}
                        </div>

                        {sources.length < MAX_SOURCES && (
                            <button
                                type="button"
                                className="oq-btn-add-source"
                                disabled={
                                    sources[sources.length - 1].columns.length === 0
                                }
                                onClick={addSource}
                            >
                                + Agregar Fuente {SOURCE_LABELS[sources.length]}
                            </button>
                        )}
                    </div>

                    <div className="oq-config-footer">
                        <div className="oq-section oq-section--inline">
                            <label className="oq-label">Límite</label>
                            <input
                                type="number"
                                className="oq-input-number"
                                min={1}
                                max={100000}
                                value={limit}
                                onChange={(e) =>
                                    setLimit(
                                        Math.min(
                                            100000,
                                            Math.max(1, Number(e.target.value) || 1)
                                        )
                                    )
                                }
                            />
                            <span className="oq-label-hint">filas por fuente</span>
                        </div>

                        <div className="oq-actions">
                            <button
                                type="button"
                                className="oq-btn-primary"
                                disabled={!canExecute}
                                onClick={handleExecute}
                            >
                                {queryLoading ? (
                                    <>
                                        <span className="oq-spinner" /> Consultando…
                                    </>
                                ) : (
                                    "Ejecutar consulta"
                                )}
                            </button>

                            <button
                                type="button"
                                className="oq-btn-secondary"
                                disabled={sources[0].columns.length === 0}
                                onClick={handleSaveConfig}
                            >
                                Guardar configuración
                            </button>

                            <button
                                type="button"
                                className="oq-btn-secondary"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Cargar configuración
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                style={{ display: "none" }}
                                onChange={handleLoadConfigFile}
                            />
                        </div>
                    </div>
                </div>

                {/* Right: results */}
                <div className="oq-results-panel">{renderResultsPanel()}</div>
            </div>
        </div>
    );
}

export default OperativeQueryView;
