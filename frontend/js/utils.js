window.DDP = window.DDP || {};

DDP.utils = {
escapeHtml(value) {
if (value === null || value === undefined) {
return "";
}

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
},

getUserDisplayName(account) {
    return (
        account?.name ||
        account?.idTokenClaims?.name ||
        account?.idTokenClaims?.given_name ||
        account?.username ||
        "-"
    );
},

getInitials(nameOrEmail) {
    if (!nameOrEmail) {
        return "-";
    }

    const cleanValue = String(nameOrEmail).split("@")[0];
    const parts = cleanValue.trim().split(/\s+/);

    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return cleanValue.slice(0, 2).toUpperCase();
},

normalizeTable(rawTable) {
    return {
        schema_name:
            rawTable.schema_name ||
            rawTable.TABLE_SCHEMA ||
            rawTable.table_schema ||
            rawTable.schema ||
            "-",

        table_name:
            rawTable.table_name ||
            rawTable.TABLE_NAME ||
            rawTable.name ||
            "-",

        has_sensitive_data:
            Boolean(
                rawTable.has_sensitive_data ||
                rawTable.hasSensitiveData ||
                rawTable.sensitive ||
                false
            ),

        sensitive_columns_count:
            Number(
                rawTable.sensitive_columns_count ||
                rawTable.sensitiveColumnsCount ||
                rawTable.sensitive_count ||
                0
            ),

        sensitive_columns:
            rawTable.sensitive_columns ||
            rawTable.sensitiveColumns ||
            []
    };
},

clearMsalBrowserStorage() {
    sessionStorage.clear();

    Object.keys(localStorage).forEach((key) => {
        const normalizedKey = key.toLowerCase();

        if (
            normalizedKey.includes("msal") ||
            normalizedKey.includes("login") ||
            normalizedKey.includes("token")
        ) {
            localStorage.removeItem(key);
        }
    });
}

};