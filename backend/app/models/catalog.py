from typing import Literal

from pydantic import BaseModel, Field, field_validator
import re

COLLECTION_NAMES = (
    "posts",
    "fenceBlocks",
    "fenceVariants",
    "fenceBlockTextures",
    "azurowoscPresets",
    "spacerOptions",
    "heights",
    "colors",
    "elements",
    "postTextures",
    "panels",
    "panelTextures",
)
CollectionName = Literal[
    "posts",
    "fenceBlocks",
    "fenceVariants",
    "fenceBlockTextures",
    "azurowoscPresets",
    "spacerOptions",
    "heights",
    "colors",
    "elements",
    "postTextures",
    "panels",
    "panelTextures",
]

HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
PATTERN_IDS = ("pattern-solid", "pattern-lines", "pattern-grid", "pattern-brick")


class BaseEntity(BaseModel):
    name: str = Field(min_length=1)
    sortOrder: int = Field(ge=0, default=0)
    active: bool = True
    description: str | None = None
    previewAsset: str | None = None


class PostCreate(BaseEntity):
    slug: str = Field(min_length=1, pattern=r"^[a-z0-9-]+$")
    widthCm: float = Field(ge=10, le=50)
    priceSurchargePerPanel: float | None = Field(default=None, ge=0)
    priceSurchargePerMeter: float = Field(ge=0, default=0)
    baseTextureUrl: str | None = None


class PostOut(PostCreate):
    id: str


class FenceBlockCreate(BaseModel):
    name: str = Field(min_length=1)
    heightCm: float = Field(ge=5, le=250)
    role: Literal["standard", "cap"] = "standard"
    patternKey: str | None = None
    supportsAzurowosc: bool = False
    sortOrder: int = Field(ge=0, default=0)
    active: bool = True
    description: str | None = None
    baseTextureUrl: str | None = None
    svgMarkup: str | None = Field(default=None, max_length=200_000)


class FenceBlockOut(FenceBlockCreate):
    id: str


class FenceStackSlot(BaseModel):
    blockId: str = Field(min_length=1)
    mode: Literal["repeat", "once"] = "repeat"
    gapCm: float | None = Field(default=None, ge=0, le=50)
    mirrorsMain: bool | None = None


class AzurowoscPresetCreate(BaseModel):
    name: str = Field(min_length=1)
    gapCm: float = Field(ge=0, le=50, default=2)
    sortOrder: int = Field(ge=0, default=0)
    active: bool = True
    description: str | None = None


class AzurowoscPresetOut(AzurowoscPresetCreate):
    id: str


class FenceAzurUnit(BaseModel):
    blockId: str | None = None
    isGap: bool = False
    heightCm: float = Field(ge=1, le=250)


class FenceAzurLayoutByHeight(BaseModel):
    heightM: float = Field(ge=0.5, le=4)
    units: list[FenceAzurUnit] = Field(min_length=1)


class FenceAzurOption(BaseModel):
    gapCm: float = Field(ge=1, le=100)
    layouts: list[FenceAzurLayoutByHeight] = Field(default_factory=list)


