from typing import Any

from fastapi import APIRouter, HTTPException

from app.auth import AdminUser
from app.models.catalog import COLLECTION_NAMES, CollectionName, CREATE_MODELS
from app.services import catalog as catalog_service
from app.services import pricing as pricing_service
from app.services import fence_migration as fence_migration_service
from app.services import pricing_migration as pricing_migration_service

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _validate_collection(name: str) -> CollectionName:
    if name not in COLLECTION_NAMES:
        raise HTTPException(status_code=404, detail=f"Nieznana kolekcja: {name}")
    return name  # type: ignore[return-value]


@router.post("/seed")
async def seed(_user: AdminUser):
    try:
        counts = catalog_service.seed_catalog()
        pricing_service.seed_pricing_settings()
        pricing_counts = pricing_migration_service.apply_default_variant_prices()
        fence_counts = fence_migration_service.migrate_fence_catalog()
        return {
            "message": "Dane przykładowe zostały dodane (w tym ustawienia i ceny wyceny).",
            "counts": {**counts, **pricing_counts, **fence_counts},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/{collection}")
async def list_collection(collection: str, _user: AdminUser):
    col = _validate_collection(collection)
    try:
        return catalog_service.fetch_all_for_admin(col)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/{collection}")
async def create_item(collection: str, body: dict[str, Any], _user: AdminUser):
    col = _validate_collection(collection)
    try:
        CREATE_MODELS[col](**body)
        return catalog_service.create_entity(col, body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.put("/{collection}/{doc_id}")
async def update_item(
    collection: str,
    doc_id: str,
    body: dict[str, Any],
    _user: AdminUser,
):
    col = _validate_collection(collection)
    try:
        CREATE_MODELS[col](**body)
        return catalog_service.update_entity(col, doc_id, body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/{collection}/{doc_id}")
async def delete_item(collection: str, doc_id: str, _user: AdminUser):
    col = _validate_collection(collection)
    try:
        catalog_service.delete_entity(col, doc_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
