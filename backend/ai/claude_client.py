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
            image_path: str | None = None


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

⚠️ 다음 경우에는 반드시 korean_name="해당 없음", scientific_name="N/A", native_status="불명확", confidence=0.0 으로 반환한다:
- 모니터·노트북·스마트폰 화면을 촬영한 사진 (베젤·픽셀 무아레·반사광·UI 요소가 보임)
- 인쇄물·책·잡지·포스터·도감 등 2차 매체를 촬영한 사진
- 그림·일러스트·만화·CG·합성 이미지 (실물이 아닌 것)
- 식별 가능한 생물이 전혀 없는 사진 (풍경·사물·텍스트만 있음)
- 흐림·어둠·과노출 등으로 종 식별이 불가능한 사진

🔍 한 사진에 여러 식물/동물이 함께 있는 경우:
- 가장 크고 중심부에 있는 1종을 메인으로 식별한다.
- ecology_summary 끝에 "(참고로 사진에는 ◯◯◯로 보이는 다른 종도 함께 포착되었습니다.)" 형태로 다른 종을 1~2개 언급한다.
- morphological_clues는 메인 종의 특징만 기술한다.

확신이 낮으면 (confidence < 0.5) native_status는 "불명확"을 사용한다.
""".strip()

USER_PROMPT = """
다음 이미지 속 한반도 생물종을 식별해줘.

먼저 다음을 확인:
1. 이 사진이 실제 자연 생물을 직접 촬영한 것인가? (화면 재촬영·인쇄물·일러스트면 "해당 없음" 반환)
2. 식별 가능한 생물이 1개인가, 여러 개인가?

반환 형식 (JSON 객체 하나만):
{
  "korean_name": "한국어 이름 또는 '해당 없음'",
  "scientific_name": "학명 또는 'N/A'",
  "native_status": "토종|외래종|불명확",
  "confidence": 0.0,
  "ecology_summary": "한국어 생태 설명 (여러 종일 경우 끝에 다른 종 언급)",
  "conservation_status": "보전 상태 또는 'N/A'",
  "morphological_clues": "메인 종의 식별 포인트"
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
