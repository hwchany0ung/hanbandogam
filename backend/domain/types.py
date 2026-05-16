from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class IdentifyResult(BaseModel):
    korean_name: str
    scientific_name: str
    native_status: Literal["토종", "외래종", "불명확"]
    confidence: float = Field(ge=0.0, le=1.0)
    ecology_summary: str
    conservation_status: str
    morphological_clues: str


class CollectionAddRequest(BaseModel):
    korean_name: str
    scientific_name: str
    native_status: str
    confidence: float = Field(ge=0.0, le=1.0)
    ecology_summary: str = ""
    conservation_status: str = ""
    morphological_clues: str = ""
    image_path: str = ""
    memo: str = ""
    species_id: Optional[int] = None


class CollectionItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int
    korean_name: str
    scientific_name: str
    native_status: str
    confidence: Optional[float] = None
    ecology_summary: str = ""
    conservation_status: str = ""
    morphological_clues: str = ""
    image_path: str = ""
    memo: str = ""
    species_id: Optional[int] = None
    created_at: str = ""
