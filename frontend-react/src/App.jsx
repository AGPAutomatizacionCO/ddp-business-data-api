import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";

import { loginWithMicrosoft, restoreMicrosoftSession } from "./auth/authService";
import { closeBackendSession } from "./services/apiClient";

import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";

import "./styles/main.css";

function App() {
    const { instance } = useMsal();

    const [user, setUser] = useState(null);
    const [status, setStatus] = useState(
        "Frontend React activo. Inicia sesión para consultar datos."
    );
    const [error, setError] = useState("");
    const [isRestoringSession, setIsRestoringSession] = useState(true);

    async function handleLogin() {
        try {
            setError("");
            setStatus("Redirigiendo a Microsoft...");

            await loginWithMicrosoft(instance);
        } catch (loginError) {
            console.error(loginError);
            setError(loginError.message || "No fue posible iniciar sesión.");
            setStatus("Error de autenticación.");
        }
    }

    async function handleLogout() {
        try {
            await closeBackendSession();
        } catch (logoutError) {
            console.warn(logoutError);
        }

        await instance.logoutRedirect({
            postLogoutRedirectUri: "http://localhost:5173",
        });
    }

    useEffect(() => {
        async function restoreSession() {
            try {
                setError("");
                setStatus("Validando sesión existente...");

                const result = await restoreMicrosoftSession(instance);

                if (!result) {
                    setStatus(
                        "Frontend React activo. Inicia sesión para consultar datos."
                    );
                    return;
                }

                setUser(result.backendSession.user);
                setStatus("Sesión restaurada correctamente.");
            } catch (restoreError) {
                console.warn(restoreError);
                setUser(null);
                setStatus(
                    "Frontend React activo. Inicia sesión para consultar datos."
                );
            } finally {
                setIsRestoringSession(false);
            }
        }

        restoreSession();
    }, [instance]);

    if (!user) {
        return (
            <AuthPage
                status={status}
                error={error}
                isRestoringSession={isRestoringSession}
                onLogin={handleLogin}
            />
        );
    }

    return (
        <DashboardPage
            user={user}
            status={status}
            onLogout={handleLogout}
        />
    );
}

export default App;