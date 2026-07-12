import json
import os
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials, firestore

from app.config import settings

_initialized = False


def _resolve_credentials() -> credentials.Certificate:
    if settings.firebase_service_account_json:
        payload = settings.firebase_service_account_json.strip()
        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            import base64

            data = json.loads(base64.b64decode(payload))
        return credentials.Certificate(data)

    cred_path = settings.google_application_credentials
    if os.path.isfile(cred_path):
        return credentials.Certificate(cred_path)

    gac = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    if gac.startswith("{"):
        return credentials.Certificate(json.loads(gac))
    if gac and os.path.isfile(gac):
        return credentials.Certificate(gac)

    raise FileNotFoundError(
        "Brak poświadczeń Firebase. Ustaw FIREBASE_SERVICE_ACCOUNT_JSON "
        "lub GOOGLE_APPLICATION_CREDENTIALS wskazujące na plik service account."
    )


def init_firebase() -> None:
    global _initialized
    if _initialized or firebase_admin._apps:
        _initialized = True
        return

    cred = _resolve_credentials()
    firebase_admin.initialize_app(
        cred,
        {"projectId": settings.firebase_project_id},
    )
    _initialized = True


@lru_cache
def get_db() -> firestore.Client:
    init_firebase()
    return firestore.client()
