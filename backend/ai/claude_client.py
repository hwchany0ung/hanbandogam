from __future__ import annotations

import asyncio
import json
import os
import re
from typing import Any, Literal

from pydantic import BaseModel, Field


try:
    from backend.domain.types import IdentifyResult
except ImportError:
    try:
        from domain.types import IdentifyResult
    except ImportError:

        class IdentifyResult(BaseModel):
            korean_name: str
            scientific_name: str
            native_status: Literal["토종", "외래종", "불명확"]
            confidence: float = Field(ge=0.0, le=1.0)
            ecology_summary: str
            conservation_status: str
            morphological_clues: str


ALLOWED_NATIVE_STATUSES = {"토종", "외래종", "불명확"}
NATIVE_STATUS_ALIASES = {
    "native": "토종",
    "introduced": "외래종",
    "alien": "외래종",
    "unknown": "불명확",
    "판단불가": "불명확",
    "미상": "불명확",
}

SYSTEM_PROMPT = """
너는 한반도 생물종 식별을 돕는 생태 전문가다.
이미지에 근거해 가능한 종을 추정하고, 반드시 JSON 객체 하나만 반환한다.
native_status는 "토종", "외래종", "불명확" 중 하나만 사용한다.
confidence는 0.0 이상 1.0 이하의 숫자로 반환한다.
확신이 낮으면 native_status는 "불명확"을 사용한다.
""".strip()

USER_PROMPT = """
다음 이미지 속 생물종을 식별해줘.
반환 형식:
{
  "korean_name": "한국어 이름",
  "scientific_name": "학명",
  "native_status": "토종|외래종|불명확",
  "confidence": 0.0,
  "ecology_summary": "한국어 생태 설명",
  "conservation_status": "보전 상태",
  "morphological_clues": "이미지에서 확인한 식별 포인트"
}
""".strip()


def _extract_response_text(response: Any) -> str:
    content = getattr(response, "content", response)

    if isinstance(content, str):
        return content

    text_parts = []

    for block in content or []:
        if isinstance(block, dict):
            if block.get("type") == "text" and block.get("text"):
                text_parts.append(block["text"])
            continue

        if getattr(block, "type", None) == "text" and getattr(block, "text", None):
            text_parts.append(block.text)

    return "\n".join(text_parts)


def _parse_json_object(text: str) -> dict[str, Any]:
    cleaned_text = text.strip()
    fenced_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned_text, re.DOTALL)

    if fenced_match:
        cleaned_text = fenced_match.group(1)
    else:
        object_match = re.search(r"\{.*\}", cleaned_text, re.DOTALL)
        if object_match:
            cleaned_text = object_match.group(0)

    return json.loads(cleaned_text)


def _normalize_native_status(value: Any) -> str:
    native_status = str(value or "불명확").strip()
    native_status = NATIVE_STATUS_ALIASES.get(native_status, native_status)

    if native_status not in ALLOWED_NATIVE_STATUSES:
        return "불명확"

    return native_status


def _normalize_confidence(value: Any) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return 0.0

    if confidence > 1.0 and confidence <= 100.0:
        confidence = confidence / 100.0

    return min(max(confidence, 0.0), 1.0)


def _build_identify_result(data: dict[str, Any]) -> IdentifyResult:
    normalized_data = {
        "korean_name": str(data.get("korean_name") or "불명확"),
        "scientific_name": str(data.get("scientific_name") or "Unknown"),
        "native_status": _normalize_native_status(data.get("native_status")),
        "confidence": _normalize_confidence(data.get("confidence")),
        "ecology_summary": str(data.get("ecology_summary") or ""),
        "conservation_status": str(data.get("conservation_status") or ""),
        "morphological_clues": str(data.get("morphological_clues") or ""),
    }

    if hasattr(IdentifyResult, "model_validate"):
        return IdentifyResult.model_validate(normalized_data)

    return IdentifyResult(**normalized_data)


def _identify_species_sync(image_base64: str, media_type: str) -> IdentifyResult:
    api_key = os.getenv("ANTHROPIC_API_KEY")

    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is required for identify_species outside demo mode"
        )

    from anthropic import Anthropic

    client = Anthropic(api_key=api_key)
    response = client.messages.create(
        model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6"),
        max_tokens=1200,
        temperature=0,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_base64,
                        },
                    },
                    {"type": "text", "text": USER_PROMPT},
                ],
            }
        ],
    )

    response_text = _extract_response_text(response)
    result_data = _parse_json_object(response_text)

    return _build_identify_result(result_data)


async def identify_species(
    image_base64: str, media_type: str = "image/jpeg"
) -> IdentifyResult:
    return await asyncio.to_thread(
        _identify_species_sync,
        image_base64,
        media_type or "image/jpeg",
    )
