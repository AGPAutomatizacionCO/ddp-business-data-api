import { useEffect, useMemo, useState } from "react";

import { getAuditEvents, getAuditSummary } from "../services/apiClient";

function normalizeRoleValue(value) {
    return String(value || "")
        .trim()
        .toUpperCase();
}

function getUserRoleValues(user) {
    if (!user) {
        return [];
    }

    const roleCandidates = [
        user.role,
        user.app_role,
        user.role_name,
        user.backend_role,
        user.profile?.role,
        user.user?.role,
    ];

    if (Array.isArray(user.roles)) {
        roleCandidates.push(...user.roles);
    }

    if (Array.isArray(user.permissions)) {
        roleCandidates.push(...user.permissions);
    }

    return roleCandidates.filter(Boolean).map(normalizeRoleValue);
}

function isAdminUser(user) {
    const roleValues = getUserRoleValues(user);

    return roleValues.some((role) =>
        ["ADMIN", "ADMINISTRATOR", "SUPERADMIN", "ROLE_ADMIN", "DDP_ADMIN"].includes(
            role
        )
    );
}

function formatDate(value) {
    if (!value) {
        return "-";
    }

    try {
        return new Date(value).toLocaleString("es-CO");
    } catch {
        return value;
    }
}

const AUDIT_CARDS = [
    {
        category: "auth",
        title: "Inicio de sesión",
        description: "Usuario, hora, resultado, rol asignado y origen de autenticación.",
        chip: "Seguridad",
        chipClass: "success",
    },
    {
        category: "catalog",
        title: "Consulta de catálogo",
        description: "Base, esquema, objeto consultado y usuario que realizó la acción.",
        chip: "Metadata",
        chipClass: "",
    },
    {
        category: "preview",
        title: "Vista previa de datos",
        description: "Tabla o vista consultada, rango solicitado, columnas sensibles y resultado.",
        chip: "Control",
        chipClass: "warning",
    },
    {
        category: "access_denied",
        title: "Bloqueos de acceso",
        description: "Intentos directos, sesión vencida, usuario no autorizado o rol insuficiente.",
        chip: "Riesgo",
        chipClass: "warning",
    },
    {
        category: "errors",
        title: "Errores de conexión",
        description: "Fallos por credenciales, base inexistente, timeout o permisos insuficientes.",
        chip: "Soporte",
        chipClass: "",
    },
    {
        category: "admin",
        title: "Acciones administrativas",
        description: "Cambios futuros en documentación, clasificación, owner, sensibilidad o estado del objeto.",
        chip: "Gobierno",
        chipClass: "success",
    },
];

function getCategoryCount(summary, category) {
    const found = summary.find((item) => item.category === category);
    return found?.events || 0;
}

