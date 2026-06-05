import pyodbc
from app.core.config import settings


def get_connection_string() -> str:
    return (
        f"DRIVER={{{settings.db_driver}}};"
        f"SERVER={settings.db_server},{settings.db_port};"
        f"DATABASE={settings.db_name};"
        f"UID={settings.db_user};"
        f"PWD={settings.db_password};"
        f"Encrypt={settings.db_encrypt};"
        f"TrustServerCertificate={settings.db_trust_certificate};"
        f"Connection Timeout=30;"
    )


def get_db_connection():
    connection_string = get_connection_string()
    return pyodbc.connect(connection_string)