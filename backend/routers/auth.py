"""
Authentication router — signup, login, current user.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from auth.dependencies import CurrentUser
from auth.jwt_handler import create_access_token
from auth.password import verify_password
from models.user import TokenResponse, UserCreate, UserLogin, UserPublic
from storage.user_repository import _user_to_public, user_repository

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: UserCreate):
    if await user_repository.email_exists(body.email):
        raise HTTPException(status_code=400, detail="Email is already registered.")

    user = await user_repository.create(body)
    token = create_access_token(user.id, {"role": user.role.value})
    return TokenResponse(
        access_token=token,
        user=_user_to_public(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin):
    user = await user_repository.get_by_email(body.email)
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user.id, {"role": user.role.value})
    return TokenResponse(
        access_token=token,
        user=_user_to_public(user),
    )


@router.get("/me", response_model=UserPublic)
async def me(current_user: CurrentUser):
    return _user_to_public(current_user)
