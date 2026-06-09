from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from app.core.session import (
    create_opaque_session,
    destroy_session,
    require_session,
    validate_microsoft_id_token
)


router = APIRouter(
    prefix="/auth",
    tags=["Auth Session"]
)


class SessionRequest(BaseModel):
    id_token: str


@router.post("/session")
def start_session(payload: SessionRequest, response: Response):
    try:
        claims = validate_microsoft_id_token(payload.id_token)

        user_data = {
            "name": claims.get("name"),
            "username": claims.get("preferred_username") or claims.get("email"),
            "tenant_id": claims.get("tid"),
            "local_account_id": claims.get("sub"),
            "oid": claims.get("oid")
        }

        session_data = create_opaque_session(response, user_data)

        return {
            "status": "ok",
            "message": "Backend session created.",
            "user": user_data,
            "expires_at": session_data["expires_at"]
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Backend session creation error: {str(error)}"
        )


@router.post("/logout")
def logout(request: Request, response: Response):
    destroy_session(request, response)

    return {
        "status": "ok",
        "message": "Session closed."
    }


@router.get("/me")
def me(request: Request):
    session_data = require_session(request)

    return {
        "status": "ok",
        "user": session_data["user"],
        "expires_at": session_data["expires_at"]
    }