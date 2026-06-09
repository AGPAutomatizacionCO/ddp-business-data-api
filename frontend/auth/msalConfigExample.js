const msalConfig = {
    auth: {
        clientId: "",
        authority: "",
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
        "User.Read"
    ]
};