from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


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
    ecology_summary: str
    conservation_status: str
    morphological_clues: str
    image_path: str
    memo: str = ""


class CollectionItem(BaseModel):
    id: int
    korean_name: str
    scientific_name: str
    native_status: str
    confidence: float
    ecology_summary: str
    conservation_status: str
    morphological_clues: str
    image_path: str
    memo: str
    created_at: str
