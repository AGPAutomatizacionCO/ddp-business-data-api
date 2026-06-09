window.DDP = window.DDP || {};

DDP.preview = {
    getPayload(result) {
        if (!result) {
            return {};
        }

        if (
            result.data &&
            typeof result.data === "object" &&
            !Array.isArray(result.data)
        ) {
            return result.data;
        }

        return result;
    },

    validateRange() {
        const startRecord = Number(DDP.dom.startRecord.value);
        const endRecord = Number(DDP.dom.endRecord.value);

        if (!Number.isInteger(startRecord) || !Number.isInteger(endRecord)) {
            throw new Error("El rango debe contener números enteros.");
        }

        if (startRecord < 1) {
            throw new Error("El registro inicial debe ser mayor o igual a 1.");
        }

        if (endRecord < startRecord) {
            throw new Error("El registro final debe ser mayor o igual al inicial.");
        }

        if (endRecord - startRecord + 1 > 100) {
            throw new Error("El máximo permitido por consulta es de 100 registros.");
        }

        return {
            startRecord,
            endRecord
        };
    },

    getRows(result) {
        const payload = this.getPayload(result);

        if (Array.isArray(payload.data)) {
            return payload.data;
        }

        if (Array.isArray(payload.rows)) {
            return payload.rows;
        }

        if (Array.isArray(payload.records)) {
            return payload.records;
        }

        if (Array.isArray(payload.preview)) {
            return payload.preview;
        }

        if (Array.isArray(payload.items)) {
            return payload.items;
        }

        return [];
    },

    getColumnName(column) {
        if (typeof column === "string") {
            return column;
        }

        if (column && typeof column === "object") {
            return (
                column.column_name ||
                column.COLUMN_NAME ||
                column.name ||
                column.field ||
                column.key ||
                column.title ||
                ""
            );
        }

        return "";
    },

    getColumns(result) {
        const payload = this.getPayload(result);

        let rawColumns = [];

        if (Array.isArray(payload.columns)) {
            rawColumns = payload.columns;
        } else if (Array.isArray(payload.table_columns)) {
            rawColumns = payload.table_columns;
        } else if (Array.isArray(payload.column_names)) {
            rawColumns = payload.column_names;
        }

        const normalizedColumns = rawColumns
            .map((column) => this.getColumnName(column))
            .filter((columnName) => columnName && typeof columnName === "string");

        if (normalizedColumns.length > 0) {
            return normalizedColumns;
        }

        const rows = this.getRows(result);

        if (rows.length > 0) {
            return Object.keys(rows[0]);
        }

        return [];
    },

    getSensitiveColumns(result) {
        const payload = this.getPayload(result);

        const rawSensitiveColumns =
            payload.sensitive_columns ||
            payload.sensitiveColumns ||
            DDP.state.selectedTable?.sensitive_columns ||
            [];

        if (!Array.isArray(rawSensitiveColumns)) {
            return [];
        }

        return rawSensitiveColumns
            .map((column) => this.getColumnName(column))
            .filter((columnName) => columnName && typeof columnName === "string");
    },

    getTotalRecords(result) {
        const payload = this.getPayload(result);

        return (
            payload.total_records ??
            payload.totalRecords ??
            payload.total ??
            payload.total_count ??
            payload.record_count ??
            "-"
        );
    },

    formatCellValue(value) {
        if (value === null || value === undefined) {
            return "";
        }

        if (typeof value === "object") {
            return JSON.stringify(value);
        }

        return String(value);
    },

    render(result) {
        const dom = DDP.dom;

        const columns = this.getColumns(result);
        const rows = this.getRows(result);
        const sensitiveColumns = this.getSensitiveColumns(result);

        dom.previewTableHead.innerHTML = "";
        dom.previewTableBody.innerHTML = "";

        if (!columns.length) {
            dom.previewTableBody.innerHTML = `
                <tr>
                    <td>No hay columnas o registros disponibles para esta tabla en el rango consultado.</td>
                </tr>
            `;
            return;
        }

        const headerRow = document.createElement("tr");

        columns.forEach((column) => {
            const th = document.createElement("th");
            th.textContent = column;

            if (sensitiveColumns.includes(column)) {
                th.classList.add("sensitive-column");
            }

            headerRow.appendChild(th);
        });

        dom.previewTableHead.appendChild(headerRow);

        if (!rows.length) {
            const emptyRow = document.createElement("tr");
            const emptyCell = document.createElement("td");

            emptyCell.colSpan = columns.length;
            emptyCell.textContent = "No hay registros para mostrar en el rango seleccionado.";

            emptyRow.appendChild(emptyCell);
            dom.previewTableBody.appendChild(emptyRow);

            return;
        }

        rows.forEach((row) => {
            const tr = document.createElement("tr");

            columns.forEach((column) => {
                const td = document.createElement("td");
                td.textContent = this.formatCellValue(row[column]);

                if (sensitiveColumns.includes(column)) {
                    td.classList.add("sensitive-column");
                }

                tr.appendChild(td);
            });

            dom.previewTableBody.appendChild(tr);
        });
    },

    async load() {
        const dom = DDP.dom;

        try {
            if (!isAuthenticated()) {
                DDP.views.setStatus("Debe iniciar sesión antes de consultar información.", "error");
                return;
            }

            if (!DDP.state.selectedTable) {
                DDP.views.setStatus("Seleccione una tabla antes de consultar la vista previa.", "error");
                return;
            }

            const { startRecord, endRecord } = this.validateRange();
            const table = DDP.state.selectedTable;

            DDP.views.setStatus("Consultando vista previa de datos...", "info");

            const endpoint =
                `/api/database/tables/${encodeURIComponent(table.schema_name)}` +
                `/${encodeURIComponent(table.table_name)}` +
                `/preview?start_record=${startRecord}&end_record=${endRecord}`;

            const result = await apiGet(endpoint);

            console.log("Endpoint preview:", endpoint);
            console.log("Respuesta preview:", result);
            console.log("Payload preview:", this.getPayload(result));
            console.log("Rows preview:", this.getRows(result));
            console.log("Columns preview:", this.getColumns(result));

            const rows = this.getRows(result);
            const columns = this.getColumns(result);
            const sensitiveColumns = this.getSensitiveColumns(result);

            dom.totalRecords.textContent = this.getTotalRecords(result);
            dom.totalColumns.textContent = columns.length;
            dom.sensitiveColumns.textContent = sensitiveColumns.length;
            dom.returnedRecords.textContent = rows.length;

            this.render(result);

            DDP.views.setStatus(
                `Vista previa cargada: ${rows.length} registros mostrados.`,
                "success"
            );
        } catch (error) {
            console.error(error);

            DDP.views.setStatus(
                `Error consultando vista previa: ${error.message}`,
                "error"
            );
        }
    }
};