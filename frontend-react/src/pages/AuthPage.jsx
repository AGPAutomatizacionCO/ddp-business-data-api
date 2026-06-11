function AuthPage({ status, error, isRestoringSession, onLogin }) {
    return (
        <main className="app-shell auth-shell">
            <section className="hero-card auth-card">
                <p className="eyebrow">DDP Data Explorer</p>

                <h1>Acceso seguro</h1>

                <p className="description">
                    Exploración controlada de datos empresariales mediante autenticación
                    corporativa, roles, trazabilidad y gobierno de acceso.
                </p>

                <div className="status-box">
                    <strong>Estado:</strong> {status}
                </div>

                {error && <div className="error-box">{error}</div>}

                <button
                    className="primary-button full-button"
                    onClick={onLogin}
                    disabled={isRestoringSession}
                >
                    {isRestoringSession
                        ? "Validando sesión..."
                        : "Iniciar sesión con Microsoft"}
                </button>

                <div className="auth-note">
                    El acceso y las consultas pueden ser monitoreadas por motivos de
                    seguridad, trazabilidad y gobierno de datos.
                </div>
            </section>
        </main>
    );
}

export default AuthPage;