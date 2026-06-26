function CatalogLoadingOverlay({ loadingState }) {
    if (!loadingState?.isLoading) {
        return null;
    }

    const total = Number(loadingState.total || 0);
    const completed = Number(loadingState.completed || 0);

    const progress =
        total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 12;

    return (
        <div className="catalog-loading-overlay" role="status" aria-live="polite">
            <div className="catalog-loading-card">
                <div className="catalog-loader-visual">
                    <div className="catalog-loader-ring" />
                    <div className="catalog-loader-core">DDP</div>
                </div>

                <div className="catalog-loading-content">
                    <span className="catalog-loading-kicker">
                        Procesando catálogo
                    </span>

                    <h2>{loadingState.phase || "Cargando información..."}</h2>

                    <p>
                        {loadingState.message ||
                            "Consultando fuentes, esquemas y objetos disponibles."}
                    </p>

                    {loadingState.current && (
                        <div className="catalog-loading-current">
                            <span>Fuente actual</span>
                            <strong>{loadingState.current}</strong>
                        </div>
                    )}

                    <div className="catalog-progress-shell">
                        <div
                            className="catalog-progress-bar"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="catalog-loading-footer">
                        <span>
                            {total > 0
                                ? `${completed} de ${total} fuentes procesadas`
                                : "Inicializando consulta"}
                        </span>

                        <strong>{progress}%</strong>
                    </div>

                    <div className="catalog-loading-steps">
                        <span />
                        <span />
                        <span />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CatalogLoadingOverlay;