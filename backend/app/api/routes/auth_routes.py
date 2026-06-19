from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from app.core.access_control import require_user_in_access_list
from app.core.audit_logger import write_audit_event
from app.core.session import (
    create_opaque_session,
    destroy_session,
    require_session,
    validate_microsoft_id_token,
)


router = APIRouter(
    prefix="/auth",
    tags=["Auth Session"],
)


class SessionRequest(BaseModel):
    id_token: str


def get_safe_user_info(user_or_session) -> dict:
    """
    Extrae información segura del usuario para auditoría.
    No incluye tokens ni claims sensibles completos.
    """
    if user_or_session is None:
        return {}

    if isinstance(user_or_session, dict):
        user = user_or_session.get("user", user_or_session)

        if isinstance(user, dict):
            return {
                "name": user.get("name"),
                "username": user.get("username"),
                "email": user.get("email") or user.get("preferred_username"),
                "tenant_id": user.get("tenant_id"),
                "oid": user.get("oid"),
                "role": user.get("role"),
                "roles": user.get("roles"),
            }

    user = getattr(user_or_session, "user", user_or_session)

    return {
        "name": getattr(user, "name", None),
        "username": getattr(user, "username", None),
        "email": getattr(user, "email", None)
        or getattr(user, "preferred_username", None),
        "tenant_id": getattr(user, "tenant_id", None),
        "oid": getattr(user, "oid", None),
        "role": getattr(user, "role", None),
        "roles": getattr(user, "roles", None),
    }


@router.post("/session")
def start_session(
    payload: SessionRequest,
    request: Request,
    response: Response,
):
    try:
        claims = validate_microsoft_id_token(payload.id_token)

        username = claims.get("preferred_username") or claims.get("email")
        role = require_user_in_access_list(username)

        user_data = {
            "name": claims.get("name"),
            "username": username,
            "tenant_id": claims.get("tid"),
            "local_account_id": claims.get("sub"),
            "oid": claims.get("oid"),
            "role": role,
        }

        session_data = create_opaque_session(response, user_data)

        write_audit_event(
            event_type="SESSION_CREATED",
            category="auth",
            request=request,
            user=get_safe_user_info(user_data),
            resource={
                "resource_type": "auth_session",
            },
            result="ok",
            details={
                "message": "Sesión backend creada correctamente.",
                "expires_at": session_data.get("expires_at"),
            },
        )

        return {
            "status": "ok",
            "message": "Backend session created.",
            "user": user_data,
            "expires_at": session_data["expires_at"],
        }

    except HTTPException as http_error:
        write_audit_event(
            event_type="SESSION_CREATE_BLOCKED",
            category="access_denied",
            request=request,
            user={},
            resource={
                "resource_type": "auth_session",
            },
            result="blocked",
            details={
                "status_code": http_error.status_code,
                "detail": http_error.detail,
            },
        )

        raise

    except Exception as error:
        write_audit_event(
            event_type="SESSION_CREATE_ERROR",
            category="errors",
            request=request,
            user={},
            resource={
                "resource_type": "auth_session",
            },
            result="error",
            details={
                "error": str(error),
            },
        )

        raise HTTPException(
            status_code=500,
            detail=f"Backend session creation error: {str(error)}",
        )


@router.post("/logout")
def logout(request: Request, response: Response):
    session_data = None

    try:
        session_data = require_session(request)
    except Exception:
        session_data = None

    write_audit_event(
        event_type="SESSION_CLOSED",
        category="auth",
        request=request,
        user=get_safe_user_info(session_data),
        resource={
            "resource_type": "auth_session",
        },
        result="ok",
        details={
            "message": "Sesión cerrada por el usuario.",
        },
    )

    destroy_session(request, response)

    return {
        "status": "ok",
        "message": "Session closed.",
    }


@router.get("/me")
def me(request: Request):
    session_data = require_session(request)

    write_audit_event(
        event_type="SESSION_READ",
        category="auth",
        request=request,
        user=get_safe_user_info(session_data),
        resource={
            "resource_type": "auth_session",
        },
        result="ok",
        details={
            "message": "Validación de sesión activa.",
            "expires_at": session_data.get("expires_at"),
        },
    )

    return {
        "status": "ok",
        "user": session_data["user"],
        "expires_at": session_data["expires_at"],
    }