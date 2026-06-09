import secrets
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Optional

import requests
from fastapi import HTTPException, Request, Response, status
from jose import jwt
from jose.exceptions import JWTError

from app.core.config import settings


SESSION_COOKIE_NAME = "ddp_session"
SESSION_DURATION_MINUTES = 60

_ACTIVE_SESSIONS: dict[str, dict] = {}


@lru_cache(maxsize=1)
def get_openid_configuration() -> dict:
    url = (
        f"https://login.microsoftonline.com/"
        f"{settings.entra_tenant_id}/v2.0/.well-known/openid-configuration"
    )

    response = requests.get(url, timeout=10)
    response.raise_for_status()

    return response.json()


@lru_cache(maxsize=1)
def get_jwks() -> dict:
    openid_config = get_openid_configuration()
    jwks_uri = openid_config["jwks_uri"]

    response = requests.get(jwks_uri, timeout=10)
    response.raise_for_status()

    return response.json()


def get_microsoft_signing_key(token: str) -> dict:
    try:
        unverified_header = jwt.get_unverified_header(token)
        key_id = unverified_header.get("kid")

        if not key_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token header does not contain kid."
            )

        jwks = get_jwks()

        for key in jwks["keys"]:
            if key.get("kid") == key_id:
                return key

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Microsoft signing key not found."
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token header."
        )


def validate_microsoft_id_token(id_token: str) -> dict:
    signing_key = get_microsoft_signing_key(id_token)

    try:
        claims = jwt.decode(
            id_token,
            signing_key,
            algorithms=["RS256"],
            audience=settings.entra_frontend_client_id,
            issuer=settings.entra_issuer,
            options={
                "verify_aud": True,
                "verify_iss": True,
                "verify_exp": True
            }
        )

        return claims

    except JWTError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Microsoft ID token: {str(error)}"
        )


def create_opaque_session(response: Response, user_data: dict) -> dict:
    session_id = secrets.token_urlsafe(32)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=SESSION_DURATION_MINUTES)

    session_data = {
        "session_id": session_id,
        "user": user_data,
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat()
    }

    _ACTIVE_SESSIONS[session_id] = session_data

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_id,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=SESSION_DURATION_MINUTES * 60,
        path="/"
    )

    return session_data


def get_session_from_request(request: Request) -> Optional[dict]:
    session_id = request.cookies.get(SESSION_COOKIE_NAME)

    if not session_id:
        return None

    session_data = _ACTIVE_SESSIONS.get(session_id)

    if not session_data:
        return None

    expires_at = datetime.fromisoformat(session_data["expires_at"])

    if datetime.now(timezone.utc) > expires_at:
        _ACTIVE_SESSIONS.pop(session_id, None)
        return None

    return session_data


def require_session(request: Request) -> dict:
    session_data = get_session_from_request(request)

    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session required."
        )

    return session_data


def destroy_session(request: Request, response: Response) -> None:
    session_id = request.cookies.get(SESSION_COOKIE_NAME)

    if session_id:
        _ACTIVE_SESSIONS.pop(session_id, None)

    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/"
    )