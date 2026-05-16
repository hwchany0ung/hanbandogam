import json
import os
import random
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, UploadFile

from domain.types import IdentifyResult
from services.identify_service import run_identify

router = APIRouter(prefix="/api", tags=["identify"])

_DEMO_MODE = os.getenv("APP_DEMO_MODE", "") == "1"
_DEMO_CACHE_DIR = Path(__file__).parent.parent / "demo_cache"


@router.post("/identify", response_model=IdentifyResult)
async def identify(file: UploadFile, memo: str = Form("")):
    if _DEMO_MODE:
        return _load_demo()

    image_bytes = await file.read()
    media_type = file.content_type or "image/jpeg"
    return await run_identify(image_bytes, media_type, memo)


def _load_demo() -> IdentifyResult:
    cache_files = list(_DEMO_CACHE_DIR.glob("*.json"))
    if not cache_files:
        raise HTTPException(status_code=503, detail="demo_cache가 비어있습니다")
    data = json.loads(random.choice(cache_files).read_text(encoding="utf-8"))
    return IdentifyResult.model_validate(data)
