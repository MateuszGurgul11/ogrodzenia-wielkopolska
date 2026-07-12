from typing import Any

from app.firebase import get_db
from app.services import catalog as catalog_service
from app.services.pricing import get_pricing_settings
from app.services.seed_data import DEFAULT_BLOCK_PRICES, DEFAULT_POST_PRICES


def _ensure_fence_variants_and_textures() -> dict[str, int]:
    db = get_db()
    counts = {"fenceVariants": 0, "fenceBlockTextures": 0}

    blocks = list(db.collection("fenceBlocks").stream())
    if not blocks:
        return counts

    block_by_name = {b.to_dict().get("name", ""): b.id for b in blocks}

    colors = list(db.collection("colors").where("active", "==", True).stream())
    posts = list(db.collection("posts").where("active", "==", True).stream())
    heights = list(db.collection("heights").where("active", "==", True).stream())
    height_ids = [h.id for h in heights]
    post_id = posts[0].id if posts else ""
    pricing = get_pricing_settings()

    existing_textures = list(db.collection("fenceBlockTextures").stream())
    if not existing_textures and False:  # tekstury wgrywa admin w macierzy
        pass

    existing_post_textures = list(db.collection("postTextures").stream())
    if not existing_post_textures and False:
        pass

    existing_variants = list(db.collection("fenceVariants").stream())
    if not existing_variants and post_id:
        block_a = block_by_name.get("Panel A")
        block_b = block_by_name.get("Panel B")
        block_cap = block_by_name.get("Panel falowany")

        variants: list[dict[str, Any]] = []
        if block_a:
            variants.append(
                {
                    "name": "Panel A — szczelny",
                    "postId": post_id,
                    "stack": [{"blockId": block_a, "mode": "repeat"}],
                    "azurowoscEnabled": False,
                    "heightIds": height_ids,
                    "sectionWidthCm": pricing.panelWidthCm,
                    "sortOrder": 0,
                    "active": True,
                }
            )
            variants.append(
                {
                    "name": "Panel A — ażurowy",
                    "postId": post_id,
                    "stack": [{"blockId": block_a, "mode": "repeat", "gapCm": 8}],
                    "azurowoscEnabled": True,
                    "heightIds": height_ids,
                    "sectionWidthCm": pricing.panelWidthCm,
                    "sortOrder": 1,
                    "active": True,
                }
            )
        if block_b and block_cap:
            variants.append(
                {
                    "name": "Panel B + falowany",
                    "postId": post_id,
                    "stack": [
                        {"blockId": block_b, "mode": "repeat", "gapCm": 6},
                        {"blockId": block_cap, "mode": "once"},
                    ],
                    "azurowoscEnabled": True,
                    "heightIds": height_ids,
                    "sectionWidthCm": pricing.panelWidthCm,
                    "sortOrder": 2,
                    "active": True,
                }
            )

        for variant in variants:
            catalog_service.create_entity("fenceVariants", variant)
            counts["fenceVariants"] += 1

    return counts


def migrate_fence_catalog() -> dict[str, int]:
    """Mapuje stare panels/panelTextures na fenceBlocks/fenceBlockTextures."""
    db = get_db()
    counts: dict[str, int] = {
        "fenceBlocks": 0,
        "fenceBlockTextures": 0,
        "fenceVariants": 0,
    }

    existing_blocks = list(db.collection("fenceBlocks").stream())
    if not existing_blocks:
        panels = list(db.collection("panels").stream())
        pricing = get_pricing_settings()
        base_price = pricing.panelPriceNet

        panel_id_map: dict[str, str] = {}
        for doc in panels:
            data = doc.to_dict() or {}
            block_payload = {
                "name": data.get("name", "Panel"),
                "heightCm": 50,
                "role": "standard",
                "supportsAzurowosc": True,
                "sortOrder": data.get("sortOrder", 0),
                "active": data.get("active", True),
                "description": data.get("description"),
                "baseTextureUrl": data.get("baseTextureUrl"),
            }
            created = catalog_service.create_entity("fenceBlocks", block_payload)
            panel_id_map[doc.id] = created["id"]
            counts["fenceBlocks"] += 1

        textures = list(db.collection("panelTextures").stream())
        for doc in textures:
            data = doc.to_dict() or {}
            old_panel_id = data.get("panelId")
            block_id = panel_id_map.get(old_panel_id)
            if not block_id:
                continue
            texture_payload = {
                "blockId": block_id,
                "colorId": data.get("colorId"),
                "imageUrl": data.get("imageUrl"),
                "priceNetPerUnit": base_price / 4,
                "sortOrder": data.get("sortOrder", 0),
            }
            catalog_service.create_entity("fenceBlockTextures", texture_payload)
            counts["fenceBlockTextures"] += 1

    extra = _ensure_fence_variants_and_textures()
    counts["fenceVariants"] += extra["fenceVariants"]
    counts["fenceBlockTextures"] += extra["fenceBlockTextures"]

    return counts
