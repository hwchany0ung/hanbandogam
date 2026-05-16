from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


NativeStatus = Literal["토종", "외래종", "불명확"]


class IdentifyResult(BaseModel):
    korean_name: str
    scientific_name: str
    native_status: NativeStatus
    confidence: float = Field(ge=0.0, le=1.0)
    ecology_summary: str
    conservation_status: str
    morphological_clues: str
    image_path: Optional[str] = None
    image_url: Optional[str] = None  # /assets/uploads/{uuid}.jpg (영구 저장 경로)


class CollectionAddRequest(BaseModel):
    korean_name: str
    scientific_name: str
    native_status: NativeStatus
    confidence: float = Field(ge=0.0, le=1.0)
    ecology_summary: str
    conservation_status: str
    morphological_clues: str
    image_path: str
    memo: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None


class CollectionItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int
    korean_name: str
    scientific_name: str
    native_status: NativeStatus
    confidence: float
    ecology_summary: str
    conservation_status: str
    morphological_clues: str
    image_path: str
    memo: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    district: Optional[str] = None
    created_at: str


class MapPoint(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int
    korean_name: str
    native_status: NativeStatus
    lat: float
    lng: float
    district: Optional[str] = None
    created_at: str
