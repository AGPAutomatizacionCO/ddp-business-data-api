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

        try {
            const sessionResult = await createBackendSession();

            if (sessionResult?.user) {
                DDP.views.setAuthenticatedUser(account, sessionResult.user);
            }

            await DDP.health.loadSummary();
            await DDP.tables.load();

            DDP.views.setStatus("Sesión iniciada correctamente.", "success");
        } catch (error) {
            console.error("Error creando sesión backend:", error);

            DDP.views.clearDashboardState();

            DDP.views.showLoginView(
                "La sesión con Microsoft está activa, pero no fue posible crear la sesión segura en el backend. Revise el backend y vuelva a intentar."
            );
        }
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
            try {
                await closeBackendSession();
            } catch (sessionError) {
                console.warn("No fue posible cerrar la sesión backend:", sessionError);
            }

            DDP.views.clearDashboardState();
            DDP.views.setUnauthenticatedUser();
            DDP.utils.clearMsalBrowserStorage();

            await logoutMicrosoft();
        } catch (error) {
            console.error(error);
            DDP.views.showLoginView("Sesión cerrada localmente.");
        }
    },

    handleApiError(event) {
        const error = event.detail || {};

        console.warn("DDP API error:", error);

        if (error.status === 401) {
            DDP.views.clearDashboardState();
            DDP.views.setUnauthenticatedUser();

            DDP.views.showLoginView(
                "La sesión segura expiró o no es válida. Inicie sesión nuevamente."
            );

            return;
        }

        if (error.status === 403) {
            DDP.views.setStatus(
                "Acceso bloqueado. La consulta debe realizarse desde la aplicación web.",
                "error"
            );

            return;
        }

        if (error.status === 0) {
            DDP.views.setStatus(
                "No fue posible conectar con el backend. Verifique que FastAPI esté activo.",
                "error"
            );

            return;
        }

        if (error.status >= 500) {
            DDP.views.setStatus(
                "El backend presentó un error interno. Revise la terminal del servidor.",
                "error"
            );

            return;
        }

        DDP.views.setStatus(
            error.message || "No fue posible completar la solicitud.",
            "error"
        );
    },

    bindEvents() {
        const dom = DDP.dom;

        dom.loginBtn.addEventListener("click", () => this.handleLogin());
        dom.logoutBtn.addEventListener("click", () => this.handleLogout());

        dom.refreshStatusBtn.addEventListener("click", async () => {
            try {
                DDP.views.setStatus("Actualizando información...", "info");

                await DDP.health.loadSummary();
                await DDP.tables.load();

                DDP.views.setStatus("Información actualizada correctamente.", "success");
            } catch (error) {
                console.error("Error actualizando información:", error);
            }
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

        window.addEventListener("ddp-api-error", (event) => {
            this.handleApiError(event);
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