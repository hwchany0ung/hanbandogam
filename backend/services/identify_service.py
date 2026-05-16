from __future__ import annotations

import base64
import os
from typing import Any

import httpx


try:
    from backend.ai.claude_client import IdentifyResult, identify_species
except ImportError:
    from ai.claude_client import IdentifyResult, identify_species


UPSTAGE_ENDPOINT = "https://api.upstage.ai/v1/solar"
UPSTAGE_MODEL = "solar-pro2"


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
    image_bytes: bytes, media_type: str, memo: str
) -> IdentifyResult:
    if not image_bytes:
        raise ValueError("image_bytes is required")

    image_base64 = base64.b64encode(image_bytes).decode("ascii")
    result = await identify_species(image_base64, media_type or "image/jpeg")

    _ = memo
    ecology_summary = _get_result_value(result, "ecology_summary")
    enriched_summary = await enrich_korean_text(str(ecology_summary or ""))

    if enriched_summary != ecology_summary:
        result = _copy_result_with(result, ecology_summary=enriched_summary)

    return result
