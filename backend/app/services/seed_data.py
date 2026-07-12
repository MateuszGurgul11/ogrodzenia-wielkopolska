SEED_DATA = {
    "posts": [
        {
            "name": "Słupek standard",
            "slug": "standard",
            "widthCm": 20,
            "sortOrder": 0,
            "active": True,
        },
        {
            "name": "Słupek dekoracyjny",
            "slug": "dekor",
            "widthCm": 25,
            "sortOrder": 1,
            "active": True,
        },
    ],
    "fenceBlocks": [
        {
            "name": "Panel A",
            "heightCm": 50,
            "role": "standard",
            "supportsAzurowosc": True,
            "sortOrder": 0,
            "active": True,
        },
        {
            "name": "Panel B",
            "heightCm": 25,
            "role": "standard",
            "supportsAzurowosc": True,
            "sortOrder": 1,
            "active": True,
        },
        {
            "name": "Panel falowany",
            "heightCm": 20,
            "role": "cap",
            "supportsAzurowosc": False,
            "sortOrder": 2,
            "active": True,
        },
    ],
    "fenceVariants": [],
    "fenceBlockTextures": [],
    "panels": [
        {
            "name": "Gładki",
            "patternId": "pattern-solid",
            "priceSurchargePerMeter": 0,
            "sortOrder": 0,
            "active": True,
        },
    ],
    "spacerOptions": [
        {
            "name": "Bez dystansu (pełne)",
            "hasSpacer": False,
            "openness": 0,
            "priceSurchargePerMeter": 0,
            "sortOrder": 0,
            "active": True,
        },
        {
            "name": "Z dystansem (ażurowe)",
            "hasSpacer": True,
            "openness": 0.35,
            "priceSurchargePerMeter": 40,
            "sortOrder": 1,
            "active": True,
        },
    ],
    "heights": [
        {
            "label": "1,00 m",
            "valueM": 1.0,
            "priceMultiplier": 0.8,
            "sortOrder": 0,
            "active": True,
        },
        {
            "label": "1,50 m",
            "valueM": 1.5,
            "priceMultiplier": 0.92,
            "sortOrder": 1,
            "active": True,
        },
        {
            "label": "1,75 m",
            "valueM": 1.75,
            "priceMultiplier": 1.0,
            "sortOrder": 2,
            "active": True,
        },
        {
            "label": "2,00 m",
            "valueM": 2.0,
            "priceMultiplier": 1.12,
            "sortOrder": 3,
            "active": True,
        },
        {
            "label": "2,25 m",
            "valueM": 2.25,
            "priceMultiplier": 1.22,
            "sortOrder": 4,
            "active": True,
        },
    ],
    "colors": [
        {
            "name": "Szary naturalny",
            "hex": "#9ca3af",
            "sortOrder": 0,
            "active": True,
        },
        {
            "name": "Antracyt",
            "hex": "#374151",
            "sortOrder": 1,
            "active": True,
        },
        {
            "name": "Biały",
            "hex": "#f3f4f6",
            "sortOrder": 2,
            "active": True,
        },
        {
            "name": "Piaskowy",
            "hex": "#d6c4a8",
            "sortOrder": 3,
            "active": True,
        },
        {
            "name": "Grafit",
            "hex": "#4b5563",
            "sortOrder": 4,
            "active": True,
        },
        {
            "name": "Czerwony cegła",
            "hex": "#b45309",
            "sortOrder": 5,
            "active": True,
        },
    ],
    "elements": [
        {
            "type": "brama",
            "name": "Brama wjazdowa",
            "priceNet": 1800,
            "sortOrder": 0,
            "active": True,
        },
        {
            "type": "furtka",
            "name": "Furtka",
            "priceNet": 900,
            "sortOrder": 1,
            "active": True,
        },
    ],
    "panelTextures": [],
    "postTextures": [],
}

DEFAULT_PRICING_SETTINGS = {
    "basePricePerMeterNet": 300,
    "panelPriceNet": 600,
    "panelWidthCm": 200,
    "currency": "PLN",
}

DEFAULT_BLOCK_PRICES = {
    "Panel A": 150,
    "Panel B": 90,
    "Panel falowany": 120,
}

DEFAULT_POST_PRICES = {
    "standard": 80,
    "dekor": 100,
}
