from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId


def str_to_object_id(value: str) -> ObjectId | None:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


def is_valid_object_id(value: str) -> bool:
    return str_to_object_id(value) is not None
