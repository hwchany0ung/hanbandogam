"""S3 이미지 업로드 — AI 분류 결과로 계층적 키 생성.

키 형식: {rarity_code}/{native|invasive|unknown}/{plant_type}/{uuid}.{ext}
예: R/native/flower/abc123.jpg
"""
from __future__ import annotations

import logging
import os
import uuid
from typing import Optional

logger = logging.getLogger(__name__)

_BUCKET = os.getenv("AWS_S3_BUCKET_NAME", "").strip()
_REGION = os.getenv("AWS_REGION", "ap-northeast-2").strip()

RARITY_MAP_BE = {
    "미선나무":"L","한라솜다리":"L","미호종개":"L","꼬치동자개":"L","따오기":"L","개느삼":"L",
    "구상나무":"E","반달가슴곰":"E","수달":"E","황새":"E","두루미":"E","금개구리":"E","가시딸기":"E",
    "금강초롱꽃":"R","맹꽁이":"R","삵":"R","참수리":"R","수리부엉이":"R","분홍바늘꽃":"R",
    "꽃사슴":"R","동강할미꽃":"R","노랑무늬붓꽃":"R","곰취":"R","노랑갈퀴":"R","가시복분자딸기":"R",
    "각시서덜취":"R","노랑붓꽃":"R","나도승마":"R","금꿩의다리":"R",
    "갈퀴아재비":"U","고려엉겅퀴":"U","왜가리":"U","너구리":"U","고라니":"U",
    "좀민들레":"U","은행나무":"U","진달래":"U","개족도리풀":"U",
    "개나리":"C","철쭉":"C","무궁화":"C","소나무":"C","참나무":"C","황소개구리":"C",
    "돼지풀":"C","단풍잎돼지풀":"C","미국쑥부쟁이":"C","양미역취":"C","가시박":"C",
}

EXT_MAP = {
    "image/jpeg": "jpg", "image/jpg": "jpg",
    "image/png": "png", "image/webp": "webp",
}


def _rarity_code(korean_name: Optional[str]) -> str:
    return RARITY_MAP_BE.get((korean_name or "").strip(), "C")


def _native_segment(native_status: Optional[str]) -> str:
    if native_status == "토종":
        return "native"
    if native_status == "외래종":
        return "invasive"
    return "unknown"


def _plant_type_segment(plant_type: Optional[str]) -> str:
    t = (plant_type or "").strip().lower()
    valid = {"tree", "flower", "herb", "vine", "fern", "shrub", "grass", "other"}
    return t if t in valid else "other"


def is_enabled() -> bool:
    return bool(_BUCKET)


def upload_image(
    image_bytes: bytes,
    media_type: str,
    korean_name: Optional[str] = None,
    native_status: Optional[str] = None,
    plant_type: Optional[str] = None,
) -> Optional[str]:
    """S3 업로드. 성공 시 public URL, 실패 시 None."""
    if not _BUCKET:
        logger.info("[s3] bucket not configured, skip")
        return None

    try:
        import boto3
        from botocore.exceptions import BotoCoreError, ClientError
    except ImportError:
        logger.warning("[s3] boto3 not installed")
        return None

    ext = EXT_MAP.get((media_type or "").lower(), "jpg")
    rarity = _rarity_code(korean_name) if korean_name else "unknown"
    native = _native_segment(native_status)
    ptype = _plant_type_segment(plant_type)
    filename = f"{uuid.uuid4().hex}.{ext}"

    if rarity == "unknown":
        key = f"unknown/{filename}"
    else:
        key = f"{rarity}/{native}/{ptype}/{filename}"

    try:
        client = boto3.client("s3", region_name=_REGION)
        client.put_object(
            Bucket=_BUCKET,
            Key=key,
            Body=image_bytes,
            ContentType=media_type or "image/jpeg",
        )
        url = f"https://{_BUCKET}.s3.{_REGION}.amazonaws.com/{key}"
        logger.info(f"[s3] uploaded {korean_name or 'unknown'} → {key}")
        return url
    except (BotoCoreError, ClientError) as e:
        logger.error(f"[s3] upload failed: {type(e).__name__}: {e}")
        return None
    except Exception as e:
        logger.error(f"[s3] unexpected: {type(e).__name__}: {e}")
        return None
