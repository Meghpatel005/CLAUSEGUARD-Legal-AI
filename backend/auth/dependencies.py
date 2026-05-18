from __future__ import annotations

from typing import Annotated, Optional

from fastapi import Cookie, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from auth.jwt_handler import decode_access_token
from config import settings
from models.user import UserInDB, UserRole
from storage.user_repository import user_repository

_bearer = HTTPBearer(auto_error=False)


def _token_from_request(
    credentials: HTTPAuthorizationCredentials | None,
    cookie_token: Optional[str],
) -> Optional[str]:
    # Prefer explicit Bearer header (API clients/tests); fall back to HttpOnly cookie (browser).
    if credentials and credentials.scheme.lower() == "bearer":
        return credentials.credentials
    if cookie_token:
        return cookie_token
    return None


async def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    cookie_token: Annotated[Optional[str], Cookie(alias=settings.auth_cookie_name)] = None,
) -> UserInDB:
    token = _token_from_request(credentials, cookie_token)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await user_repository.get_by_id(str(payload["sub"]))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    request.state.user_id = user.id
    return user


async def require_admin(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
) -> UserInDB:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return current_user


CurrentUser = Annotated[UserInDB, Depends(get_current_user)]
AdminUser = Annotated[UserInDB, Depends(require_admin)]
