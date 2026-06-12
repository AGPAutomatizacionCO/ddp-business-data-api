function AuthPage({ status, error, isRestoringSession, onLogin }) {
    return (
        <main className="auth-page">
            <section className="auth-background-grid">
                <div className="auth-glow auth-glow-one"></div>
                <div className="auth-glow auth-glow-two"></div>
            </section>

            <section className="auth-layout">
                <div className="auth-brand-panel">
                    <div className="auth-logo-row">
                        <div className="auth-logo">DDP</div>

                        <div>
                            <span>Data Explorer</span>
                            <strong>Gobierno de datos</strong>
                        </div>
                    </div>

                    <div className="auth-hero-copy">
                        <span className="auth-eyebrow">
                            Plataforma interna
                        </span>

                        <h1>Exploración segura de datos empresariales</h1>

                        <p>
                            Acceso controlado a bases, esquemas y tablas mediante
                            autenticación corporativa, roles, trazabilidad,
                            auditoría y gobierno de acceso.
                        </p>
                    </div>

                    <div className="auth-feature-grid">
                        <div>
                            <strong>Microsoft Entra ID</strong>
                            <span>Autenticación corporativa centralizada.</span>
                        </div>

                        <div>
                            <strong>Roles y permisos</strong>
                            <span>Control de acceso por perfil autorizado.</span>
                        </div>

                        <div>
                            <strong>Auditoría</strong>
                            <span>Registro de accesos, consultas y bloqueos.</span>
                        </div>

                        <div>
                            <strong>Datos sensibles</strong>
                            <span>Enmascaramiento desde backend seguro.</span>
                        </div>
                    </div>
                </div>

                <aside className="auth-login-panel">
                    <div className="auth-login-card">
                        <div className="auth-login-header">
                            <span className="auth-lock-icon">●</span>

                            <div>
                                <span>Acceso seguro</span>
                                <h2>Iniciar sesión</h2>
                            </div>
                        </div>

                        <p className="auth-login-description">
                            Usa tu cuenta corporativa para acceder a la
                            herramienta. Todas las consultas pueden ser
                            monitoreadas por seguridad y trazabilidad.
                        </p>

                        <div className="auth-status-card">
                            <span>Estado actual</span>
                            <strong>{status}</strong>
                        </div>

                        {error && (
                            <div className="error-box auth-error-box">
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            className="auth-microsoft-button"
                            onClick={onLogin}
                            disabled={isRestoringSession}
                        >
                            <span className="microsoft-icon">
                                <i></i>
                                <i></i>
                                <i></i>
                                <i></i>
                            </span>

                            <strong>
                                {isRestoringSession
                                    ? "Validando sesión..."
                                    : "Continuar con Microsoft"}
                            </strong>
                        </button>

                        <div className="auth-compliance-note">
                            <strong>Uso monitoreado</strong>
                            <span>
                                El acceso, los intentos bloqueados y las
                                consultas realizadas pueden registrarse para
                                auditoría, gobierno y soporte.
                            </span>
                        </div>
                    </div>
                </aside>
            </section>
        </main>
    );
}

export default AuthPage;