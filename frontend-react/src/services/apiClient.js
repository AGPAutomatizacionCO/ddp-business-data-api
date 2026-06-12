const API_BASE_URL = "";

function createRequestId() {
    if (crypto?.randomUUID) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getUserFriendlyApiError(status, code, message) {
    if (code === "SESSION_REQUIRED" || code === "INVALID_SESSION") {
        return "La sesión segura expiró o no es válida. Inicie sesión nuevamente.";
    }

    if (code === "INVALID_MICROSOFT_TOKEN") {
        return "No fue posible validar la sesión de Microsoft. Inicie sesión nuevamente.";
    }

    if (code === "USER_NOT_ALLOWED") {
        return "Tu usuario no está autorizado para acceder a esta herramienta.";
    }

    if (code === "INSUFFICIENT_ROLE") {
        return "Tu rol no tiene permiso para realizar esta acción.";
    }

    if (code === "DIRECT_ACCESS_BLOCKED") {
        return "Acceso bloqueado. Use la aplicación web para consultar esta información.";
    }

    if (code === "VALIDATION_ERROR") {
        return "La solicitud contiene datos inválidos o incompletos.";
    }

    if (status === 401) {
        return "La sesión segura expiró o no es válida. Inicie sesión nuevamente.";
    }

    if (status === 403) {
        return "Acceso bloqueado. No tienes permiso para realizar esta acción.";
    }

    if (status === 404) {
        return "El recurso solicitado no existe.";
    }

    if (status >= 500) {
        return "El backend presentó un error interno. Revise la terminal del servidor.";
    }

    return message || "No fue posible completar la solicitud.";
}

function extractApiError(result, status) {
    const error = result?.error || {};

    const code = error?.code || result?.code || null;

    const message =
        error?.message ||
        result?.detail ||
        result?.message ||
        `API request failed with status ${status}`;

    const requestId =
        error?.request_id ||
        result?.request_id ||
        null;

    return {
        code,
        message,
        requestId,
    };
}

export async function apiRequest(endpoint, options = {}) {
    const requestId = createRequestId();

    const defaultHeaders = {
        "Content-Type": "application/json",
        "X-DDP-Client": "web",
        "X-Request-ID": requestId,
    };

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            credentials: "include",
            headers: {
                ...defaultHeaders,
                ...(options.headers || {}),
            },
        });
    } catch (networkError) {
        const error = new Error(
            "No fue posible conectar con el backend. Verifique que FastAPI esté activo."
        );

        error.status = 0;
        error.code = "NETWORK_ERROR";
        error.requestId = requestId;
        error.backendMessage = networkError?.message || "Network error";

        throw error;
    }

    let result = null;

    try {
        result = await response.json();
    } catch {
        result = null;
    }

    if (!response.ok) {
        const parsedError = extractApiError(result, response.status);

        const responseRequestId =
            response.headers.get("X-Request-ID") ||
            parsedError.requestId ||
            requestId;

        const friendlyMessage = getUserFriendlyApiError(
            response.status,
            parsedError.code,
            parsedError.message
        );

        const error = new Error(friendlyMessage);

        error.status = response.status;
        error.code = parsedError.code;
        error.requestId = responseRequestId;
        error.backendMessage = parsedError.message;
        error.response = result;

        throw error;
    }

    return result;
}

export function apiGet(endpoint) {
    return apiRequest(endpoint, {
        method: "GET",
    });
}

export function apiPost(endpoint, body = {}) {
    return apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export function createBackendSession(idToken) {
    return apiPost("/auth/session", {
        id_token: idToken,
    });
}

export function closeBackendSession() {
    return apiPost("/auth/logout", {});
}

export function getBackendSession() {
    return apiGet("/auth/me");
}

export function getHealthSummary() {
    return apiGet("/health/summary");
}

export function getTables() {
    return apiGet("/api/database/tables");
}
export function getDatabases() {
    return apiGet("/api/databases");
}
export function getDatabaseSummary(databaseId) {
    return apiGet(`/api/databases/${databaseId}/summary`);
}

export function getDatabaseTables(databaseId) {
    return apiGet(`/api/databases/${databaseId}/tables`);
}
export function getDatabaseTablePreview(
    databaseId,
    schemaName,
    tableName,
    startRecord = 1,
    endRecord = 20
) {
    const params = new URLSearchParams({
        start_record: String(startRecord),
        end_record: String(endRecord),
    });

    return apiGet(
        `/api/databases/${databaseId}/tables/${schemaName}/${tableName}/preview?${params.toString()}`
    );
}
export function getDatabaseObjects(databaseId) {
    return apiGet(`/api/databases/${databaseId}/objects`);
}

export function getDatabaseObjectDefinition(
    databaseId,
    objectType,
    schemaName,
    objectName
) {
    return apiGet(
        `/api/databases/${databaseId}/objects/${objectType}/${schemaName}/${objectName}/definition`
    );
}