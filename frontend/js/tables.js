
window.DDP = window.DDP || {};

DDP.tables = {
    extractTablesFromApiResponse(result) {
        if (Array.isArray(result)) {
            return result;
        }

        if (result && Array.isArray(result.tables)) {
            return result.tables;
        }

        if (result && Array.isArray(result.data)) {
            return result.data;
        }

        if (result && Array.isArray(result.rows)) {
            return result.rows;
        }

        if (result && Array.isArray(result.schemas)) {
            const flatTables = [];

            result.schemas.forEach((schemaItem) => {
                const schemaName =
                    schemaItem.schema_name ||
                    schemaItem.schema ||
                    schemaItem.name ||
                    "-";

                const schemaTables =
                    schemaItem.tables ||
                    schemaItem.items ||
                    [];

                schemaTables.forEach((tableItem) => {
                    flatTables.push({
                        ...tableItem,
                        schema_name:
                            tableItem.schema_name ||
                            tableItem.TABLE_SCHEMA ||
                            schemaName,
                        table_name:
                            tableItem.table_name ||
                            tableItem.TABLE_NAME ||
                            tableItem.name
                    });
                });
            });

            return flatTables;
        }

        console.warn("Formato inesperado en /api/database/tables:", result);
        return [];
    },

    groupBySchema(tables) {
        return tables.reduce((groups, table) => {
            const schemaName = table.schema_name || "-";

            if (!groups[schemaName]) {
                groups[schemaName] = [];
            }

            groups[schemaName].push(table);

            return groups;
        }, {});
    },

    getFilteredTables() {
        const searchValue = DDP.dom.tableSearchInput.value.trim().toLowerCase();

        if (!searchValue) {
            return DDP.state.allTables;
        }

        return DDP.state.allTables.filter((table) => {
            const fullName = `${table.schema_name}.${table.table_name}`.toLowerCase();
            return fullName.includes(searchValue);
        });
    },

    render(tables = null) {
        const dom = DDP.dom;
        const escapeHtml = DDP.utils.escapeHtml;

        const filteredTables = tables || this.getFilteredTables();

        if (!filteredTables.length) {
            dom.tablesContainer.innerHTML = `<p class="muted">No se encontraron tablas.</p>`;
            return;
        }

        const groupedTables = this.groupBySchema(filteredTables);
        const schemaNames = Object.keys(groupedTables).sort();

        dom.tablesContainer.innerHTML = "";

        schemaNames.forEach((schemaName) => {
            const schemaTables = groupedTables[schemaName].sort((a, b) =>
                a.table_name.localeCompare(b.table_name)
            );

            const sensitiveCount = schemaTables.filter((table) => table.has_sensitive_data).length;

            const schemaBlock = document.createElement("div");
            schemaBlock.className = "schema-block";

            const schemaHeader = document.createElement("button");
            schemaHeader.className = "schema-header";
            schemaHeader.type = "button";

            schemaHeader.innerHTML = `
                <span>Esquema: ${escapeHtml(schemaName)}</span>
                <strong>${schemaTables.length}</strong>
                ${
                    sensitiveCount > 0
                        ? `<em class="schema-sensitive-count">${sensitiveCount} sensibles</em>`
                        : ""
                }
            `;

            const schemaContent = document.createElement("div");
            schemaContent.className = "schema-content";

            schemaTables.forEach((table) => {
                const tableButton = document.createElement("button");
                tableButton.type = "button";

                tableButton.className = table.has_sensitive_data
                    ? "table-button sensitive-table"
                    : "table-button";

                if (
                    DDP.state.selectedTable &&
                    DDP.state.selectedTable.schema_name === table.schema_name &&
                    DDP.state.selectedTable.table_name === table.table_name
                ) {
                    tableButton.classList.add("active-table");
                }

                tableButton.innerHTML = table.has_sensitive_data
                    ? `
                        <span>${escapeHtml(table.table_name)}</span>
                        <span class="sensitive-badge">${table.sensitive_columns_count}</span>
                    `
                    : `<span>${escapeHtml(table.table_name)}</span>`;

                tableButton.title = table.has_sensitive_data
                    ? `${table.schema_name}.${table.table_name} - ${table.sensitive_columns_count} columnas sensibles`
                    : `${table.schema_name}.${table.table_name}`;

                tableButton.addEventListener("click", () => {
                    this.select(table);
                });

                schemaContent.appendChild(tableButton);
            });

            schemaHeader.addEventListener("click", () => {
                schemaContent.classList.toggle("hidden");
            });

            schemaBlock.appendChild(schemaHeader);
            schemaBlock.appendChild(schemaContent);

            dom.tablesContainer.appendChild(schemaBlock);
        });
    },

    async load() {
        const dom = DDP.dom;

        try {
            if (!isAuthenticated()) {
                DDP.views.setStatus("Debe iniciar sesión antes de consultar las tablas.", "error");
                return;
            }

            DDP.views.setStatus("Cargando esquemas y tablas...", "info");

            const result = await apiGet("/api/database/tables");

            console.log("Respuesta /api/database/tables:", result);

            const rawTables = this.extractTablesFromApiResponse(result);

            const normalizedTables = rawTables
                .map(DDP.utils.normalizeTable)
                .filter((table) => table.schema_name !== "-" && table.table_name !== "-");

            if (!normalizedTables.length) {
                console.warn("No se pudieron interpretar tablas desde la respuesta:", result);

                DDP.views.setStatus(
                    "La API respondió, pero el frontend no pudo interpretar el formato de tablas. Revise la consola.",
                    "warning"
                );

                return;
            }

            DDP.state.allTables = normalizedTables;

            const schemas = [...new Set(DDP.state.allTables.map((table) => table.schema_name))];

            const sensitiveTablesCount = DDP.state.allTables.filter(
                (table) => table.has_sensitive_data
            ).length;

            dom.totalSchemas.textContent = schemas.length;
            dom.totalTables.textContent = DDP.state.allTables.length;
            dom.totalSensitiveTables.textContent = sensitiveTablesCount;

            this.render(DDP.state.allTables);

            DDP.views.setStatus(
                `Tablas cargadas correctamente. Total: ${DDP.state.allTables.length}`,
                "success"
            );
        } catch (error) {
            console.error(error);
            DDP.views.setStatus(`Error cargando tablas: ${error.message}`, "error");
        }
    },

    select(table) {
        const dom = DDP.dom;

        DDP.state.selectedTable = table;

        dom.selectedTableTitle.textContent = table.table_name;
        dom.selectedTableSubtitle.textContent = `${table.schema_name}.${table.table_name}`;

        dom.totalRecords.textContent = "-";
        dom.totalColumns.textContent = "-";

        dom.sensitiveColumns.textContent = table.has_sensitive_data
            ? table.sensitive_columns_count
            : "0";

        dom.returnedRecords.textContent = "-";

        dom.previewTableHead.innerHTML = "";
        dom.previewTableBody.innerHTML = "";

        /*dom.previewBtn.disabled = false;*/

        this.render(this.getFilteredTables());

        if (table.has_sensitive_data) {
            DDP.views.setStatus(
                `Tabla seleccionada: ${table.schema_name}.${table.table_name}. Contiene posibles datos sensibles.`,
                "warning"
            );
        } else {
            DDP.views.setStatus(
                `Tabla seleccionada: ${table.schema_name}.${table.table_name}.`,
                "info"
            );
        }
        DDP.preview.load();
    }
};