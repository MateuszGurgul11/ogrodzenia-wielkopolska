from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.firebase import init_firebase
from app.routers import admin, catalog, features, pricing


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_firebase()
    except FileNotFoundError:
        pass
    yield


app = FastAPI(
    title="Ogrodzenia Wielkopolska API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(catalog.router)
app.include_router(pricing.router)
app.include_router(features.router)
app.include_router(admin.router)


@app.get("/api/health")
async def health():
    firebase_ok = False
    try:
        init_firebase()
        firebase_ok = True
    except FileNotFoundError:
        pass

    return {
        "status": "ok",
        "firebase": firebase_ok,
        "project": settings.firebase_project_id,
    }
