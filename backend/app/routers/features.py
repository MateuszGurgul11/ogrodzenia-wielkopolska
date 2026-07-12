from fastapi import APIRouter, HTTPException

from app.auth import AdminUser
from app.models.features import FeatureSettings
from app.services import features as features_service

router = APIRouter(prefix="/api", tags=["features"])


@router.get("/features", response_model=FeatureSettings)
async def get_features():
    try:
        return features_service.get_feature_settings()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/admin/features", response_model=FeatureSettings)
async def get_features_admin(_user: AdminUser):
    try:
        return features_service.get_feature_settings()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/admin/features", response_model=FeatureSettings)
async def update_features(body: dict, _user: AdminUser):
    try:
        return features_service.update_feature_settings(body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
