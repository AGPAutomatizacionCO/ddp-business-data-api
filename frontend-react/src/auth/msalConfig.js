//  clientId: "d5991ae2-bfad-4c82-a40f-ce9ef5819909",
//         authority: "https://login.microsoftonline.com/10f1df46-3600-406b-8233-aa54d28fe447",
export const msalConfig = {
    auth: {
        clientId: "d5991ae2-bfad-4c82-a40f-ce9ef5819909",
        authority: "https://login.microsoftonline.com/10f1df46-3600-406b-8233-aa54d28fe447",
        redirectUri: "http://localhost:5173",
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false
    }
};

export const loginRequest = {
    scopes: [
        "openid",
        "profile"
    ]
};