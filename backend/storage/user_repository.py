from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId

from auth.password import hash_password
from db.connection import get_db
from models.user import UserCreate, UserInDB, UserPublic, UserRole


def _doc_to_user(doc: dict) -> UserInDB:
    return UserInDB(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        role=UserRole(doc.get("role", UserRole.USER.value)),
        hashed_password=doc["hashed_password"],
        created_at=doc["created_at"],
    )


def _user_to_public(user: UserInDB) -> UserPublic:
    return UserPublic(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        created_at=user.created_at,
    )


class UserRepository:
    @property
    def _col(self):
        return get_db().users

    async def create(self, data: UserCreate, role: UserRole = UserRole.USER) -> UserInDB:
        now = datetime.now(timezone.utc)
        doc = {
            "name": data.name.strip(),
            "email": data.email.lower().strip(),
            "hashed_password": hash_password(data.password),
            "role": role.value,
            "created_at": now,
        }
        result = await self._col.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _doc_to_user(doc)

    async def get_by_id(self, user_id: str) -> Optional[UserInDB]:
        try:
            oid = ObjectId(user_id)
        except Exception:
            return None
        doc = await self._col.find_one({"_id": oid})
        return _doc_to_user(doc) if doc else None

    async def get_by_email(self, email: str) -> Optional[UserInDB]:
        doc = await self._col.find_one({"email": email.lower().strip()})
        return _doc_to_user(doc) if doc else None

    async def list_all(self) -> List[UserPublic]:
        cursor = self._col.find({}, sort=[("created_at", -1)])
        users: List[UserPublic] = []
        async for doc in cursor:
            users.append(_user_to_public(_doc_to_user(doc)))
        return users

    async def email_exists(self, email: str) -> bool:
        doc = await self._col.find_one({"email": email.lower().strip()}, {"_id": 1})
        return doc is not None


user_repository = UserRepository()
