from app.firebase import get_db
from app.models.pricing import PricingSettings
from app.services.seed_data import DEFAULT_PRICING_SETTINGS as SEED_PRICING

PRICING_DOC_PATH = ("settings", "pricing")


def get_pricing_settings() -> PricingSettings:
    try:
        db = get_db()
        doc = db.collection(PRICING_DOC_PATH[0]).document(PRICING_DOC_PATH[1]).get()
        if doc.exists:
            data = doc.to_dict() or {}
            return PricingSettings(**data)
    except FileNotFoundError:
        pass
    except Exception:
        pass
    return PricingSettings(**SEED_PRICING)


def update_pricing_settings(data: dict) -> PricingSettings:
    model = PricingSettings(**data)
    db = get_db()
    db.collection(PRICING_DOC_PATH[0]).document(PRICING_DOC_PATH[1]).set(
        model.model_dump(),
        merge=True,
    )
    return model


def seed_pricing_settings() -> None:
    db = get_db()
    ref = db.collection(PRICING_DOC_PATH[0]).document(PRICING_DOC_PATH[1])
    if not ref.get().exists:
        ref.set(PricingSettings(**SEED_PRICING).model_dump())