function AuditView({ user, databases = [], allTables = [], dashboardStatus }) {
    const isAdmin = isAdminUser(user);

    const [activeCategory, setActiveCategory] = useState("catalog");
    const [auditSummary, setAuditSummary] = useState([]);
    const [auditEvents, setAuditEvents] = useState([]);
    const [isLoadingAudit, setIsLoadingAudit] = useState(false);
    const [auditError, setAuditError] = useState("");

    const totalSources = databases.length;
    const totalObjects = allTables.length;
    const sensitiveObjects = allTables.filter(
        (item) => item.has_sensitive_data
    ).length;

    const selectedCard = useMemo(() => {
        return (
            AUDIT_CARDS.find((card) => card.category === activeCategory) ||
            AUDIT_CARDS[0]
        );
    }, [activeCategory]);

    async function loadSummary() {
        try {
            const result = await getAuditSummary();
            setAuditSummary(result.data || []);
        } catch (error) {
            console.warn(error);
        }
    }

    async function loadEvents(category) {
        try {
            setIsLoadingAudit(true);
            setAuditError("");

            const result = await getAuditEvents(category, 100);

            setAuditEvents(result.data || []);
            setActiveCategory(category);
        } catch (error) {
            console.error(error);
            setAuditEvents([]);
            setAuditError(
                error.message || "No fue posible cargar los eventos de auditoría."
            );
        } finally {
            setIsLoadingAudit(false);
        }
    }

    useEffect(() => {
        if (!isAdmin) {
            return;
        }

        loadSummary();
        loadEvents(activeCategory);
    }, [isAdmin]);

    if (!isAdmin) {
        return (
            <main className="admin-page">
                <section className="admin-blocked">
                    <h1>Acceso restringido</h1>
                    <p>
                        El módulo de auditoría solo está disponible para roles
                        administrativos.
                    </p>
                </section>
            </main>
        );
    }

    return (
        <main className="admin-page">
            <section className="admin-hero">
                <div className="admin-kicker">Auditoría</div>

                <h1 className="admin-title">
                    Trazabilidad de accesos y consultas
                </h1>

                <p className="admin-description">
                    Revisión de accesos, consultas de catálogo, previews,
                    bloqueos, errores y futuras acciones administrativas de la
                    herramienta.
                </p>
            </section>

            <section className="admin-toolbar">
                <div className="admin-toolbar-info">
                    <strong>Estado del módulo</strong>
                    <span>
                        {dashboardStatus ||
                            "Auditoría activa sobre archivos JSONL."}
                    </span>
                </div>

                <div className="admin-chip-row">
                    <span className="admin-chip success">Solo ADMIN</span>
                    <span className="admin-chip">JSONL</span>
                    <span className="admin-chip warning">Sin secretos</span>
                </div>
            </section>

            <section className="admin-kpi-grid">
                <article className="admin-kpi-card">
                    <span>Fuentes monitoreables</span>
                    <strong>{totalSources}</strong>
                    <p>Bases configuradas en catálogo.</p>
                </article>

                <article className="admin-kpi-card">
                    <span>Objetos trazables</span>
                    <strong>{totalObjects}</strong>
                    <p>Objetos potencialmente auditables.</p>
                </article>

                <article className="admin-kpi-card">
                    <span>Objetos sensibles</span>
                    <strong>{sensitiveObjects}</strong>
                    <p>Con marcas de sensibilidad.</p>
                </article>

                <article className="admin-kpi-card">
                    <span>Eventos registrados</span>
                    <strong>
                        {auditSummary.reduce(
                            (total, item) => total + Number(item.events || 0),
                            0
                        )}
                    </strong>
                    <p>Eventos registrados en logs locales.</p>
                </article>
            </section>

            <section className="admin-section">
                <div className="admin-section-header">
                    <div>
                        <h2>Eventos auditables</h2>
                        <p>
                            Haga clic en una categoría para consultar los
                            eventos registrados.
                        </p>
                    </div>
                </div>

                <div className="admin-grid">
                    {AUDIT_CARDS.map((card) => (
                        <button
                            type="button"
                            className={
                                activeCategory === card.category
                                    ? "admin-card audit-card-button active"
                                    : "admin-card audit-card-button"
                            }
                            key={card.category}
                            onClick={() => {
                                loadEvents(card.category);
                            }}
                        >
                            <div className="audit-card-top">
                                <strong>{card.title}</strong>
                                <span className="audit-count-pill">
                                    {getCategoryCount(auditSummary, card.category)}
                                </span>
                            </div>

                            <span>{card.description}</span>

                            <div className="admin-chip-row">
                                <span
                                    className={
                                        card.chipClass
                                            ? `admin-chip ${card.chipClass}`
                                            : "admin-chip"
                                    }
                                >
                                    {card.chip}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            <section className="admin-section">
                <div className="admin-section-header">
                    <div>
                        <h2>Bitácora visual</h2>
                        <p>
                            Mostrando categoría:{" "}
                            <strong>{selectedCard.title}</strong>
                        </p>
                    </div>

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                            loadSummary();
                            loadEvents(activeCategory);
                        }}
                    >
                        Actualizar eventos
                    </button>
                </div>

                {auditError && <div className="error-box">{auditError}</div>}

                {isLoadingAudit ? (
                    <div className="admin-empty-state">
                        <h3>Cargando eventos...</h3>
                        <p>Consultando archivo de auditoría.</p>
                    </div>
                ) : auditEvents.length === 0 ? (
                    <div className="admin-empty-state">
                        <h3>No hay eventos registrados</h3>
                        <p>
                            Realiza una acción relacionada con esta categoría y
                            vuelve a actualizar la bitácora.
                        </p>
                    </div>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Categoría</th>
                                    <th>Evento</th>
                                    <th>Resultado</th>
                                    <th>Usuario</th>
                                    <th>Recurso</th>
                                    <th>Request ID</th>
                                </tr>
                            </thead>

                            <tbody>
                                {auditEvents.map((event, index) => {
                                    const userName =
                                        event.user?.name ||
                                        event.user?.email ||
                                        "-";

                                    const resource =
                                        event.resource?.object_name ||
                                        event.resource?.table_name ||
                                        event.resource?.database_id ||
                                        event.resource?.resource_type ||
                                        "-";

                                    return (
                                        <tr key={`${event.timestamp}-${index}`}>
                                            <td>{formatDate(event.timestamp)}</td>
                                            <td>{event.category || "-"}</td>
                                            <td>{event.event_type || "-"}</td>
                                            <td>{event.result || "-"}</td>
                                            <td>{userName}</td>
                                            <td>{resource}</td>
                                            <td>
                                                {event.request?.request_id || "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}

export default AuditView;