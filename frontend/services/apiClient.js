const API_BASE_URL = "";
const SEND_BEARER_TOKEN = false;

async function apiRequest(endpoint, options = {}) {
    const defaultHeaders = {
        "Content-Type": "application/json"
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

    const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);

    let result = null;

    try {
        result = await response.json();
    } catch {
        result = null;
    }

    if (!response.ok) {
        const message =
            result?.detail ||
            result?.message ||
            `API request failed with status ${response.status}`;

        throw new Error(message);
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