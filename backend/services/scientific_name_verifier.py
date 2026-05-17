"""학명 교차검증 — KNA 로컬 인덱스 우선 + GBIF Global Species API 폴백.

Design Ref: kna-image-reference §2.1 — Option C Pragmatic Balance
- 1순위: data/seed/kna_plant_index.json (국립수목원 표준식물목록 사전 다운로드)
- 2순위: GBIF (api.gbif.org/v1/species/match) — 외래종·KNA 미수록 종 폴백

캐시: 동일 학명 재호출 시 메모리 hit.
"""
from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Optional
from urllib.parse import quote, urlparse

logger = logging.getLogger(__name__)

GBIF_MATCH_URL = "https://api.gbif.org/v1/species/match"

# 신뢰 가능한 응답 출처 도메인 (SSRF 방지)
_ALLOWED_HOSTS = {"api.gbif.org"}

# 메모리 캐시 (학명 → 검증 결과)
_CACHE: dict[str, dict] = {}

# KNA 로컬 인덱스 (lazy load)
# Design Ref: kna-image-reference §2.2 — JSON 인덱스, 메모리 dict O(1) lookup
_KNA_INDEX: Optional[dict[str, dict]] = None
_KNA_INDEX_PATH = (
    Path(__file__).resolve().parents[2] / "data" / "seed" / "kna_plant_index.json"
)
_KNA_IMAGE_HOST = "https://www.nature.go.kr"


def normalize_scientific_name(name: str) -> str:
    """학명을 KNA 인덱스 lookup key 로 정규화.

    Design Ref: kna-image-reference §2.2 — 단순 룰 "Genus species" 2단어만 유지.
    저자명·연도·괄호·변종/아종 접미사 등은 stripped.

    Examples:
        "Astragalus sinicus L." → "Astragalus sinicus"
        "Astragalus  sinicus" → "Astragalus sinicus"
        "Tillandsia sp." → "Tillandsia sp"
        "Pinus densiflora var. zhangwuensis" → "Pinus densiflora"
    """
    if not name:
        return ""
    cleaned = name.strip()
    # 1차: 첫 두 토큰만 keep
    parts = re.split(r"\s+", cleaned)
    if len(parts) >= 2:
        genus = parts[0]
        species = parts[1].rstrip(",.;").lower()
        return f"{genus} {species}"
    return cleaned


def _load_kna_index() -> dict[str, dict]:
    """KNA 인덱스 lazy load. 파일 없으면 빈 dict (전체 GBIF 폴백)."""
    global _KNA_INDEX
    if _KNA_INDEX is not None:
        return _KNA_INDEX
    if not _KNA_INDEX_PATH.exists():
        logger.info("[kna] index file not found: %s (fallback to GBIF only)", _KNA_INDEX_PATH)
        _KNA_INDEX = {}
        return _KNA_INDEX
    try:
        payload = json.loads(_KNA_INDEX_PATH.read_text(encoding="utf-8"))
        _KNA_INDEX = payload.get("index", {}) or {}
        logger.info("[kna] index loaded: %d species", len(_KNA_INDEX))
    except Exception as exc:  # noqa: BLE001
        logger.warning("[kna] index load failed: %s", exc)
        _KNA_INDEX = {}
    return _KNA_INDEX


def _kna_lookup(name: str) -> Optional[dict]:
    """KNA 인덱스 lookup. hit 시 dict 반환, miss 시 None.

    Design Ref: kna-image-reference §2.3 — confidence 100 고정 (정부 공식 = ground truth).
    """
    normalized = normalize_scientific_name(name)
    if not normalized:
        return None
    index = _load_kna_index()
    entry = index.get(normalized)
    if not entry:
        return None

    images = entry.get("images") or []
    primary_image_path = images[0].get("url") if images else None
    # Design Ref: kna-image-reference §4 — 응답 이미지경로가 절대 URL (http://) 이면 그대로 사용,
    # 상대경로면 HOST prefix 부착. HTTP → HTTPS upgrade (mixed content 방지).
    # 추가: ?v=hb1 cache bust query — 브라우저가 이전 ERR_CONNECTION_RESET 실패를 강하게
    # cache 하는 현상 우회. 향후 정부 사이트 응답 정책 변경 시 v 값 increment.
    if not primary_image_path:
        kna_image_url = None
    else:
        if primary_image_path.startswith(("http://", "https://")):
            base_url = primary_image_path.replace("http://", "https://", 1)
        else:
            base_url = f"{_KNA_IMAGE_HOST}{primary_image_path}"
        sep = "&" if "?" in base_url else "?"
        kna_image_url = f"{base_url}{sep}v=hb1"

    return {
        "matched": True,
        "confidence": 100,
        "matched_name": normalized,
        "rank": "SPECIES",
        "kingdom": "Plantae",
        "status": "ACCEPTED",
        "source": "KNA",
        "kna_image_url": kna_image_url,
        "korean_name_kna": entry.get("korean_name"),
    }


