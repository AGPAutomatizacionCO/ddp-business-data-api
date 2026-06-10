from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    db_server: str
    db_name: str
    db_user: str
    db_password: str
    db_port: int = 1433
    db_driver: str = "ODBC Driver 18 for SQL Server"
    db_encrypt: str = "yes"
    db_trust_certificate: str = "no"

    entra_tenant_id: str
    entra_frontend_client_id: str
    entra_issuer: str

    cors_allowed_origins: str = "http://localhost:8000"

    ddp_access_policy_enabled: bool = True
    ddp_admin_users: str = ""
    ddp_analyst_users: str = ""
    ddp_viewer_users: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
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

    @staticmethod
    def _split_emails(value: str) -> list[str]:
        return [
            email.strip().lower()
            for email in value.split(",")
            if email.strip()
        ]


settings = Settings()  # type: ignore[call-arg]