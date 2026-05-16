from __future__ import annotations

import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

logger = logging.getLogger(__name__)


try:
    from backend.services.identify_service import IdentifyResult, run_identify
except ImportError:
    from services.identify_service import IdentifyResult, run_identify

try:
    from backend.services.s3_uploader import upload_image as s3_upload_image, is_enabled as s3_enabled
except ImportError:
    from services.s3_uploader import upload_image as s3_upload_image, is_enabled as s3_enabled


router = APIRouter(tags=["identify"])


UPLOADS_DIR = Path(__file__).resolve().parent.parent / "assets" / "uploads"

ALLOWED_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAX_IMAGE_BYTES = 10 * 1024 * 1024


def _persist_upload(image_bytes: bytes, media_type: str) -> str:
    ext = ALLOWED_EXTENSIONS.get((media_type or "").lower(), ".jpg")
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    target = UPLOADS_DIR / filename
    target.write_bytes(image_bytes)
    return f"/assets/uploads/{filename}"


@router.post("/api/identify", response_model=IdentifyResult)
async def identify(
    file: UploadFile = File(...),
    memo: str = Form(""),
) -> IdentifyResult:
    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(status_code=400, detail="업로드된 이미지 파일이 비어 있습니다.")

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="이미지 용량이 너무 큽니다 (최대 10MB).")

    media_type = file.content_type or "image/jpeg"

    image_path: str | None = None
    try:
        image_path = _persist_upload(image_bytes, media_type)
    except OSError:
        image_path = None

    try:
        result = await run_identify(
            image_bytes,
            media_type,
            memo,
            file_name=file.filename,
        )
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="이미지 식별 서비스 호출 중 오류가 발생했습니다.",
        ) from exc

    final_url = image_path
    try:
        if s3_enabled():
            s3_url = s3_upload_image(
                image_bytes,
                media_type,
                korean_name=getattr(result, "korean_name", None),
                native_status=getattr(result, "native_status", None),
                plant_type=getattr(result, "plant_type", None),
            )
            if s3_url:
                final_url = s3_url
    except Exception as exc:
        # S3 실패 시 로컬 image_path 로 폴백 (메인 흐름 유지, 모니터링용 로깅)
        logger.warning("[s3] upload failed, falling back to local: %s: %s", type(exc).__name__, exc)

    if final_url:
        if hasattr(result, "model_copy"):
            return result.model_copy(update={"image_path": final_url, "image_url": final_url})
        if isinstance(result, dict):
            merged = dict(result)
            merged["image_path"] = final_url
            merged["image_url"] = final_url
            return merged
        setattr(result, "image_path", final_url)
        setattr(result, "image_url", final_url)

    return result
