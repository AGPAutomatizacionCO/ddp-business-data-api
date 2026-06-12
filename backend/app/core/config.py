from pathlib import Path
from typing import Any

from dotenv import dotenv_values
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseConnection(BaseModel):
    id: str
    label: str
    server: str
    name: str
    user: str
    password: str
    port: int = 1433
    driver: str = "ODBC Driver 18 for SQL Server"
    encrypt: str = "yes"
    trust_certificate: str = "no"
    enabled: bool = True


class Settings(BaseSettings):
    # Compatibilidad legacy: ya no son obligatorios
    db_server: str | None = None
    db_name: str | None = None
    db_user: str | None = None
    db_password: str | None = None
    db_port: int = 1433
    db_driver: str = "ODBC Driver 18 for SQL Server"
    db_encrypt: str = "yes"
    db_trust_certificate: str = "no"

    # Nueva estructura: ids separados por coma
    # Ejemplo: DB_CONNECTIONS=bridge,colsap
    db_connections: str = ""

    entra_tenant_id: str
    entra_frontend_client_id: str
    entra_issuer: str

    cors_allowed_origins: str = "http://localhost:5173"

    ddp_access_policy_enabled: bool = True
    ddp_admin_users: str = ""
    ddp_analyst_users: str = ""
    ddp_viewer_users: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def get_cors_allowed_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_allowed_origins.split(",")
            if origin.strip()
        ]

    def get_admin_users(self) -> list[str]:
        return self._split_emails(self.ddp_admin_users)

    def get_analyst_users(self) -> list[str]:
        return self._split_emails(self.ddp_analyst_users)

    def get_viewer_users(self) -> list[str]:
        return self._split_emails(self.ddp_viewer_users)

    def get_database_connection_ids(self) -> list[str]:
        return [
            connection_id.strip().lower()
            for connection_id in self.db_connections.split(",")
            if connection_id.strip()
        ]

    def get_database_connections(self) -> list[DatabaseConnection]:
        return [
            self.get_database_connection(connection_id)
            for connection_id in self.get_database_connection_ids()
        ]

    def get_database_connection(self, connection_id: str) -> DatabaseConnection:
        connection_id = connection_id.strip().lower()

        if not connection_id:
            raise ValueError("El id de conexión no puede estar vacío.")

        # Soporte legacy opcional para una conexión main
        if connection_id == "main" and self._has_legacy_connection():
            return DatabaseConnection(
                id="main",
                label="Main",
                server=self.db_server or "",
                name=self.db_name or "",
                user=self.db_user or "",
                password=self.db_password or "",
                port=self.db_port,
                driver=self.db_driver,
                encrypt=self.db_encrypt,
                trust_certificate=self.db_trust_certificate,
                enabled=True,
            )

        env_values = self._load_env_file_values()

        prefix = f"DB_{connection_id.upper()}_"

        label = self._get_env_value(env_values, f"{prefix}LABEL", connection_id.upper())
        server = self._get_env_value(env_values, f"{prefix}SERVER")
        name = self._get_env_value(
            env_values,
            f"{prefix}NAME",
            self._get_env_value(env_values, f"{prefix}DATABASE"),
        )
        user = self._get_env_value(env_values, f"{prefix}USER")
        password = self._get_env_value(env_values, f"{prefix}PASSWORD")

        port = int(self._get_env_value(env_values, f"{prefix}PORT", "1433"))
        driver = self._get_env_value(
            env_values,
            f"{prefix}DRIVER",
            "ODBC Driver 18 for SQL Server",
        )
        encrypt = self._get_env_value(env_values, f"{prefix}ENCRYPT", "yes")
        trust_certificate = self._get_env_value(
            env_values,
            f"{prefix}TRUST_CERTIFICATE",
            "no",
        )
        enabled_raw = self._get_env_value(env_values, f"{prefix}ENABLED", "true")

        missing_fields = []
        if not server:
            missing_fields.append(f"{prefix}SERVER")
        if not name:
            missing_fields.append(f"{prefix}NAME")
        if not user:
            missing_fields.append(f"{prefix}USER")
        if not password:
            missing_fields.append(f"{prefix}PASSWORD")

        if missing_fields:
            raise ValueError(
                "Faltan variables de entorno para la conexión "
                f"'{connection_id}': {', '.join(missing_fields)}"
            )

        return DatabaseConnection(
            id=connection_id,
            label=label,
            server=server,
            name=name,
            user=user,
            password=password,
            port=port,
            driver=driver,
            encrypt=encrypt,
            trust_certificate=trust_certificate,
            enabled=enabled_raw.strip().lower() in {"1", "true", "yes", "y"},
        )

    def _has_legacy_connection(self) -> bool:
        return all(
            [
                self.db_server,
                self.db_name,
                self.db_user,
                self.db_password,
            ]
        )

    @staticmethod
    def _split_emails(value: str) -> list[str]:
        return [
            email.strip().lower()
            for email in value.split(",")
            if email.strip()
        ]

    @staticmethod
    def _load_env_file_values() -> dict[str, Any]:
        env_path = Path(".env")

        if not env_path.exists():
            return {}

        return dict(dotenv_values(env_path))

    @staticmethod
    def _get_env_value(
        env_values: dict[str, Any],
        key: str,
        default: str | None = None,
    ) -> str:
        value = env_values.get(key)

        if value is None:
            return default or ""

        return str(value).strip()


settings: Settings = Settings()  # type: ignore[call-arg]