const msalConfig = {
    auth: {
        clientId: "d5991ae2-bfad-4c82-a40f-ce9ef5819909",
        authority: "https://login.microsoftonline.com/10f1df46-3600-406b-8233-aa54d28fe447",
        redirectUri: "http://localhost:8000"
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false
    }
};

const loginRequest = {
    scopes: [
        "openid",
        "profile",
        "User.Read"
    ]
};

const apiTokenRequest = {
    scopes: [
        /*"api://BACKEND_CLIENT_ID_REAL/access_as_user"*/
        "User.Read",
        "openid",
        "profile"
    ]
};
console.log("MSAL CONFIG ACTIVO:", msalConfig.auth.clientId);