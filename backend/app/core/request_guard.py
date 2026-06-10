from fastapi import Header, HTTPException, status


def require_frontend_request(
    x_ddp_client: str | None = Header(default=None)
) -> None:
    if x_ddp_client != "web":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Direct access is not allowed. Use the web application."
        )