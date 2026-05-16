from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile


try:
    from backend.services.identify_service import IdentifyResult, run_identify
except ImportError:
    from services.identify_service import IdentifyResult, run_identify


router = APIRouter(tags=["identify"])


@router.post("/api/identify", response_model=IdentifyResult)
async def identify(
    file: UploadFile = File(...),
    memo: str = Form(""),
) -> IdentifyResult:
    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(status_code=400, detail="업로드된 이미지 파일이 비어 있습니다.")

    media_type = file.content_type or "image/jpeg"

    try:
        return await run_identify(image_bytes, media_type, memo)
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
