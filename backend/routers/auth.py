"""
Authentication router — signup, login, logout, current user (HttpOnly cookie + optional Bearer).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, Response, status

from auth.cookies import clear_auth_cookie, set_auth_cookie
from auth.dependencies import CurrentUser
from auth.jwt_handler import create_access_token
from auth.password import verify_password
from models.user import TokenResponse, UserCreate, UserLogin, UserPublic
from services.audit import log_audit
from storage.user_repository import _user_to_public, user_repository

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _auth_response(response: Response, user, token: str) -> TokenResponse:
    set_auth_cookie(response, token)
    return TokenResponse(access_token=token, user=_user_to_public(user))


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: Request, response: Response, body: UserCreate):
    if await user_repository.email_exists(body.email):
        raise HTTPException(status_code=400, detail="Email is already registered.")

    user = await user_repository.create(body)
    token = create_access_token(user.id, {"role": user.role.value})
    await log_audit(
        request=request,
        user_id=user.id,
        action="auth.signup",
        resource_type="user",
        resource_id=user.id,
    )
    return _auth_response(response, user, token)


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, response: Response, body: UserLogin):
    user = await user_repository.get_by_email(body.email)
    if not user or not verify_password(body.password, user.hashed_password):
        await log_audit(
            request=request,
            user_id=None,
            action="auth.login_failed",
            resource_type="user",
            metadata={"email": body.email},
            success=False,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user.id, {"role": user.role.value})
    await log_audit(
        request=request,
        user_id=user.id,
        action="auth.login",
        resource_type="user",
        resource_id=user.id,
    )
    return _auth_response(response, user, token)


@router.post("/logout")
async def logout(request: Request, response: Response, current_user: CurrentUser):
    clear_auth_cookie(response)
    await log_audit(
        request=request,
        user_id=current_user.id,
        action="auth.logout",
        resource_type="user",
        resource_id=current_user.id,
    )
    return {"ok": True}


@router.get("/me", response_model=UserPublic)
async def me(current_user: CurrentUser):
    return _user_to_public(current_user)
