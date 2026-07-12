from app.firebase import get_db
from app.models.features import DEFAULT_FEATURE_SETTINGS, FeatureSettings

FEATURES_DOC_PATH = ("settings", "features")


def get_feature_settings() -> FeatureSettings:
    try:
        db = get_db()
        doc = db.collection(FEATURES_DOC_PATH[0]).document(FEATURES_DOC_PATH[1]).get()
        if doc.exists:
            data = doc.to_dict() or {}
            return FeatureSettings(**data)
    except FileNotFoundError:
        pass
    except Exception:
        pass
    return DEFAULT_FEATURE_SETTINGS


def update_feature_settings(data: dict) -> FeatureSettings:
    model = FeatureSettings(**data)
    db = get_db()
    db.collection(FEATURES_DOC_PATH[0]).document(FEATURES_DOC_PATH[1]).set(
        model.model_dump(),
        merge=True,
    )
    return model


def seed_feature_settings() -> None:
    db = get_db()
    ref = db.collection(FEATURES_DOC_PATH[0]).document(FEATURES_DOC_PATH[1])
    if not ref.get().exists:
        ref.set(DEFAULT_FEATURE_SETTINGS.model_dump())
