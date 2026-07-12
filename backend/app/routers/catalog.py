from fastapi import APIRouter, HTTPException

from app.services import catalog as catalog_service

router = APIRouter(prefix="/api", tags=["catalog"])


@router.get("/catalog")
async def get_catalog():
    try:
        return catalog_service.fetch_active_catalog()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
