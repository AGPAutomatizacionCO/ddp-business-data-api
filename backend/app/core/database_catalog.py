import os
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, status

from app.core.config import settings


BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"


@dataclass
class DatabaseConnectionConfig:
    id: str
    label: str
    server: str
    database: str
    user: str
    password: str
    port: int
    driver: str
    encrypt: str
    trust_certificate: str
    environment: str
    owner: str
    business_area: str
    sensitivity_level: str
    sla_level: str
    enabled: bool


def read_env_file() -> dict[str, str]:
    values = {}

    if not ENV_FILE.exists():
        return values

    with ENV_FILE.open("r", encoding="utf-8") as file:
        for raw_line in file:
            line = raw_line.strip()

            if not line:
                continue

            if line.startswith("#"):
                continue

            if "=" not in line:
                continue

            key, value = line.split("=", 1)

            clean_key = key.strip()
            clean_value = value.strip().strip('"').strip("'")

            values[clean_key] = clean_value

    return values


_ENV_VALUES = read_env_file()


def normalize_database_id(database_id: str) -> str:
    return database_id.strip().lower()


def build_env_prefix(database_id: str) -> str:
    return f"DB_{database_id.upper()}"


def get_env_value(prefix: str, key: str, default: str | None = None) -> str | None:
    env_key = f"{prefix}_{key}"

    return os.getenv(env_key) or _ENV_VALUES.get(env_key) or default


def get_env_bool(prefix: str, key: str, default: bool = True) -> bool:
    value = get_env_value(prefix, key)

    if value is None:
        return default

    return value.strip().lower() in ["true", "1", "yes", "y"]


def build_incomplete_connection_error(
    database_id: str,
    missing_keys: list[str],
) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=(
            f"Database connection '{database_id}' is incomplete. "
            f"Missing: {', '.join(missing_keys)}"
        ),
    )


def get_database_connection(database_id: str) -> DatabaseConnectionConfig:
    normalized_id = normalize_database_id(database_id)

    if normalized_id == "main":
        return DatabaseConnectionConfig(
            id="main",
            label=get_env_value("DB_MAIN", "LABEL", "DDP Business Data") or "DDP Business Data",
            server=settings.db_server,
            database=settings.db_name,
            user=settings.db_user,
            password=settings.db_password,
            port=settings.db_port,
            driver=settings.db_driver,
            encrypt=settings.db_encrypt,
            trust_certificate=settings.db_trust_certificate,
            environment=get_env_value("DB_MAIN", "ENVIRONMENT", "local") or "local",
            owner=get_env_value("DB_MAIN", "OWNER", "DDP") or "DDP",
            business_area=get_env_value("DB_MAIN", "BUSINESS_AREA", "DDP") or "DDP",
            sensitivity_level=get_env_value("DB_MAIN", "SENSITIVITY_LEVEL", "medium") or "medium",
            sla_level=get_env_value("DB_MAIN", "SLA_LEVEL", "internal") or "internal",
            enabled=get_env_bool("DB_MAIN", "ENABLED", True),
        )

    allowed_ids = settings.get_database_connection_ids()

    if normalized_id not in allowed_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database connection not found.",
        )

    prefix = build_env_prefix(normalized_id)

    server = get_env_value(prefix, "SERVER")
    database = get_env_value(prefix, "NAME")
    user = get_env_value(prefix, "USER")
    password = get_env_value(prefix, "PASSWORD")

    required_values = {
        f"{prefix}_SERVER": server,
        f"{prefix}_NAME": database,
        f"{prefix}_USER": user,
        f"{prefix}_PASSWORD": password,
    }

    missing_keys = [
        key
        for key, value in required_values.items()
        if not value
    ]

    if missing_keys:
        raise build_incomplete_connection_error(
            database_id=normalized_id,
            missing_keys=missing_keys,
        )
    assert server is not None
    assert database is not None
    assert user is not None
    assert password is not None
    return DatabaseConnectionConfig(
        id=normalized_id,
        label=get_env_value(prefix, "LABEL", normalized_id.upper()) or normalized_id.upper(),
        server=server,
        database=database,
        user=user,
        password=password,
        port=int(get_env_value(prefix, "PORT", "1433") or "1433"),
        driver=get_env_value(prefix, "DRIVER", settings.db_driver) or settings.db_driver,
        encrypt=get_env_value(prefix, "ENCRYPT", settings.db_encrypt) or settings.db_encrypt,
        trust_certificate=(
            get_env_value(prefix, "TRUST_CERTIFICATE", settings.db_trust_certificate)
            or settings.db_trust_certificate
        ),
        environment=get_env_value(prefix, "ENVIRONMENT", "local") or "local",
        owner=get_env_value(prefix, "OWNER", "Not defined") or "Not defined",
        business_area=get_env_value(prefix, "BUSINESS_AREA", "Not defined") or "Not defined",
        sensitivity_level=get_env_value(prefix, "SENSITIVITY_LEVEL", "medium") or "medium",
        sla_level=get_env_value(prefix, "SLA_LEVEL", "internal") or "internal",
        enabled=get_env_bool(prefix, "ENABLED", True),
    )


def get_database_catalog() -> list[dict]:
    catalog = []

    for database_id in settings.get_database_connection_ids():
        try:
            connection = get_database_connection(database_id)

            if not connection.enabled:
                continue

            catalog.append(
                {
                    "id": connection.id,
                    "label": connection.label,
                    "database": connection.database,
                    "environment": connection.environment,
                    "owner": connection.owner,
                    "business_area": connection.business_area,
                    "sensitivity_level": connection.sensitivity_level,
                    "sla_level": connection.sla_level,
                    "enabled": connection.enabled,
                    "configuration_status": "ok",
                }
            )

        except HTTPException as error:
            prefix = build_env_prefix(database_id)

            catalog.append(
                {
                    "id": database_id,
                    "label": get_env_value(prefix, "LABEL", database_id.upper()) or database_id.upper(),
                    "database": get_env_value(prefix, "NAME", "Not configured"),
                    "environment": "configuration_error",
                    "owner": get_env_value(prefix, "OWNER", "Not defined") or "Not defined",
                    "business_area": get_env_value(prefix, "BUSINESS_AREA", "Not defined") or "Not defined",
                    "sensitivity_level": get_env_value(prefix, "SENSITIVITY_LEVEL", "unknown") or "unknown",
                    "sla_level": get_env_value(prefix, "SLA_LEVEL", "unknown") or "unknown",
                    "enabled": False,
                    "configuration_status": "error",
                    "configuration_error": str(error.detail),
                }
            )

    return catalog