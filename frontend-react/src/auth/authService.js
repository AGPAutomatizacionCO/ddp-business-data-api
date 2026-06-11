import { loginRequest } from "./msalConfig";
import { createBackendSession } from "../services/apiClient";

export async function loginWithMicrosoft(instance) {
    await instance.loginRedirect(loginRequest);
}

export async function restoreMicrosoftSession(instance) {
    const accounts = instance.getAllAccounts();

    if (!accounts.length) {
        return null;
    }

    const account = accounts[0];

    instance.setActiveAccount(account);

    const tokenResponse = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
    });

    const backendSession = await createBackendSession(tokenResponse.idToken);

    return {
        account,
        backendSession,
    };
}