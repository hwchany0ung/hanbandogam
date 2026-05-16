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
    plant_type: Optional[str] = None  # tree | flower | herb | vine | fern | shrub | grass | other
    illustration_url: Optional[str] = None  # 콜드스타트: S3 일러스트 URL
    story: Optional[str] = None              # 콜드스타트: 이야기 텍스트 (DB or Claude Haiku)


class CollectionAddRequest(BaseModel):
    korean_name: str
    scientific_name: str
    native_status: NativeStatus
    confidence: float = Field(ge=0.0, le=1.0)
    ecology_summary: str
    conservation_status: str
    morphological_clues: str
    image_path: str
    image_url: Optional[str] = None  # S3 사용자 사진 URL (보존 — image_path 가 일러스트로 덮어써져도 살아남음)
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
    image_url: Optional[str] = None  # S3 사용자 사진 URL
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
