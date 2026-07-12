from pydantic import BaseModel, Field


class FeatureSettings(BaseModel):
    bramaEnabled: bool = True
    furtkaEnabled: bool = True


DEFAULT_FEATURE_SETTINGS = FeatureSettings()
