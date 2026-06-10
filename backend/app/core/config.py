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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

    def get_cors_allowed_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_allowed_origins.split(",")
            if origin.strip()
        ]


settings = Settings()  # type: ignore[call-arg]