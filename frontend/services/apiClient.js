const API_BASE_URL = "";
const SEND_BEARER_TOKEN = false;

function getUserFriendlyApiError(status, message) {
    if (status === 401) {
        return "La sesión segura expiró o no es válida. Inicie sesión nuevamente.";
    }

    if (status === 403) {
        return "Acceso bloqueado. Use la aplicación web para consultar esta información.";
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

async function apiRequest(endpoint, options = {}) {
    const defaultHeaders = {
        "Content-Type": "application/json",
        "X-DDP-Client": "web"
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
            endpoint,
            message: "No fue posible conectar con el backend. Verifique que FastAPI esté activo.",
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
        const backendMessage =
            result?.detail ||
            result?.message ||
            `API request failed with status ${response.status}`;

        const friendlyMessage = getUserFriendlyApiError(
            response.status,
            backendMessage
        );

        const errorData = {
            status: response.status,
            endpoint,
            message: friendlyMessage,
            backendMessage,
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