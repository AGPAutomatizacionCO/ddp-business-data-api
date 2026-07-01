import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { createBackendSession, getBackendSession } from "../services/apiClient";
import { loginRequest } from "./msalConfig";

function getFirstAccount(instance) {
    const activeAccount = instance.getActiveAccount();

    if (activeAccount) {
        return activeAccount;
    }

    const accounts = instance.getAllAccounts();

    if (accounts.length > 0) {
        instance.setActiveAccount(accounts[0]);
        return accounts[0];
    }

    return null;
}

async function createSessionFromAccount(instance, account, existingIdToken = null) {
    if (!account) {
        return null;
    }

    instance.setActiveAccount(account);

    let idToken = existingIdToken;

    if (!idToken) {
        const tokenResponse = await instance.acquireTokenSilent({
            ...loginRequest,
            account,
        });

        idToken = tokenResponse.idToken;
    }

    const backendSession = await createBackendSession(idToken);

    return {
        account,
        backendSession,
    };
}

export async function loginWithMicrosoft(instance) {
    const existingAccount = getFirstAccount(instance);

    if (existingAccount) {
        return createSessionFromAccount(instance, existingAccount);
    }

    await instance.loginRedirect({
        ...loginRequest,
        prompt: "select_account",
    });

    return null;
}

export async function restoreMicrosoftSession(instance) {
    let redirectResponse = null;

    try {
        redirectResponse = await instance.handleRedirectPromise();
    } catch (redirectError) {
        console.warn("No fue posible procesar el retorno de Microsoft.", redirectError);
    }

    if (redirectResponse?.account) {
        return createSessionFromAccount(
            instance,
            redirectResponse.account,
            redirectResponse.idToken
        );
    }

    const existingAccount = getFirstAccount(instance);

    if (existingAccount) {
        try {
            return await createSessionFromAccount(instance, existingAccount);
        } catch (tokenError) {
            const code = tokenError?.errorCode || tokenError?.name || "";
            const needsInteraction =
                tokenError instanceof InteractionRequiredAuthError ||
                code === "timed_out" ||
                code === "interaction_required" ||
                code === "login_required" ||
                code === "consent_required";

            if (needsInteraction) {
                await instance.loginRedirect({
                    ...loginRequest,
                    prompt: "select_account",
                });
                return null;
            }

            console.warn("No fue posible crear sesión backend con token silencioso.", tokenError);
        }
    }

    try {
        const backendSession = await getBackendSession();

        if (backendSession?.user) {
            return {
                account: existingAccount,
                backendSession,
            };
        }
    } catch {
        return null;
    }

    return null;
}