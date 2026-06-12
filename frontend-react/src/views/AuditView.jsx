function AuditView() {
    return (
        <main className="roadmap-view">
            <section className="roadmap-hero compact">
                <div>
                    <span className="roadmap-eyebrow">
                        Auditoría
                    </span>

                    <h1>Auditoría y trazabilidad</h1>

                    <p>
                        Este módulo consolidará accesos, bloqueos, consultas por
                        usuario, base, esquema, tabla, endpoint y request ID.
                    </p>
                </div>
            </section>

            <section className="roadmap-grid">
                <article className="roadmap-card">
                    <span>Evento</span>
                    <h2>Acceso directo bloqueado</h2>
                    <p>
                        Registro de intentos por URL directa con resultado 403,
                        IP, user agent y request ID.
                    </p>
                </article>

                <article className="roadmap-card">
                    <span>Evento</span>
                    <h2>Consulta de tabla</h2>
                    <p>
                        Registro de base, esquema, tabla, rango consultado y
                        columnas sensibles enmascaradas.
                    </p>
                </article>

                <article className="roadmap-card">
                    <span>Evento</span>
                    <h2>Sesión y roles</h2>
                    <p>
                        Registro de usuario autenticado, rol activo, resultado de
                        autorización y endpoint consumido.
                    </p>
                </article>
            </section>
        </main>
    );
}

export default AuditView;