"""
Admin router — stats, users, documents, audit logs.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from auth.dependencies import AdminUser
from db.connection import get_db
from storage.document_repository import document_repository
from storage.user_repository import user_repository

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── helpers ────────────────────────────────────────────────────────────────────

async def _get_stats() -> Dict[str, Any]:
    db = get_db()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = await db.users.count_documents({})
    total_docs = await db.documents.count_documents({})
    total_analyzed = await db.documents.count_documents({"status": "analyzed"})

    # Risky = high or critical overall_risk_level
    risky = await db.documents.count_documents({
        "analysis.overall_risk_level": {"$in": ["high", "critical"]}
    })

    # Active users today = distinct users who uploaded today
    pipeline_active = [
        {"$match": {"upload_timestamp": {"$gte": today_start}}},
        {"$group": {"_id": "$owner_id"}},
        {"$count": "count"},
    ]
    active_result = await db.documents.aggregate(pipeline_active).to_list(1)
    active_today = active_result[0]["count"] if active_result else 0

    # Daily uploads for last 7 days
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    pipeline_daily = [
        {"$match": {"upload_timestamp": {"$gte": seven_days_ago}}},
        {"$group": {
            "_id": {
                "year":  {"$year": "$upload_timestamp"},
                "month": {"$month": "$upload_timestamp"},
                "day":   {"$dayOfMonth": "$upload_timestamp"},
            },
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}},
    ]
    daily_raw = await db.documents.aggregate(pipeline_daily).to_list(30)
    daily_uploads = [
        {
            "date": f"{r['_id']['year']}-{r['_id']['month']:02d}-{r['_id']['day']:02d}",
            "uploads": r["count"],
        }
        for r in daily_raw
    ]

    # Risk distribution across all analyzed docs
    pipeline_risk = [
        {"$match": {"status": "analyzed"}},
        {"$group": {"_id": "$analysis.overall_risk_level", "count": {"$sum": 1}}},
    ]
    risk_raw = await db.documents.aggregate(pipeline_risk).to_list(10)
    risk_distribution = [
        {"level": r["_id"] or "unknown", "count": r["count"]}
        for r in risk_raw if r["_id"]
    ]

    # Most common risky clause categories
    pipeline_categories = [
        {"$match": {"status": "analyzed"}},
        {"$unwind": "$analysis.clauses"},
        {"$match": {"analysis.clauses.risk_level": {"$in": ["high", "critical"]}}},
        {"$group": {"_id": "$analysis.clauses.category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    cat_raw = await db.documents.aggregate(pipeline_categories).to_list(5)
    top_categories = [{"category": r["_id"], "count": r["count"]} for r in cat_raw if r["_id"]]

    return {
        "total_users": total_users,
        "total_contracts": total_docs,
        "ai_analyses_done": total_analyzed,
        "risky_contracts": risky,
        "active_users_today": active_today,
        "daily_uploads": daily_uploads,
        "risk_distribution": risk_distribution,
        "top_risky_categories": top_categories,
    }


async def _get_recent_documents(limit: int = 20) -> List[Dict[str, Any]]:
    db = get_db()
    pipeline = [
        {"$sort": {"upload_timestamp": -1}},
        {"$limit": limit},
        {
            "$lookup": {
                "from": "users",
                "let": {"owner_id": "$owner_id"},
                "pipeline": [
                    {"$match": {"$expr": {"$eq": [{"$toString": "$_id"}, "$$owner_id"]}}},
                    {"$project": {"name": 1, "email": 1}},
                ],
                "as": "owner",
            }
        },
        {"$unwind": {"path": "$owner", "preserveNullAndEmptyArrays": True}},
    ]
    docs = await db.documents.aggregate(pipeline).to_list(limit)
    result = []
    for d in docs:
        result.append({
            "document_id": str(d["_id"]),
            "filename": d.get("original_filename", d.get("filename", "—")),
            "uploaded_by": d.get("owner", {}).get("name", "Unknown"),
            "uploaded_by_email": d.get("owner", {}).get("email", ""),
            "risk_level": d.get("analysis", {}).get("overall_risk_level") if d.get("analysis") else None,
            "risk_score": d.get("analysis", {}).get("overall_risk_score") if d.get("analysis") else None,
            "status": d.get("status", "uploaded"),
            "uploaded_at": d["upload_timestamp"].isoformat() if d.get("upload_timestamp") else None,
            "page_count": d.get("page_count", 0),
        })
    return result


# ── routes ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def admin_stats(_admin: AdminUser):
    return await _get_stats()


@router.get("/users")
async def list_users(_admin: AdminUser):
    return await user_repository.list_all()


@router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, _admin: AdminUser):
    db = get_db()
    from bson import ObjectId
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID.")
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"ok": True, "user_id": user_id}


@router.get("/documents")
async def list_all_documents(_admin: AdminUser):
    return await _get_recent_documents(50)


@router.get("/documents/recent")
async def recent_documents(_admin: AdminUser):
    return await _get_recent_documents(20)


@router.delete("/documents/{document_id}")
async def admin_delete_document(document_id: str, _admin: AdminUser):
    deleted = await document_repository.delete(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"ok": True, "document_id": document_id}


@router.get("/insights/risky-clauses")
async def risky_clauses(_admin: AdminUser):
    """High/critical clauses across all analyzed documents for admin dashboard."""
    db = get_db()
    pipeline = [
        {"$match": {"status": "analyzed", "analysis.clauses": {"$exists": True}}},
        {"$unwind": "$analysis.clauses"},
        {"$match": {"analysis.clauses.risk_level": {"$in": ["high", "critical"]}}},
        {
            "$project": {
                "document_id": {"$toString": "$_id"},
                "filename": "$original_filename",
                "clause": "$analysis.clauses",
                "overall_risk_score": "$analysis.overall_risk_score",
            }
        },
        {"$sort": {"clause.risk_level": -1, "overall_risk_score": -1}},
        {"$limit": 25},
    ]
    rows = await db.documents.aggregate(pipeline).to_list(25)
    return [
        {
            "document_id": r["document_id"],
            "filename": r.get("filename", "—"),
            "clause_title": r["clause"].get("title", "Clause"),
            "risk_level": r["clause"].get("risk_level"),
            "risk_reason": r["clause"].get("risk_reason", ""),
            "category": r["clause"].get("category", ""),
            "page_number": r["clause"].get("page_number"),
            "citation": r["clause"].get("citation"),
            "overall_risk_score": r.get("overall_risk_score"),
        }
        for r in rows
    ]


@router.post("/users")
async def admin_create_user(body: dict, _admin: AdminUser):
    """Admin-only: create a new user account."""
    from models.user import UserCreate

    try:
        payload = UserCreate(
            name=body.get("name", "User"),
            email=body["email"],
            password=body["password"],
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if await user_repository.email_exists(payload.email):
        raise HTTPException(status_code=400, detail="Email already registered.")

    role = body.get("role", "user")
    from models.user import UserRole

    user_role = UserRole.ADMIN if role == "admin" else UserRole.USER
    user = await user_repository.create(payload, role=user_role)
    from storage.user_repository import _user_to_public

    return _user_to_public(user)
