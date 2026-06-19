function AuthPage({ status, error, isRestoringSession, onLogin }) {
    return (
        <main className="auth-page">
            <section className="auth-hero">
                <div className="auth-kicker">DDP Data Explorer · Gobierno de datos</div>

                <h1 className="auth-title">
                    Exploración segura de datos empresariales
                </h1>

                <p className="auth-description">
                    Acceso controlado a bases, esquemas, tablas y objetos de base
                    de datos mediante autenticación corporativa, roles,
                    trazabilidad, auditoría y gobierno de acceso.
                </p>

                <div className="auth-feature-grid">
                    <div className="auth-feature-card">
                        <strong>Microsoft Entra ID</strong>
                        <span>Autenticación corporativa centralizada.</span>
                    </div>

                    <div className="auth-feature-card">
                        <strong>Roles y permisos</strong>
                        <span>Control de acceso por perfil autorizado.</span>
                    </div>

                    <div className="auth-feature-card">
                        <strong>Auditoría</strong>
                        <span>Registro de accesos, consultas y bloqueos.</span>
                    </div>

                    <div className="auth-feature-card">
                        <strong>Datos sensibles</strong>
                        <span>Enmascaramiento desde backend seguro.</span>
                    </div>
                </div>
            </section>

            <section className="auth-panel">
                <div className="auth-panel-badge">DDP</div>

                <h2>Iniciar sesión</h2>

                <p>
                    Usa tu cuenta corporativa para acceder a la herramienta.
                    Todas las consultas pueden ser monitoreadas por seguridad y
                    trazabilidad.
                </p>

                <div className="auth-status-box">
                    <strong>Estado actual:</strong> {status}
                </div>

                {error && <div className="error-box">{error}</div>}

                <button
                    className="primary-button auth-login-button"
                    onClick={onLogin}
                    disabled={isRestoringSession}
                    type="button"
                >
                    {isRestoringSession
                        ? "Validando sesión..."
                        : "Continuar con Microsoft"}
                </button>

                <div className="auth-note">
                    El acceso, los intentos bloqueados y las consultas
                    realizadas pueden registrarse para auditoría, gobierno y
                    soporte.
                </div>
            </section>
        </main>
    );
}

export default AuthPage;