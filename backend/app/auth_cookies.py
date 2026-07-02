from fastapi import Request, Response

from .config import settings

ACCESS_TOKEN_COOKIE_NAME = "access_token"
ACCESS_TOKEN_COOKIE_PATH = "/"
ACCESS_TOKEN_COOKIE_SAMESITE = "lax"


def set_access_token_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path=ACCESS_TOKEN_COOKIE_PATH,
        secure=True,
        httponly=True,
        samesite=ACCESS_TOKEN_COOKIE_SAMESITE,
    )


def clear_access_token_cookie(response: Response) -> None:
    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        path=ACCESS_TOKEN_COOKIE_PATH,
        secure=True,
        httponly=True,
        samesite=ACCESS_TOKEN_COOKIE_SAMESITE,
    )


def get_access_token_candidates(request: Request, bearer_token: str | None) -> list[str]:
    cookie_token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
    candidates = [token for token in (cookie_token, bearer_token) if token]
    return list(dict.fromkeys(candidates))
