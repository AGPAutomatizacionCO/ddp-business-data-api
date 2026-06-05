const API_BASE_URL = "";

const refreshStatusBtn = document.getElementById("refreshStatusBtn");
const apiStatusEl = document.getElementById("apiStatus");
const dbStatusEl = document.getElementById("dbStatus");
const dbNameEl = document.getElementById("dbName");
const totalSchemasEl = document.getElementById("totalSchemas");
const totalTablesEl = document.getElementById("totalTables");

const loadTablesBtn = document.getElementById("loadTablesBtn");
const tablesContainer = document.getElementById("tablesContainer");
const selectedTableTitle = document.getElementById("selectedTableTitle");
const selectedTableSubtitle = document.getElementById("selectedTableSubtitle");

const totalRecordsEl = document.getElementById("totalRecords");
const totalColumnsEl = document.getElementById("totalColumns");
const sensitiveColumnsEl = document.getElementById("sensitiveColumns");
const returnedRecordsEl = document.getElementById("returnedRecords");

const startRecordInput = document.getElementById("startRecord");
const endRecordInput = document.getElementById("endRecord");
const previewBtn = document.getElementById("previewBtn");

const statusMessage = document.getElementById("statusMessage");
const previewTable = document.getElementById("previewTable");
const previewThead = previewTable.querySelector("thead");
const previewTbody = previewTable.querySelector("tbody");

let selectedSchema = null;
let selectedTable = null;
let selectedButton = null;

function setStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
}

function setBadge(element, text, status) {
    element.textContent = text;
    element.classList.remove("status-ok", "status-error");

    if (status === "ok") {
        element.classList.add("status-ok");
    }

    if (status === "error") {
        element.classList.add("status-error");
    }
}

function resetSummary() {
    totalRecordsEl.textContent = "-";
    totalColumnsEl.textContent = "-";
    sensitiveColumnsEl.textContent = "-";
    returnedRecordsEl.textContent = "-";
}

function clearPreviewTable() {
    previewThead.innerHTML = "";
    previewTbody.innerHTML = "";
}

async function loadHealthSummary() {
    try {
        setBadge(apiStatusEl, "Validando...", "");
        setBadge(dbStatusEl, "Validando...", "");
        dbNameEl.textContent = "-";
        totalSchemasEl.textContent = "-";
        totalTablesEl.textContent = "-";

        const response = await fetch(`${API_BASE_URL}/health/summary`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "No fue posible validar el estado.");
        }

        const api = result.api;
        const database = result.database;
        const summary = result.summary;

        setBadge(apiStatusEl, api.status === "ok" ? "Activa" : "Error", api.status);
        setBadge(
            dbStatusEl,
            database.database_connection === "available" ? "Conectada" : "No disponible",
            database.status
        );

        dbNameEl.textContent = database.database_name || "-";
        totalSchemasEl.textContent = summary.total_schemas ?? 0;
        totalTablesEl.textContent = summary.total_tables ?? 0;

        setStatus("Estado general actualizado correctamente.", "success");
    } catch (error) {
        setBadge(apiStatusEl, "Error", "error");
        setBadge(dbStatusEl, "Error", "error");
        setStatus(error.message, "error");
    }
}

function groupTablesBySchema(tables) {
    return tables.reduce((groups, table) => {
        const schema = table.schema_name;

        if (!groups[schema]) {
            groups[schema] = [];
        }

        groups[schema].push(table);

        return groups;
    }, {});
}

async function loadTables() {
    try {
        setStatus("Cargando esquemas y tablas disponibles...");
        tablesContainer.innerHTML = "<p class='muted'>Cargando...</p>";

        const response = await fetch(`${API_BASE_URL}/api/database/tables`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "No fue posible cargar las tablas.");
        }

        const tables = result.data || [];
        const groupedTables = groupTablesBySchema(tables);

        renderTables(groupedTables);
        setStatus(`Tablas cargadas correctamente. Total: ${tables.length}`, "success");
    } catch (error) {
        tablesContainer.innerHTML = "<p class='muted'>No fue posible cargar las tablas.</p>";
        setStatus(error.message, "error");
    }
}

