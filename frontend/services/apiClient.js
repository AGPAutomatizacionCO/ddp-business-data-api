const API_BASE_URL = "";

async function apiRequest(endpoint, options = {}) {
    const defaultHeaders = {
        "Content-Type": "application/json"
    };

    let authHeaders = {};

    if (typeof isAuthenticated === "function" && isAuthenticated()) {
        const token = await getAccessToken();

        authHeaders = {
            Authorization: `Bearer ${token}`
        };
    }

    const requestOptions = {
        ...options,
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