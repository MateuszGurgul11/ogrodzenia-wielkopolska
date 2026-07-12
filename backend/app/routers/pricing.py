from fastapi import APIRouter, HTTPException

from app.auth import AdminUser
from app.models.pricing import PricingSettings
from app.services import pricing as pricing_service
from app.services import pricing_migration as pricing_migration_service

router = APIRouter(prefix="/api", tags=["pricing"])


@router.get("/pricing", response_model=PricingSettings)
async def get_pricing():
    try:
        return pricing_service.get_pricing_settings()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/admin/pricing", response_model=PricingSettings)
async def get_pricing_admin(_user: AdminUser):
    try:
        return pricing_service.get_pricing_settings()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/admin/pricing", response_model=PricingSettings)
async def update_pricing(body: dict, _user: AdminUser):
    try:
        return pricing_service.update_pricing_settings(body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/admin/pricing/apply-defaults")
async def apply_default_pricing(_user: AdminUser):
    try:
        counts = pricing_migration_service.apply_default_variant_prices()
        return {
            "message": "Przykładowe ceny zostały zastosowane do wariantów.",
            "counts": counts,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