class FenceStackVersion(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    stack: list[FenceStackSlot] = Field(min_length=1)
    azurowoscEnabled: bool = False
    azurowoscOptions: list[FenceAzurOption] | None = None
    azurowoscColorId: str | None = None
    postHeightCm: float | None = Field(default=None, ge=50, le=300)
    postHeightOffsetCm: float | None = Field(default=None, ge=-150, le=150)
    sortOrder: int = Field(ge=0, default=0)


class FenceVariantCreate(BaseModel):
    name: str = Field(min_length=1)
    postId: str = Field(min_length=1)
    stack: list[FenceStackSlot] = Field(default_factory=list)
    stackVersions: list[FenceStackVersion] | None = Field(
        default=None,
        min_length=1,
    )
    azurowoscEnabled: bool = False
    azurowoscPresetId: str | None = None
    azurowoscOptions: list[FenceAzurOption] | None = None
    azurowoscLayout: list[FenceAzurUnit] | None = None
    azurowoscDesignHeightM: float | None = Field(default=None, ge=1.0, le=2.25)
    azurowoscColorId: str | None = None
    postHeightCm: float | None = Field(default=None, ge=50, le=300)
    postHeightOffsetCm: float | None = Field(default=None, ge=-150, le=150)
    heightIds: list[str] = Field(default_factory=list)
    sectionWidthCm: float = Field(ge=50, le=400, default=200)
    sortOrder: int = Field(ge=0, default=0)
    active: bool = True
    description: str | None = None


class FenceVariantOut(FenceVariantCreate):
    id: str


class PanelCreate(BaseEntity):
    patternId: Literal[
        "pattern-solid", "pattern-lines", "pattern-grid", "pattern-brick"
    ]
    priceSurchargePerPanel: float | None = Field(default=None, ge=0)
    priceSurchargePerMeter: float = Field(ge=0, default=0)
    baseTextureUrl: str | None = None
    textureTileHeightM: float | None = Field(default=None, ge=0.1, le=2.25)


class PanelOut(PanelCreate):
    id: str


class SpacerCreate(BaseEntity):
    hasSpacer: bool
    openness: float = Field(ge=0, le=1)
    priceSurchargePerPanel: float | None = Field(default=None, ge=0)
    priceSurchargePerMeter: float = Field(ge=0, default=0)


class SpacerOut(SpacerCreate):
    id: str


class HeightCreate(BaseModel):
    label: str = Field(min_length=1)
    valueM: float = Field(ge=1.0, le=2.25)
    sortOrder: int = Field(ge=0, default=0)
    active: bool = True
    description: str | None = None
    priceMultiplier: float = Field(ge=0.1, le=5, default=1.0)


class HeightOut(HeightCreate):
    id: str


class ColorCreate(BaseEntity):
    hex: str
    priceSurchargePerPanel: float | None = Field(default=None, ge=0)
    priceSurchargePerMeter: float = Field(ge=0, default=0)

    @field_validator("hex")
    @classmethod
    def validate_hex(cls, v: str) -> str:
        if not HEX_RE.match(v):
            raise ValueError("Kolor musi być w formacie #RRGGBB")
        return v


class ColorOut(ColorCreate):
    id: str


class ElementCreate(BaseModel):
    type: Literal["brama", "furtka"]
    name: str = Field(min_length=1)
    sortOrder: int = Field(ge=0, default=0)
    active: bool = True
    description: str | None = None
    textureUrl: str | None = None
    priceNet: float = Field(ge=0, default=0)


class ElementOut(ElementCreate):
    id: str


class FenceBlockTextureCreate(BaseModel):
    blockId: str = Field(min_length=1)
    colorId: str = Field(min_length=1)
    imageUrl: str = Field(default="")
    priceNetPerUnit: float = Field(ge=0, default=0)
    sortOrder: int = Field(ge=0, default=0)


class FenceBlockTextureOut(FenceBlockTextureCreate):
    id: str


class PanelTextureCreate(BaseModel):
    panelId: str = Field(min_length=1)
    colorId: str = Field(min_length=1)
    imageUrl: str = Field(min_length=1)
    sortOrder: int = Field(ge=0, default=0)


class PanelTextureOut(PanelTextureCreate):
    id: str


class PostTextureCreate(BaseModel):
    postId: str = Field(min_length=1)
    colorId: str = Field(min_length=1)
    imageUrl: str = Field(min_length=1)
    priceNetPerPost: float = Field(ge=0, default=0)
    sortOrder: int = Field(ge=0, default=0)


class PostTextureOut(PostTextureCreate):
    id: str


class CatalogCollections(BaseModel):
    posts: list[PostOut]
    fenceBlocks: list[FenceBlockOut]
    fenceVariants: list[FenceVariantOut]
    fenceBlockTextures: list[FenceBlockTextureOut]
    azurowoscPresets: list[AzurowoscPresetOut]
    spacerOptions: list[SpacerOut]
    heights: list[HeightOut]
    colors: list[ColorOut]
    elements: list[ElementOut]
    postTextures: list[PostTextureOut]
    panels: list[PanelOut] = Field(default_factory=list)
    panelTextures: list[PanelTextureOut] = Field(default_factory=list)


CREATE_MODELS = {
    "posts": PostCreate,
    "fenceBlocks": FenceBlockCreate,
    "fenceVariants": FenceVariantCreate,
    "fenceBlockTextures": FenceBlockTextureCreate,
    "azurowoscPresets": AzurowoscPresetCreate,
    "panels": PanelCreate,
    "spacerOptions": SpacerCreate,
    "heights": HeightCreate,
    "colors": ColorCreate,
    "elements": ElementCreate,
    "panelTextures": PanelTextureCreate,
    "postTextures": PostTextureCreate,
}

OUT_MODELS = {
    "posts": PostOut,
    "fenceBlocks": FenceBlockOut,
    "fenceVariants": FenceVariantOut,
    "fenceBlockTextures": FenceBlockTextureOut,
    "azurowoscPresets": AzurowoscPresetOut,
    "panels": PanelOut,
    "spacerOptions": SpacerOut,
    "heights": HeightOut,
    "colors": ColorOut,
    "elements": ElementOut,
    "panelTextures": PanelTextureOut,
    "postTextures": PostTextureOut,
}
