const NAV_ITEMS = [
    {
        id: "overview",
        label: "Resumen ejecutivo",
        description: "Estado general de fuentes y plataforma",
        icon: "01",
        roles: ["ADMIN", "ANALYST", "VIEWER"],
    },
    {
        id: "explorer",
        label: "Vista guiada de datos",
        description: "Base → esquema → tabla → preview",
        icon: "02",
        roles: ["ADMIN", "ANALYST", "VIEWER"],
    },
    {
        id: "audit",
        label: "Auditoría",
        description: "Accesos, consultas y bloqueos",
        icon: "03",
        roles: ["ADMIN"],
    },
    {
        id: "sources",
        label: "Fuentes / configuración",
        description: "Catálogo, owners, SLA y sensibilidad",
        icon: "04",
        roles: ["ADMIN"],
    },
    {
        id: "queries",
        label: "Consulta operativa",
        description: "Constructor visual de consulta",
        icon: "05",
        roles: ["ADMIN", "ANALYST"],
    },
];

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

function normalizeRole(role) {
    if (!role) {
        return "VIEWER";
    }

    return String(role).trim().toUpperCase();
}

function DashboardShell({
    activeView,
    isMenuOpen,
    user,
    dashboardStatus,
    onToggleMenu,
    onCloseMenu,
    onChangeView,
    onLogout,
    children,
}) {
    const userRole = normalizeRole(user?.role);

    const visibleNavItems = NAV_ITEMS.filter((item) =>
        item.roles.includes(userRole)
    );

    const currentItem =
        visibleNavItems.find((item) => item.id === activeView) ||
        visibleNavItems[0];

    return (
        <>
            <button
                type="button"
                className="floating-menu-button"
                onClick={onToggleMenu}
                aria-label="Abrir menú"
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

            {isMenuOpen && (
                <button
                    type="button"
                    className="shell-backdrop"
                    onClick={onCloseMenu}
                    aria-label="Cerrar menú"
                />
            )}

            <aside
                className={
                    isMenuOpen
                        ? "app-navigation-drawer open"
                        : "app-navigation-drawer"
                }
            >
                <div className="drawer-header">
                    <div className="drawer-logo">DDP</div>

                    <div>
                        <strong>Data Explorer</strong>
                        <span>Gobierno y exploración controlada</span>
                    </div>
                </div>

                <div className="drawer-current">
                    <span>Vista actual</span>
                    <strong>{currentItem?.label || "Vista guiada"}</strong>
                </div>

                <nav className="drawer-nav">
                    {visibleNavItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={
                                activeView === item.id
                                    ? "drawer-nav-item active"
                                    : "drawer-nav-item"
                            }
                            onClick={() => {
                                onChangeView(item.id);
                                onCloseMenu();
                            }}
                        >
                            <span className="drawer-nav-icon">
                                {item.icon}
                            </span>

                            <div>
                                <strong>{item.label}</strong>
                                <small>{item.description}</small>
                            </div>
                        </button>
                    ))}
                </nav>

                <div className="drawer-footer">
                    <div className="drawer-user">
                        <div className="drawer-avatar">
                            {getInitials(user?.name || user?.username)}
                        </div>

                        <div>
                            <strong>{user?.name || user?.username}</strong>
                            <span>{userRole}</span>
                        </div>
                    </div>

                    <p>{dashboardStatus}</p>

                    <button
                        type="button"
                        className="drawer-logout-button"
                        onClick={onLogout}
                    >
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {children}
        </>
    );
}

export default DashboardShell;