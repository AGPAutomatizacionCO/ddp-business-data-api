import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";

import App from "./App.jsx";
import { msalInstance } from "./auth/msalInstance.js";

async function bootstrapApp() {
    await msalInstance.initialize();

    createRoot(document.getElementById("root")).render(
        <StrictMode>
            <MsalProvider instance={msalInstance}>
                <App />
            </MsalProvider>
        </StrictMode>
    );
}

bootstrapApp();