from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile


try:
    from backend.services.identify_service import IdentifyResult, run_identify
except ImportError:
    from services.identify_service import IdentifyResult, run_identify


router = APIRouter(tags=["identify"])


UPLOADS_DIR = Path(__file__).resolve().parent.parent / "assets" / "uploads"

ALLOWED_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAX_IMAGE_BYTES = 15 * 1024 * 1024
MAX_IMAGE_MB = MAX_IMAGE_BYTES // (1024 * 1024)


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
        raise HTTPException(status_code=413, detail=f"이미지 용량이 너무 큽니다 (최대 {MAX_IMAGE_MB}MB).")

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

    if image_path:
        if hasattr(result, "model_copy"):
            return result.model_copy(update={"image_path": image_path, "image_url": image_path})
        if isinstance(result, dict):
            merged = dict(result)
            merged["image_path"] = image_path
            merged["image_url"] = image_path
            return merged
        setattr(result, "image_path", image_path)
        setattr(result, "image_url", image_path)

    return result
