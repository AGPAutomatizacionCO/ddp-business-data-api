from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


ERROR_CODES_BY_STATUS = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    422: "VALIDATION_ERROR",
    500: "INTERNAL_SERVER_ERROR",
}


def get_request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def resolve_error_code(status_code: int, message: str | None = None) -> str:
    normalized_message = (message or "").lower()

    if status_code == 401 and "session required" in normalized_message:
        return "SESSION_REQUIRED"

    if status_code == 401 and "invalid backend session" in normalized_message:
        return "INVALID_SESSION"

    if status_code == 401 and "invalid microsoft id token" in normalized_message:
        return "INVALID_MICROSOFT_TOKEN"

    if status_code == 403 and "not authorized" in normalized_message:
        return "USER_NOT_ALLOWED"

    if status_code == 403 and "permission" in normalized_message:
        return "INSUFFICIENT_ROLE"

    if status_code == 403 and "direct access" in normalized_message:
        return "DIRECT_ACCESS_BLOCKED"

    return ERROR_CODES_BY_STATUS.get(status_code, "API_ERROR")


def build_error_response(
    request: Request,
    status_code: int,
    message: str,
    code: str | None = None,
) -> JSONResponse:
    error_code = code or resolve_error_code(status_code, message)

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "error",
            "error": {
                "code": error_code,
                "message": message,
                "request_id": get_request_id(request),
            },
        },
    )


async def http_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    if isinstance(exc, StarletteHTTPException):
        message = str(exc.detail) if exc.detail else "API error."

        return build_error_response(
            request=request,
            status_code=exc.status_code,
            message=message,
        )

    return build_error_response(
        request=request,
        status_code=500,
        message="Unexpected internal server error.",
        code="INTERNAL_SERVER_ERROR",
    )


async def validation_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    details = []

    if isinstance(exc, RequestValidationError):
        details = exc.errors()

    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "The request contains invalid or incomplete data.",
                "request_id": get_request_id(request),
                "details": details,
            },
        },
    )


async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    return build_error_response(
        request=request,
        status_code=500,
        message="Unexpected internal server error.",
        code="INTERNAL_SERVER_ERROR",
    )