const msalConfig = {
    auth: {
        clientId: "139a0c88-69bc-4ef1-9709-e8e317dda302",
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
        /**"openid",
        "profile",**/
        "User.Read"
    ]
};

const apiTokenRequest = {
    scopes: [
        "api://BACKEND_CLIENT_ID_REAL/access_as_user"
    ]
};