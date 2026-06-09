window.DDP = window.DDP || {};

DDP.app = {
    async initializeAuthState() {
        const account = await initializeAuth();

        if (!account) {
            DDP.views.setUnauthenticatedUser();
            DDP.views.showLoginView("Inicie sesión con Microsoft para continuar.");
            return;
        }

        DDP.views.setAuthenticatedUser(account);
        DDP.views.showDashboardView();

        await DDP.health.loadSummary();
        await DDP.tables.load();

        DDP.views.setStatus("Sesión iniciada correctamente.", "success");
    },

    async handleLogin() {
        try {
            await loginWithMicrosoft();
        } catch (error) {
            console.error(error);

            if (DDP.dom.loginStatusMessage) {
                DDP.dom.loginStatusMessage.textContent = `Error iniciando sesión: ${error.message}`;
            }
        }
    },

    async handleLogout() {
        try {
            DDP.views.clearDashboardState();
            DDP.views.setUnauthenticatedUser();
            DDP.utils.clearMsalBrowserStorage();

            await logoutMicrosoft();
        } catch (error) {
            console.error(error);
            DDP.views.showLoginView("Sesión cerrada localmente.");
        }
    },

    bindEvents() {
        const dom = DDP.dom;

        dom.loginBtn.addEventListener("click", () => this.handleLogin());
        dom.logoutBtn.addEventListener("click", () => this.handleLogout());

        dom.refreshStatusBtn.addEventListener("click", async () => {
            await DDP.health.loadSummary();
            await DDP.tables.load();
        });

        dom.tableSearchInput.addEventListener("input", () => {
            DDP.tables.render(DDP.tables.getFilteredTables());
        });

        dom.startRecord.addEventListener("change", () => {
            if (DDP.state.selectedTable) {
                DDP.preview.load();
            }
        });

        dom.endRecord.addEventListener("change", () => {
            if (DDP.state.selectedTable) {
                DDP.preview.load();
            }
        });

        window.addEventListener("pageshow", () => {
            const account = getCurrentAccount();

            if (!account) {
                DDP.views.setUnauthenticatedUser();
                DDP.views.showLoginView("La sesión no está activa. Inicie sesión nuevamente.");
            }
        });
    },

    async init() {
        this.bindEvents();
        await this.initializeAuthState();
    }
};

DDP.app.init();