def _is_safe_gbif_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme != "https":
            return False
        host = (parsed.netloc or "").lower().split(":")[0]
        return host in _ALLOWED_HOSTS
    except Exception:
        return False


def _gbif_lookup(name: str, timeout: float) -> dict:
    """GBIF Global Species API lookup. 기존 로직 그대로 추출."""
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
    except Exception as exc:  # noqa: BLE001
        logger.warning("[gbif] 예외: %s: %s", type(exc).__name__, exc)
        return _empty_result("exception")

    match_type = (data.get("matchType") or "").upper()
    confidence = int(data.get("confidence") or 0)
    matched = (
        (match_type in ("EXACT", "FUZZY") and confidence >= 80)
        or (match_type == "HIGHERRANK" and confidence >= 90)
    )

    logger.info(
        "[gbif] verify '%s' → matched=%s confidence=%d type=%s",
        name, matched, confidence, match_type,
    )
    return {
        "matched": matched,
        "confidence": confidence,
        "matched_name": data.get("canonicalName") or data.get("scientificName"),
        "rank": data.get("rank"),
        "kingdom": data.get("kingdom"),
        "status": data.get("status"),
        "source": "GBIF",
    }


def verify_scientific_name(scientific_name: str, timeout: float = 4.0) -> dict:
    """학명 교차검증 — KNA 우선 hit → 매칭. miss → GBIF 폴백.

    Plan SC: SC-2 정확도 38%+, SC-3 KNA 매칭 ≥80%, SC-4 GBIF 폴백 ≥70%, SC-6 응답 +2초 이내.

    Returns:
        {
            "matched": bool,
            "confidence": int,             # KNA hit = 100, GBIF = 응답 confidence
            "matched_name": str | None,    # canonical name
            "rank": str | None,            # "SPECIES" / "GENUS" / ...
            "kingdom": str | None,         # "Plantae" / "Animalia"
            "status": str | None,          # "ACCEPTED" / "SYNONYM"
            "source": str,                 # "KNA" / "GBIF" / "GBIF_FALLBACK:reason"
            "kna_image_url": str | None,   # KNA hit 시 정부 표준 이미지, 아니면 None
            "korean_name_kna": str | None, # KNA hit 시 국명, 아니면 None
        }
    """
    name = (scientific_name or "").strip()
    if not name or name == "N/A":
        return _empty_result("no-name")

    if name in _CACHE:
        return _CACHE[name]

    # 1순위: KNA 로컬 인덱스
    # Plan SC: SC-3 KNA 매칭률 — 국내 자생식물은 여기서 hit
    kna_hit = _kna_lookup(name)
    if kna_hit:
        _CACHE[name] = kna_hit
        logger.info("[kna] verify '%s' → matched=True (local index)", normalize_scientific_name(name))
        return kna_hit

    # 2순위: GBIF 폴백
    # Plan SC: SC-4 외래종·KNA 미수록 종 보존
    gbif_result = _gbif_lookup(name, timeout)
    gbif_result["kna_image_url"] = None
    gbif_result["korean_name_kna"] = None
    _CACHE[name] = gbif_result
    return gbif_result


def _empty_result(reason: str) -> dict:
    return {
        "matched": False,
        "confidence": 0,
        "matched_name": None,
        "rank": None,
        "kingdom": None,
        "status": None,
        "source": f"GBIF_FALLBACK:{reason}",
        "kna_image_url": None,
        "korean_name_kna": None,
    }
