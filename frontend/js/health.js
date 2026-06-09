window.DDP = window.DDP || {};

DDP.health = {
async loadSummary() {
const dom = DDP.dom;

    try {
        dom.apiStatus.textContent = "Validando...";
        dom.dbStatus.textContent = "Validando...";
        dom.dbName.textContent = "-";

        const result = await apiGet("/health/summary");

        dom.apiStatus.textContent = result?.api?.status === "ok" ? "Activa" : "Error";
        dom.dbStatus.textContent = result?.database?.status === "ok" ? "Conectada" : "Error";
        dom.dbName.textContent = result?.database?.database_name || "-";

        dom.totalSchemas.textContent = result?.summary?.total_schemas ?? "-";
        dom.totalTables.textContent = result?.summary?.total_tables ?? "-";

        if (!dom.totalSensitiveTables.textContent || dom.totalSensitiveTables.textContent.trim() === "") {
            dom.totalSensitiveTables.textContent = "-";
        }
    } catch (error) {
        console.error(error);

        dom.apiStatus.textContent = "Error";
        dom.dbStatus.textContent = "Error";
        dom.dbName.textContent = "-";

        DDP.views.setStatus(`Error validando estado general: ${error.message}`, "error");
    }
}

};