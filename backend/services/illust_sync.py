"""신규 종 일러스트 동기 생성 + S3 캐시.

Design Ref: §5.1 — colostart UX, Replicate flux-schnell 직접 호출.
Plan SC: SC-3 (응답 ≤15초), SC-5 (퀄리티 동등 via make_prompt 재사용).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

# SSRF 방지: Replicate output URL 도메인 화이트리스트
_REPLICATE_ALLOWED_DOMAINS = {
    "replicate.delivery",
    "pbxt.replicate.delivery",
}


def _is_safe_replicate_url(url: str) -> bool:
    """Replicate output 으로 받은 image URL 이 신뢰 가능한 도메인인지 검증."""
    try:
        parsed = urlparse(url)
        if parsed.scheme != "https":
            return False
        host = (parsed.netloc or "").lower().split(":")[0]
        return any(host == d or host.endswith("." + d) for d in _REPLICATE_ALLOWED_DOMAINS)
    except Exception:
        return False

logger = logging.getLogger(__name__)

# scripts/ 디렉터리를 sys.path 에 추가하여 make_prompt 재사용
_ROOT = Path(__file__).resolve().parent.parent.parent
_SCRIPTS = _ROOT / "scripts"
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

try:
    from generate_illust import make_prompt  # 퀄리티 동등 보장
except ImportError as exc:
    logger.warning("[illust_sync] scripts.generate_illust import 실패: %s", exc)
    make_prompt = None  # type: ignore

try:
    from backend.services.s3_uploader import (
        upload_illustration_bytes,
        illustration_exists,
    )
except ImportError:
    from services.s3_uploader import (  # type: ignore
        upload_illustration_bytes,
        illustration_exists,
    )

REPLICATE_TOKEN = os.getenv("REPLICATE_API_TOKEN", "").strip()
REPLICATE_API_URL = "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions"


def _replicate_request(url: str, method: str = "GET", body: Optional[dict] = None, timeout: int = 30) -> dict:
    """Replicate HTTP API 호출."""
    headers = {
        "Authorization": f"Bearer {REPLICATE_TOKEN}",
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _generate_png_sync(korean_name: str, native_status: str, timeout: float = 12.0) -> Optional[bytes]:
    """동기 Replicate 호출. PNG bytes 반환. 실패 시 None."""
    if not REPLICATE_TOKEN:
        logger.info("[illust_sync] REPLICATE_API_TOKEN 미설정, skip")
        return None
    if make_prompt is None:
        logger.warning("[illust_sync] make_prompt 사용 불가")
        return None

    prompt = make_prompt(korean_name, native_status)

    try:
        # Create prediction
        pred = _replicate_request(
            REPLICATE_API_URL,
            method="POST",
            body={"input": {"prompt": prompt, "num_outputs": 1, "output_format": "png"}},
            timeout=int(timeout),
        )
        pred_id = pred.get("id")
        if not pred_id:
            logger.warning("[illust_sync] prediction id 없음: %s", pred)
            return None

        # Poll until succeeded (max timeout)
        import time
        deadline = time.time() + timeout
        get_url = f"https://api.replicate.com/v1/predictions/{pred_id}"
        while time.time() < deadline:
            status = _replicate_request(get_url, timeout=int(timeout))
            state = status.get("status")
            if state == "succeeded":
                output = status.get("output")
                if isinstance(output, list) and output:
                    image_url = output[0]
                elif isinstance(output, str):
                    image_url = output
                else:
                    logger.warning("[illust_sync] output 형식 이상: %s", output)
                    return None

                # SSRF 방지: Replicate CDN 도메인만 허용
                if not _is_safe_replicate_url(image_url):
                    logger.warning("[illust_sync] 신뢰할 수 없는 URL 도메인 차단: %s", image_url)
                    return None
                # Download PNG
                with urllib.request.urlopen(image_url, timeout=int(timeout)) as resp:
                    return resp.read()

            if state in ("failed", "canceled"):
                logger.warning("[illust_sync] prediction %s: %s", state, status.get("error"))
                return None

            time.sleep(0.5)

        logger.warning("[illust_sync] timeout %s초", timeout)
        return None
    except (urllib.error.URLError, urllib.error.HTTPError) as exc:
        logger.error("[illust_sync] HTTP 오류: %s", exc)
        return None
    except Exception as exc:
        logger.error("[illust_sync] 예외: %s: %s", type(exc).__name__, exc)
        return None


async def get_or_create_illustration(
    korean_name: str,
    native_status: str,
    timeout: float = 12.0,
) -> Optional[str]:
    """캐시 hit (S3 HeadObject) → URL 즉시 반환.
    miss → Replicate 동기 호출 → S3 PutObject → URL.
    실패 시 None (frontend fallback)."""
    if not korean_name or korean_name == "해당 없음":
        return None

    # Cache check
    cached = illustration_exists(korean_name)
    if cached:
        logger.info("[illust_sync] cache hit: %s", korean_name)
        return cached

    logger.info("[illust_sync] cache miss → Replicate 호출: %s", korean_name)

    # 동기 호출을 별도 스레드에서 실행 (async event loop block 회피)
    loop = asyncio.get_event_loop()
    png_bytes = await loop.run_in_executor(
        None,
        _generate_png_sync,
        korean_name,
        native_status,
        timeout,
    )

    if not png_bytes:
        return None

    # S3 업로드
    return upload_illustration_bytes(korean_name, png_bytes)
