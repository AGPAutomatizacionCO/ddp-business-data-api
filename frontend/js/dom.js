window.DDP = window.DDP || {};

DDP.dom = {
    loginView: document.getElementById("loginView"),
    dashboardView: document.getElementById("dashboardView"),
    loginStatusMessage: document.getElementById("loginStatusMessage"),

    authStatus: document.getElementById("authStatus"),
    authUser: document.getElementById("authUser"),
    authRole: document.getElementById("authRole"),
    userAvatar: document.getElementById("userAvatar"),

    loginBtn: document.getElementById("loginBtn"),
    logoutBtn: document.getElementById("logoutBtn"),

    apiStatus: document.getElementById("apiStatus"),
    dbStatus: document.getElementById("dbStatus"),
    dbName: document.getElementById("dbName"),

    totalSchemas: document.getElementById("totalSchemas"),
    totalTables: document.getElementById("totalTables"),
    totalSensitiveTables: document.getElementById("totalSensitiveTables"),

    refreshStatusBtn: document.getElementById("refreshStatusBtn"),
    loadTablesBtn: document.getElementById("loadTablesBtn"),
    previewBtn: document.getElementById("previewBtn"),

    tablesContainer: document.getElementById("tablesContainer"),
    tableSearchInput: document.getElementById("tableSearchInput"),

    selectedTableTitle: document.getElementById("selectedTableTitle"),
    selectedTableSubtitle: document.getElementById("selectedTableSubtitle"),

    totalRecords: document.getElementById("totalRecords"),
    totalColumns: document.getElementById("totalColumns"),
    sensitiveColumns: document.getElementById("sensitiveColumns"),
    returnedRecords: document.getElementById("returnedRecords"),

    startRecord: document.getElementById("startRecord"),
    endRecord: document.getElementById("endRecord"),

    statusMessage: document.getElementById("statusMessage"),
    previewTable: document.getElementById("previewTable")
};

if (DDP.dom.previewTable) {
    DDP.dom.previewTableHead = DDP.dom.previewTable.querySelector("thead");
    DDP.dom.previewTableBody = DDP.dom.previewTable.querySelector("tbody");
} else {
    DDP.dom.previewTableHead = null;
    DDP.dom.previewTableBody = null;
}