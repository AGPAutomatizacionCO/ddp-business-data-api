from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_server: str
    db_name: str
    db_user: str
    db_password: str
    db_port: int = 1433
    db_driver: str = "ODBC Driver 18 for SQL Server"
    db_encrypt: str = "yes"
    db_trust_certificate: str = "no"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()