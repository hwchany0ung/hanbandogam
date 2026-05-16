"""학명 교차검증 — GBIF Global Species API.

Design Ref: 본선 시연 위험 해소 — 슬라이드/Q&A 에 명시된 "공공DB 학명 교차검증" 기능.
국립수목원 OpenAPI 는 인증키 발급 시간 부족 → GBIF (api.gbif.org/v1/species/match) 로 1차 검증.

캐시: 동일 학명 재호출 시 DB hit (메모리 캐시).
"""
from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Optional
from urllib.parse import quote, urlparse

logger = logging.getLogger(__name__)

GBIF_MATCH_URL = "https://api.gbif.org/v1/species/match"

# 신뢰 가능한 응답 출처 도메인 (SSRF 방지)
_ALLOWED_HOSTS = {"api.gbif.org"}

# 메모리 캐시 (학명 → 검증 결과)
_CACHE: dict[str, dict] = {}


def _is_safe_gbif_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme != "https":
            return False
        host = (parsed.netloc or "").lower().split(":")[0]
        return host in _ALLOWED_HOSTS
    except Exception:
        return False


def verify_scientific_name(scientific_name: str, timeout: float = 4.0) -> dict:
    """GBIF 학명 검증.

    Returns:
        {
            "matched": bool,           # GBIF 가 신뢰 가능한 매칭을 찾았는가
            "confidence": int,         # GBIF confidence 0~100
            "matched_name": str | None,  # GBIF canonical name
            "rank": str | None,        # SPECIES / GENUS / ...
            "kingdom": str | None,     # Plantae / Animalia
            "status": str | None,      # ACCEPTED / SYNONYM
            "source": str,             # "GBIF" / "GBIF_FALLBACK" / "ERROR"
        }
    """
    name = (scientific_name or "").strip()
    if not name or name == "N/A":
        return _empty_result("no-name")

    # 캐시 hit
    if name in _CACHE:
        return _CACHE[name]

    if not _is_safe_gbif_url(GBIF_MATCH_URL):
        return _empty_result("unsafe-url")

    url = f"{GBIF_MATCH_URL}?name={quote(name)}&strict=false&verbose=false"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as exc:
        logger.warning("[gbif] HTTP 오류: %s", exc)
        return _empty_result("http-error")
    except Exception as exc:
        logger.warning("[gbif] 예외: %s: %s", type(exc).__name__, exc)
        return _empty_result("exception")

    # GBIF 응답 매칭 종류: EXACT / FUZZY / HIGHERRANK / NONE
    match_type = (data.get("matchType") or "").upper()
    confidence = int(data.get("confidence") or 0)
    matched = match_type in ("EXACT", "FUZZY") and confidence >= 80

    result = {
        "matched": matched,
        "confidence": confidence,
        "matched_name": data.get("canonicalName") or data.get("scientificName"),
        "rank": data.get("rank"),
        "kingdom": data.get("kingdom"),
        "status": data.get("status"),
        "source": "GBIF",
    }
    _CACHE[name] = result
    logger.info(
        "[gbif] verify '%s' → matched=%s confidence=%d type=%s",
        name, matched, confidence, match_type,
    )
    return result


def _empty_result(reason: str) -> dict:
    return {
        "matched": False,
        "confidence": 0,
        "matched_name": None,
        "rank": None,
        "kingdom": None,
        "status": None,
        "source": f"GBIF_FALLBACK:{reason}",
    }
