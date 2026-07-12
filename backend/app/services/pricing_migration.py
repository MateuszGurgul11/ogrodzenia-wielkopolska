from app.services.pricing import update_pricing_settings
from app.services.seed_data import DEFAULT_PRICING_SETTINGS


def apply_default_variant_prices() -> dict[str, int]:
    """Ustawia domyślne PricingSettings.

    Ceny ogrodzeń są teraz definiowane per komórka w macierzach
    fenceBlockTextures / postTextures, więc dawne dopłaty per metr
    (panele, kolory, słupki, dystanse) nie są już migrowane.
    """
    update_pricing_settings(DEFAULT_PRICING_SETTINGS)
    return {"pricingSettings": 1}
