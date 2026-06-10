const API_BASE_URL = "";
const SEND_BEARER_TOKEN = false;

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

function emitApiErrorEvent(errorData) {
    window.dispatchEvent(
        new CustomEvent("ddp-api-error", {
            detail: errorData
        })
    );
}

function extractApiError(result, status) {
    const error = result?.error || {};

    const code =
        error?.code ||
        result?.code ||
        null;

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
        requestId
    };
}

async function apiRequest(endpoint, options = {}) {
    const requestId = crypto.randomUUID();

    const defaultHeaders = {
        "Content-Type": "application/json",
        "X-DDP-Client": "web",
        "X-Request-ID": requestId
    };

    let authHeaders = {};

    if (
        SEND_BEARER_TOKEN &&
        typeof isAuthenticated === "function" &&
        isAuthenticated()
    ) {
        const token = await getAccessToken();

        authHeaders = {
            Authorization: `Bearer ${token}`
        };
    }

    const requestOptions = {
        ...options,
        credentials: "same-origin",
        headers: {
            ...defaultHeaders,
            ...authHeaders,
            ...(options.headers || {})
        }
    };

    let response;

    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);
    } catch (networkError) {
        const errorData = {
            status: 0,
            code: "NETWORK_ERROR",
            endpoint,
            requestId,
            message: "No fue posible conectar con el backend. Verifique que FastAPI esté activo.",
            backendMessage: networkError?.message || "Network error",
            originalError: networkError
        };

        emitApiErrorEvent(errorData);

        throw new Error(errorData.message);
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

        const errorData = {
            status: response.status,
            code: parsedError.code,
            endpoint,
            requestId: responseRequestId,
            message: friendlyMessage,
            backendMessage: parsedError.message,
            response: result
        };

        emitApiErrorEvent(errorData);

        throw new Error(friendlyMessage);
    }

    return result;
}

async function apiGet(endpoint) {
    return apiRequest(endpoint, {
        method: "GET"
    });
}

async function apiPost(endpoint, body = {}) {
    return apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body)
    });
}

async function createBackendSession() {
    const idToken = await getMicrosoftIdToken();

    return apiPost("/auth/session", {
        id_token: idToken
    });
}

async function closeBackendSession() {
    return apiPost("/auth/logout", {});
}

async function getBackendSession() {
    return apiGet("/auth/me");
}