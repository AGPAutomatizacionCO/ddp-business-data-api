from fastapi import HTTPException, status

from app.core.config import settings


ROLE_ADMIN = "ADMIN"
ROLE_ANALYST = "ANALYST"
ROLE_VIEWER = "VIEWER"
ROLE_UNRESTRICTED = "UNRESTRICTED"


def normalize_username(username: str | None) -> str:
    if not username:
        return ""

    return username.strip().lower()


def resolve_user_role(username: str | None) -> str | None:
    normalized_username = normalize_username(username)

    if not settings.ddp_access_policy_enabled:
        return ROLE_UNRESTRICTED

    if normalized_username in settings.get_admin_users():
        return ROLE_ADMIN

    if normalized_username in settings.get_analyst_users():
        return ROLE_ANALYST

    if normalized_username in settings.get_viewer_users():
        return ROLE_VIEWER

    return None


def require_user_in_access_list(username: str | None) -> str:
    role = resolve_user_role(username)

    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not authorized to access this tool."
        )

    return role


def has_role_permission(session: dict, allowed_roles: list[str]) -> bool:
    user = session.get("user", {})
    role = user.get("role")

    if role == ROLE_UNRESTRICTED:
        return True

    return role in allowed_roles


def require_roles(session: dict, allowed_roles: list[str]) -> None:
    if has_role_permission(session, allowed_roles):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="User does not have permission to perform this action."
    )