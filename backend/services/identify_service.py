from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Any

import httpx


try:
    from backend.ai.claude_client import IdentifyResult, identify_species
except ImportError:
    from ai.claude_client import IdentifyResult, identify_species

# 학명 교차검증 (GBIF) — 본선 슬라이드/Q&A 명시 기능
try:
    from backend.services.scientific_name_verifier import verify_scientific_name
except ImportError:
    from services.scientific_name_verifier import verify_scientific_name  # type: ignore


UPSTAGE_ENDPOINT = "https://api.upstage.ai/v1/solar"
UPSTAGE_MODEL = "solar-pro2"
DEMO_MODE_VALUES = {"1", "true", "TRUE"}
DEMO_CACHE_DIR = Path(__file__).resolve().parents[1] / "demo_cache"


def _get_result_value(result: IdentifyResult, key: str) -> Any:
    if isinstance(result, dict):
        return result.get(key)

    return getattr(result, key, None)


def _copy_result_with(result: IdentifyResult, **updates: Any) -> IdentifyResult:
    if hasattr(result, "model_copy"):
        return result.model_copy(update=updates)

    if isinstance(result, dict):
        copied_result = result.copy()
        copied_result.update(updates)
        return copied_result

    for key, value in updates.items():
        setattr(result, key, value)

    return result


def is_demo_mode() -> bool:
    return os.getenv("APP_DEMO_MODE", "").strip() in DEMO_MODE_VALUES


def _validate_identify_result(data: dict[str, Any]) -> IdentifyResult:
    if hasattr(IdentifyResult, "model_validate"):
        return IdentifyResult.model_validate(data)

    return IdentifyResult(**data)


def _demo_cache_files() -> list[Path]:
    if not DEMO_CACHE_DIR.exists():
        raise RuntimeError(f"demo_cache directory not found: {DEMO_CACHE_DIR}")

    json_files = sorted(DEMO_CACHE_DIR.glob("*.json"), key=lambda path: path.name)

    if not json_files:
        raise RuntimeError(f"demo_cache JSON files not found: {DEMO_CACHE_DIR}")

    return json_files


def _normalize_hint_text(value: str | None) -> str:
    if not value:
        return ""

    return Path(value).stem.replace(" ", "").lower()


def _pick_demo_cache_file(
    file_name: str | None,
    memo: str,
    request_hint: str | None,
) -> Path:
    json_files = _demo_cache_files()
    hint_texts = [
        _normalize_hint_text(file_name),
        _normalize_hint_text(memo),
        _normalize_hint_text(request_hint),
    ]

    for json_file in json_files:
        cache_name = _normalize_hint_text(json_file.stem)

        if any(cache_name and cache_name in hint_text for hint_text in hint_texts):
            return json_file

    return json_files[0]


def load_demo_identify_result(
    file_name: str | None = None,
    memo: str = "",
    request_hint: str | None = None,
) -> IdentifyResult:
    cache_file = _pick_demo_cache_file(file_name, memo, request_hint)

    try:
        data = json.loads(cache_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid demo_cache JSON: {cache_file.name}") from exc

    return _validate_identify_result(data)


async def enrich_korean_text(ecology_summary: str) -> str:
    if not ecology_summary:
        return ecology_summary

    api_key = os.getenv("UPSTAGE_API_KEY")

    if not api_key:
        return ecology_summary

    payload = {
        "model": os.getenv("UPSTAGE_MODEL", UPSTAGE_MODEL),
        "messages": [
            {
                "role": "system",
                "content": "한국어 생태 설명을 자연스럽고 간결하게 다듬어라. 사실을 추가하지 말고 원문 의미를 유지해라.",
            },
            {"role": "user", "content": ecology_summary},
        ],
        "temperature": 0.2,
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(
                os.getenv("UPSTAGE_ENDPOINT", UPSTAGE_ENDPOINT),
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
    except Exception:
        return ecology_summary

    try:
        enriched_text = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError, AttributeError):
        return ecology_summary

    return enriched_text or ecology_summary


async def run_identify(
    image_bytes: bytes,
    media_type: str,
    memo: str,
    file_name: str | None = None,
    request_hint: str | None = None,
) -> IdentifyResult:
    if not image_bytes:
        raise ValueError("image_bytes is required")

    if is_demo_mode():
        return load_demo_identify_result(
            file_name=file_name,
            memo=memo,
            request_hint=request_hint,
        )

    image_base64 = base64.b64encode(image_bytes).decode("ascii")
    result = await identify_species(image_base64, media_type or "image/jpeg")

    _ = memo

    # 학명 교차검증 — KNA 로컬 인덱스 우선 + GBIF 폴백
    # Design Ref: kna-image-reference §2.1 — Option C Pragmatic Balance
    # Plan SC: SC-2 정확도 향상, SC-3 KNA 매칭 ≥80%, SC-4 GBIF 폴백 ≥70%
    scientific_name = _get_result_value(result, "scientific_name")
    if scientific_name and scientific_name != "N/A":
        try:
            verification = verify_scientific_name(str(scientific_name))
            result = _copy_result_with(
                result,
                verification_source=verification.get("source"),
                verification_matched=verification.get("matched"),
                verification_confidence=verification.get("confidence"),
                verification_matched_name=verification.get("matched_name"),
                # Plan SC: SC-1 카드 표준 이미지 표시용 (frontend M6 가 사용)
                kna_image_url=verification.get("kna_image_url"),
            )
        except Exception as exc:  # noqa: BLE001
            import logging
            logging.getLogger(__name__).warning("[verify] 예외: %s", exc)

    ecology_summary = _get_result_value(result, "ecology_summary")
    enriched_summary = await enrich_korean_text(str(ecology_summary or ""))

    if enriched_summary != ecology_summary:
        result = _copy_result_with(result, ecology_summary=enriched_summary)

    return result
