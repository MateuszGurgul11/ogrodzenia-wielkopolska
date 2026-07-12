from typing import Any

from google.cloud.firestore import DELETE_FIELD

from app.firebase import get_db
from app.models.catalog import (
    COLLECTION_NAMES,
    CREATE_MODELS,
    OUT_MODELS,
    CatalogCollections,
    CollectionName,
    AzurowoscPresetOut,
    ColorOut,
    ElementOut,
    FenceBlockOut,
    FenceBlockTextureOut,
    FenceVariantOut,
    HeightOut,
    PanelOut,
    PanelTextureOut,
    PostOut,
    PostTextureOut,
    SpacerOut,
)
from app.services.seed_data import SEED_DATA

TEXTURE_COLLECTIONS = frozenset(
    {"panelTextures", "postTextures", "fenceBlockTextures"}
)


def _doc_to_dict(doc) -> dict[str, Any]:
    data = doc.to_dict() or {}
    return {"id": doc.id, **data}


def _sort_items(items: list[dict]) -> list[dict]:
    return sorted(items, key=lambda x: x.get("sortOrder", 0))


def fetch_collection(
    name: CollectionName,
    active_only: bool = False,
) -> list[dict]:
    db = get_db()
    docs = db.collection(name).stream()
    items = [_doc_to_dict(d) for d in docs]
    if active_only and name not in TEXTURE_COLLECTIONS:
        items = [i for i in items if i.get("active", False)]
    return _sort_items(items)


def fetch_active_catalog() -> CatalogCollections:
    post_textures_raw = fetch_collection("postTextures")
    for item in post_textures_raw:
        item.setdefault("priceNetPerPost", 0)

    return CatalogCollections(
        posts=[PostOut(**i) for i in fetch_collection("posts", active_only=True)],
        fenceBlocks=[
            FenceBlockOut(**i)
            for i in fetch_collection("fenceBlocks", active_only=True)
        ],
        fenceVariants=[
            FenceVariantOut(**i)
            for i in fetch_collection("fenceVariants", active_only=True)
        ],
        fenceBlockTextures=[
            FenceBlockTextureOut(**i)
            for i in fetch_collection("fenceBlockTextures")
        ],
        azurowoscPresets=[
            AzurowoscPresetOut(**i)
            for i in fetch_collection("azurowoscPresets", active_only=True)
        ],
        spacerOptions=[
            SpacerOut(**i)
            for i in fetch_collection("spacerOptions", active_only=True)
        ],
        heights=[HeightOut(**i) for i in fetch_collection("heights", active_only=True)],
        colors=[ColorOut(**i) for i in fetch_collection("colors", active_only=True)],
        elements=[
            ElementOut(**i) for i in fetch_collection("elements", active_only=True)
        ],
        postTextures=[PostTextureOut(**i) for i in post_textures_raw],
        panels=[PanelOut(**i) for i in fetch_collection("panels", active_only=True)],
        panelTextures=[
            PanelTextureOut(**i) for i in fetch_collection("panelTextures")
        ],
    )


def fetch_all_for_admin(name: CollectionName) -> list[dict]:
    out_model = OUT_MODELS[name]
    items = fetch_collection(name, active_only=False)
    if name == "postTextures":
        for item in items:
            item.setdefault("priceNetPerPost", 0)
    if name == "fenceBlockTextures":
        for item in items:
            item.setdefault("priceNetPerUnit", 0)
    return [out_model(**i).model_dump() for i in items]


def create_entity(name: CollectionName, data: dict) -> dict:
    model = CREATE_MODELS[name](**data)
    db = get_db()
    ref = db.collection(name).add(model.model_dump(exclude_none=True))
    doc_id = ref[1].id
    out = OUT_MODELS[name](id=doc_id, **model.model_dump())
    return out.model_dump()


def update_entity(name: CollectionName, doc_id: str, data: dict) -> dict:
    model = CREATE_MODELS[name](**data)
    db = get_db()
    payload: dict[str, Any] = model.model_dump(exclude_none=True)
    for key, value in data.items():
        if value is None:
            payload[key] = DELETE_FIELD
    db.collection(name).document(doc_id).set(payload, merge=True)
    out = OUT_MODELS[name](id=doc_id, **model.model_dump())
    return out.model_dump()


def delete_entity(name: CollectionName, doc_id: str) -> None:
    db = get_db()
    db.collection(name).document(doc_id).delete()


def seed_catalog() -> dict[str, int]:
    counts: dict[str, int] = {}
    for name in COLLECTION_NAMES:
        items = SEED_DATA.get(name, [])
        for item in items:
            create_entity(name, item)
        counts[name] = len(items)
    return counts
