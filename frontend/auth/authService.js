let msalInstance = null;
let currentAccount = null;

function isMsalAvailable() {
    return typeof msal !== "undefined" && typeof msal.PublicClientApplication === "function";
}

function createMsalInstance() {
    if (!isMsalAvailable()) {
        throw new Error("MSAL.js no está cargado. Verifique el script de Microsoft MSAL en index.html.");
    }

    if (!msalInstance) {
        msalInstance = new msal.PublicClientApplication(msalConfig);
    }

    return msalInstance;
}

async function initializeAuth() {
    try {
        const instance = createMsalInstance();

        const response = await instance.handleRedirectPromise();

        if (response && response.account) {
            currentAccount = response.account;
            instance.setActiveAccount(currentAccount);
            return currentAccount;
        }

        const accounts = instance.getAllAccounts();

        if (accounts.length > 0) {
            currentAccount = accounts[0];
            instance.setActiveAccount(currentAccount);
            return currentAccount;
        }

        return null;
    } catch (error) {
        console.error("Authentication initialization error:", error);
        return null;
    }
}

async function loginWithMicrosoft() {
    const instance = createMsalInstance();

    await instance.loginRedirect(loginRequest);
}

async function logoutMicrosoft() {
    const instance = createMsalInstance();
    const account = instance.getActiveAccount();

    currentAccount = null;

    if (account) {
        await instance.logoutRedirect({
            account,
            postLogoutRedirectUri: window.location.origin
        });

        return;
    }

    sessionStorage.clear();
    window.location.href = window.location.origin;
}

function getCurrentAccount() {
    if (!msalInstance) {
        return null;
    }

    return msalInstance.getActiveAccount();
}

function isAuthenticated() {
    return getCurrentAccount() !== null;
}

async function getAccessToken() {
    const instance = createMsalInstance();
    const account = getCurrentAccount();

    if (!account) {
        throw new Error("Usuario no autenticado.");
    }

    try {
        const response = await instance.acquireTokenSilent({
            ...apiTokenRequest,
            account
        });

        return response.accessToken;
    } catch (error) {
        console.warn("No fue posible obtener token silenciosamente:", error);

        await instance.acquireTokenRedirect({
            ...apiTokenRequest,
            account
        });

        return null;
    }
}