function renderTables(groupedTables) {
    tablesContainer.innerHTML = "";

    const schemas = Object.keys(groupedTables).sort();

    if (schemas.length === 0) {
        tablesContainer.innerHTML = "<p class='muted'>No hay tablas disponibles.</p>";
        return;
    }

    schemas.forEach((schema) => {
        const group = document.createElement("div");
        group.className = "schema-group";

        const title = document.createElement("button");
        title.className = "schema-title";
        title.type = "button";

        const schemaName = document.createElement("span");
        schemaName.textContent = `Esquema: ${schema}`;

        const schemaCount = document.createElement("span");
        schemaCount.textContent = `${groupedTables[schema].length}`;

        title.appendChild(schemaName);
        title.appendChild(schemaCount);

        const tableList = document.createElement("div");
        tableList.className = "schema-tables";

        title.addEventListener("click", () => {
            group.classList.toggle("open");
        });

        groupedTables[schema]
            .sort((a, b) => a.table_name.localeCompare(b.table_name))
            .forEach((table) => {
                const button = document.createElement("button");
                button.className = "table-button";
                button.textContent = table.table_name;
                button.title = `${schema}.${table.table_name}`;

                button.addEventListener("click", () => {
                    selectTable(schema, table.table_name, button);
                });

                tableList.appendChild(button);
            });

        group.appendChild(title);
        group.appendChild(tableList);
        tablesContainer.appendChild(group);
    });
}

async function selectTable(schema, table, button) {
    selectedSchema = schema;
    selectedTable = table;

    if (selectedButton) {
        selectedButton.classList.remove("active");
    }

    selectedButton = button;
    selectedButton.classList.add("active");

    selectedTableTitle.textContent = `${schema}.${table}`;
    selectedTableSubtitle.textContent = "Tabla seleccionada. Consulte la vista previa por rango.";
    previewBtn.disabled = false;

    resetSummary();
    clearPreviewTable();

    startRecordInput.value = 1;
    endRecordInput.value = 20;

    await loadPreview();
}

async function loadPreview() {
    if (!selectedSchema || !selectedTable) {
        setStatus("Seleccione una tabla primero.", "error");
        return;
    }

    const startRecord = Number(startRecordInput.value);
    const endRecord = Number(endRecordInput.value);

    if (!startRecord || !endRecord || startRecord < 1 || endRecord < startRecord) {
        setStatus("Rango inválido. Verifique los valores desde/hasta.", "error");
        return;
    }

    const requestedRecords = endRecord - startRecord + 1;

    if (requestedRecords > 100) {
        setStatus("El máximo permitido por consulta es de 100 registros.", "error");
        return;
    }

    try {
        setStatus("Consultando vista previa...");
        clearPreviewTable();

        const schemaEncoded = encodeURIComponent(selectedSchema);
        const tableEncoded = encodeURIComponent(selectedTable);

        const url = `${API_BASE_URL}/api/database/tables/${schemaEncoded}/${tableEncoded}/preview?start_record=${startRecord}&end_record=${endRecord}`;

        const response = await fetch(url);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "No fue posible consultar la tabla.");
        }

        renderPreview(result.data);
        setStatus("Vista previa cargada correctamente.", "success");
    } catch (error) {
        resetSummary();
        clearPreviewTable();
        setStatus(error.message, "error");
    }
}

function renderPreview(data) {
    const columns = data.columns || [];
    const rows = data.data || [];

    totalRecordsEl.textContent = data.total_records ?? 0;
    totalColumnsEl.textContent = columns.length;
    sensitiveColumnsEl.textContent = data.sensitive_columns?.length ?? 0;
    returnedRecordsEl.textContent = data.returned_records ?? 0;

    renderTable(columns, rows);
}

function renderTable(columns, rows) {
    clearPreviewTable();

    if (!columns.length) {
        setStatus("La tabla no tiene columnas disponibles.", "error");
        return;
    }

    const headerRow = document.createElement("tr");

    columns.forEach((column) => {
        const th = document.createElement("th");
        th.textContent = column.name;

        if (column.is_sensitive) {
            th.classList.add("sensitive-column");
            th.title = "Columna marcada como sensible";
        }

        headerRow.appendChild(th);
    });

    previewThead.appendChild(headerRow);

    if (!rows.length) {
        const emptyRow = document.createElement("tr");
        const emptyCell = document.createElement("td");
        emptyCell.colSpan = columns.length;
        emptyCell.textContent = "No hay registros para el rango seleccionado.";
        emptyRow.appendChild(emptyCell);
        previewTbody.appendChild(emptyRow);
        return;
    }

    rows.forEach((row) => {
        const tr = document.createElement("tr");

        columns.forEach((column) => {
            const td = document.createElement("td");
            const value = row[column.name];

            td.textContent = value === null || value === undefined ? "" : value;

            if (column.is_sensitive) {
                td.classList.add("sensitive-value");
                td.textContent = "***";
            }

            tr.appendChild(td);
        });

        previewTbody.appendChild(tr);
    });
}

refreshStatusBtn.addEventListener("click", loadHealthSummary);
loadTablesBtn.addEventListener("click", loadTables);
previewBtn.addEventListener("click", loadPreview);

loadHealthSummary();