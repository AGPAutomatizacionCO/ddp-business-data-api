from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Request

from app.core.database_catalog import get_database_catalog
from app.services.database_service import (
    get_database_objects_by_id,
    get_database_summary_by_id,
)


router = APIRouter(
    prefix="/api/agent/catalog",
    tags=["agent-catalog"],
)


def read_value(source: Any, key: str, default: Any = None) -> Any:
    """
    Lee valores tanto de diccionarios como de objetos.
    Esto evita errores de Pylance cuando el catálogo puede venir tipado
    como dict o como clase de configuración.
    """
    if source is None:
        return default

    if isinstance(source, dict):
        return source.get(key, default)

    return getattr(source, key, default)


def get_database_id(database: Any) -> str:
    return str(read_value(database, "id", ""))


def build_agent_policy() -> dict:
    return {
        "metadata": True,
        "data_preview_allowed": False,
        "sql_execution_allowed": False,
        "write_operations_allowed": False,
        "human_validation_required": True,
    }


def build_agent_object_documentation(object_item: dict) -> dict:
    """
    Construye una ficha segura para agentes IA.
    No expone datos reales ni habilita preview.
    Solo expone metadata estructural documentable.
    """
    return {
        "database_id": object_item.get("database_id"),
        "database_label": object_item.get("database_label"),
        "database_name": object_item.get("database"),
        "schema": object_item.get("schema"),
        "object_name": object_item.get("name"),
        "full_name": object_item.get("full_name"),
        "object_type": object_item.get("type"),
        "object_type_label": object_item.get("type_label"),
        "sql_type": object_item.get("sql_type"),
        "sql_type_description": object_item.get("sql_type_description"),
        "family": object_item.get("family"),
        "family_label": object_item.get("family_label"),
        "created_at": object_item.get("create_date"),
        "modified_at": object_item.get("modify_date"),
        "has_sql_definition": bool(object_item.get("has_definition")),
        "has_sensitive_data": bool(object_item.get("has_sensitive_data")),
        "sensitive_columns_count": object_item.get("sensitive_columns_count", 0),
        "sensitive_columns_available": bool(object_item.get("sensitive_columns")),
        "documentation": {
            "status": "DISCOVERED",
            "ai_summary": None,
            "ai_confidence": None,
            "requires_human_review": True,
            "approved_by": None,
            "approved_at": None,
        },
        "allowed_for_agent": {
            "metadata": True,
            "data_preview": False,
            "sql_execution": False,
            "write_operations": False,
        },
    }


def build_agent_database_item(database: Any) -> dict:
    """
    Construye una ficha de base segura para agentes.
    """
    return {
        "id": read_value(database, "id"),
        "label": read_value(database, "label"),
        "database": read_value(database, "database"),
        "environment": read_value(database, "environment"),
        "business_area": read_value(database, "business_area"),
        "owner": read_value(database, "owner"),
        "sensitivity_level": read_value(database, "sensitivity_level"),
        "sla_level": read_value(database, "sla_level"),
        "configuration_status": read_value(
            database,
            "configuration_status",
            "ok",
        ),
        "configuration_error": read_value(
            database,
            "configuration_error",
            None,
        ),
    }


@router.get("/databases")
def list_agent_catalog_databases(request: Request) -> dict:
    """
    Lista las bases configuradas para uso documental por agentes IA.

    Restricción:
    - No devuelve datos reales.
    - No permite preview.
    - No permite ejecución SQL.
    """
    catalog = get_database_catalog()

    return {
        "status": "ok",
        "scope": "metadata_only",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "policy": build_agent_policy(),
        "data": [
            build_agent_database_item(database)
            for database in catalog
        ],
    }


@router.get("/databases/{database_id}/summary")
def get_agent_catalog_summary(database_id: str, request: Request) -> dict:
    """
    Devuelve resumen estructural de una base para documentación.
    """
    summary = get_database_summary_by_id(database_id)

    return {
        "status": "ok",
        "scope": "metadata_only",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "database_id": database_id,
        "policy": build_agent_policy(),
        "data": summary,
    }


@router.get("/databases/{database_id}/objects")
def list_agent_catalog_objects(database_id: str, request: Request) -> dict:
    """
    Lista objetos estructurales de una base para documentación IA.

    No devuelve registros de tablas.
    No ejecuta SQL.
    No expone preview.
    """
    objects = get_database_objects_by_id(database_id)

    return {
        "status": "ok",
        "scope": "metadata_only",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "database_id": database_id,
        "policy": build_agent_policy(),
        "data": [
            build_agent_object_documentation(object_item)
            for object_item in objects
        ],
    }


@router.get("/snapshot")
def get_agent_catalog_snapshot(request: Request) -> dict:
    """
    Snapshot completo de catálogo para agentes IA documentales.

    Uso esperado:
    - Generar documentación técnica.
    - Clasificar objetos.
    - Proponer dominios de negocio.
    - Crear fichas tipo Spec.

    Restricción:
    - No contiene datos reales.
    - No contiene preview de registros.
    - No ejecuta SQL libre.
    """
    catalog = get_database_catalog()
    snapshot = []

    for database in catalog:
        database_item = build_agent_database_item(database)
        database_id = str(database_item.get("id") or "")

        if database_item.get("configuration_status") == "error":
            snapshot.append(
                {
                    **database_item,
                    "objects": [],
                }
            )
            continue

        try:
            objects = get_database_objects_by_id(database_id)

            snapshot.append(
                {
                    **database_item,
                    "objects": [
                        build_agent_object_documentation(object_item)
                        for object_item in objects
                    ],
                }
            )
        except Exception as error:
            snapshot.append(
                {
                    **database_item,
                    "configuration_status": "runtime_error",
                    "configuration_error": str(error),
                    "objects": [],
                }
            )

    return {
        "status": "ok",
        "scope": "metadata_only",
        "catalog_spec_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "policy": build_agent_policy(),
        "data": snapshot,
    }