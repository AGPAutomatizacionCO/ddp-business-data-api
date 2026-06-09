window.DDP = window.DDP || {};

DDP.views = {
    setStatus(message, type = "info") {
        const dom = DDP.dom;

        if (!dom.statusMessage) {
            return;
        }

        dom.statusMessage.textContent = message;
        dom.statusMessage.className = `status-message ${type}`;
    },

    showLoginView(message = "Inicie sesión para continuar.") {
        const dom = DDP.dom;

        dom.loginView.classList.remove("hidden");
        dom.dashboardView.classList.add("hidden");

        if (dom.loginStatusMessage) {
            dom.loginStatusMessage.textContent = message;
        }

        this.clearDashboardState();
    },

    showDashboardView() {
        const dom = DDP.dom;

        dom.loginView.classList.add("hidden");
        dom.dashboardView.classList.remove("hidden");
    },

    clearDashboardState() {
        const dom = DDP.dom;

        DDP.state.allTables = [];
        DDP.state.selectedTable = null;

        if (dom.tablesContainer) {
            dom.tablesContainer.innerHTML = `<p class="muted">Inicie sesión para consultar tablas.</p>`;
        }

        if (dom.tableSearchInput) {
            dom.tableSearchInput.value = "";
        }

        dom.totalSchemas.textContent = "-";
        dom.totalTables.textContent = "-";
        dom.totalSensitiveTables.textContent = "-";

        dom.apiStatus.textContent = "-";
        dom.dbStatus.textContent = "-";
        dom.dbName.textContent = "-";

        dom.selectedTableTitle.textContent = "Vista principal";
        dom.selectedTableSubtitle.textContent = "Seleccione una tabla para consultar una vista previa controlada.";

        dom.totalRecords.textContent = "-";
        dom.totalColumns.textContent = "-";
        dom.sensitiveColumns.textContent = "-";
        dom.returnedRecords.textContent = "-";

        if (dom.previewTableHead) {
            dom.previewTableHead.innerHTML = "";
        }

        if (dom.previewTableBody) {
            dom.previewTableBody.innerHTML = "";
        }

        this.setStatus("Sesión no iniciada.", "info");
    },

    setAuthenticatedUser(account) {
        const dom = DDP.dom;
        const displayName = DDP.utils.getUserDisplayName(account);

        DDP.state.currentAccount = account;

        dom.authStatus.textContent = "Autenticado";
        dom.authStatus.classList.add("status-ok");

        dom.authUser.textContent = displayName;
        dom.userAvatar.textContent = DDP.utils.getInitials(displayName);
    },

    setUnauthenticatedUser() {
        const dom = DDP.dom;

        DDP.state.currentAccount = null;

        if (dom.authStatus) {
            dom.authStatus.textContent = "No autenticado";
            dom.authStatus.classList.remove("status-ok");
        }

        if (dom.authUser) {
            dom.authUser.textContent = "-";
        }

        if (dom.userAvatar) {
            dom.userAvatar.textContent = "-";
        }
    }
};