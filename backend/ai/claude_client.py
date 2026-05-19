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

📂 식물 분류 (plant_type) — 다음 8개 중 하나로 정확히 분류:
- tree: 나무 (목본, 줄기 단단)
- shrub: 관목 (작은 나무, 가지 많음)
- flower: 꽃이 주된 특징인 초본
- herb: 풀 (꽃·잎이 같이 보이는 일반 초본)
- vine: 덩굴 (감거나 기는 식물)
- fern: 양치류 (포자 식물)
- grass: 벼과·외떡잎 풀
- other: 동물 / 분류 불가 / 위 7개에 안 맞음
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
  "morphological_clues": "메인 종의 식별 포인트",
  "plant_type": "tree|shrub|flower|herb|vine|fern|grass|other"
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


_ALLOWED_PLANT_TYPES = {"tree", "shrub", "flower", "herb", "vine", "fern", "grass", "other"}


def _normalize_plant_type(value: Any) -> str | None:
    if value is None:
        return None
    s = str(value).strip().lower()
    return s if s in _ALLOWED_PLANT_TYPES else "other"


def _build_identify_result(data: dict[str, Any]) -> IdentifyResult:
    normalized_data = {
        "korean_name": str(data.get("korean_name") or "불명확"),
        "scientific_name": str(data.get("scientific_name") or "Unknown"),
        "native_status": _normalize_native_status(data.get("native_status")),
        "confidence": _normalize_confidence(data.get("confidence")),
        "ecology_summary": str(data.get("ecology_summary") or ""),
        "conservation_status": str(data.get("conservation_status") or ""),
        "morphological_clues": str(data.get("morphological_clues") or ""),
        "plant_type": _normalize_plant_type(data.get("plant_type")),
    }

    if hasattr(IdentifyResult, "model_validate"):
        return IdentifyResult.model_validate(normalized_data)

    return IdentifyResult(**normalized_data)


def _build_unidentified_result(reason: str = "") -> IdentifyResult:
    data = {
        "korean_name": "해당 없음",
        "scientific_name": "N/A",
        "native_status": "불명확",
        "confidence": 0.0,
        "ecology_summary": reason or "사진만으로 종을 안정적으로 판별하기 어렵습니다. 생물의 전체 형태와 잎, 꽃, 열매 같은 단서가 더 잘 보이게 다시 촬영해 주세요.",
        "conservation_status": "N/A",
        "morphological_clues": "식별 가능한 형태 단서가 부족합니다.",
    }

    if hasattr(IdentifyResult, "model_validate"):
        return IdentifyResult.model_validate(data)

    return IdentifyResult(**data)


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

    try:
        result_data = _parse_json_object(response_text)
        if not isinstance(result_data, dict):
            return _build_unidentified_result()
        return _build_identify_result(result_data)
    except (json.JSONDecodeError, TypeError, ValueError):
        return _build_unidentified_result()


async def identify_species(
    image_base64: str, media_type: str = "image/jpeg"
) -> IdentifyResult:
    return await asyncio.to_thread(
        _identify_species_sync,
        image_base64,
        media_type or "image/jpeg",
    )


# ─────────────────────────────────────────────────────────────────
# 도감 정보 별도 호출 (vision-hallucination-guard)
# Design Ref: kna-image-reference §C — 생태 요약 prompt 분리.
# Vision 1차에서 사진을 보고 ecology_summary 를 생성하면 학명을
# 사진 색깔에 끼워 맞춘 가짜 설명을 만들 위험이 큼 (예: 활량나물
# 학명인데 분홍 꽃이라 표기). text-only 2차 호출로 학명만 기반의
# 정직 도감 정보 출력 → 사용자가 사진과 비교해 false positive 인지.
# ─────────────────────────────────────────────────────────────────

CODEX_SYSTEM_PROMPT = """
너는 한국 생물 도감 전문 편집자다. 주어진 종에 대해 사실만 기반으로
한국어 도감 정보를 출력한다. 추측·과장·사진 추정 금지. 학명을 알 수
없으면 ecology_summary 에 "정보 부족" 으로 반환한다.

반드시 JSON 객체 하나만 반환한다:
{
  "ecology_summary": "100자 이내 한국어 생태 요약 (서식지·개화기·꽃 색·잎 모양 등 표준 도감 정보)",
  "conservation_status": "50자 이내 보전 상태 (IUCN 등급·국내 멸종위기 여부 등)"
}
""".strip()


def _fetch_codex_info_sync(korean_name: str, scientific_name: str) -> dict:
    """text-only Claude 호출로 학명 기반 도감 정보만 추출. 사진 안 봄."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {}

    from anthropic import Anthropic
    client = Anthropic(api_key=api_key)

    user_prompt = (
        f"종명(한국어): {korean_name or '미상'}\n"
        f"학명: {scientific_name or 'N/A'}\n"
        f"\n위 종의 도감 정보 JSON 을 반환하라."
    )
    try:
        response = client.messages.create(
            model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6"),
            max_tokens=400,
            temperature=0,
            system=CODEX_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": [{"type": "text", "text": user_prompt}]}],
        )
        text = _extract_response_text(response)
        data = _parse_json_object(text)
        if not isinstance(data, dict):
            return {}
        return {
            "ecology_summary": str(data.get("ecology_summary") or "").strip(),
            "conservation_status": str(data.get("conservation_status") or "").strip(),
        }
    except Exception:
        return {}


async def fetch_codex_info(korean_name: str, scientific_name: str) -> dict:
    """async wrapper."""
    return await asyncio.to_thread(_fetch_codex_info_sync, korean_name, scientific_name)


# ─────────────────────────────────────────────────────────────────
# Vision 2-stage 자기 검증 (kna-image-reference §E)
# Design Ref: KNA hit 시 backend 가 KNA 표준 이미지 fetch → Vision 에
# 사용자 사진 + 표준 이미지 둘 다 전달 → "같은 종?" 응답. different 면
# native_status="불명확" 로 강등해 false positive 차단.
# ─────────────────────────────────────────────────────────────────

COMPARE_SYSTEM_PROMPT = """
너는 한국 식물·동물 동일종 판정 전문가다. 두 이미지가 같은 종인지
판정한다. 색깔·꽃 모양·잎 구조·전체 형태를 종합적으로 본다. 불확실하면
uncertain 으로 반환한다.

반드시 JSON 객체 하나만 반환한다:
{
  "verdict": "same | different | uncertain",
  "confidence": 0.0~1.0,
  "reason": "30자 이내 핵심 근거 (예: '꽃 색이 분홍 vs 노랑으로 명백 다름')"
}
""".strip()


def _compare_two_images_sync(user_image_b64: str, user_media_type: str, reference_image_b64: str, reference_media_type: str) -> dict:
    """두 이미지가 같은 종인지 Claude Vision 으로 판정. KNA hit 시 false positive 차단."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"verdict": "uncertain", "confidence": 0.0, "reason": "no-api-key"}

    from anthropic import Anthropic
    client = Anthropic(api_key=api_key)

    try:
        response = client.messages.create(
            model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6"),
            max_tokens=300,
            temperature=0,
            system=COMPARE_SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "사진 1 (사용자 업로드):"},
                    {"type": "image", "source": {"type": "base64", "media_type": user_media_type, "data": user_image_b64}},
                    {"type": "text", "text": "사진 2 (국립수목원 표준 이미지):"},
                    {"type": "image", "source": {"type": "base64", "media_type": reference_media_type, "data": reference_image_b64}},
                    {"type": "text", "text": "위 두 사진이 같은 종인가? JSON 으로 답하라."},
                ],
            }],
        )
        text = _extract_response_text(response)
        data = _parse_json_object(text)
        if not isinstance(data, dict):
            return {"verdict": "uncertain", "confidence": 0.0, "reason": "parse-fail"}
        verdict = str(data.get("verdict") or "uncertain").lower().strip()
        if verdict not in ("same", "different", "uncertain"):
            verdict = "uncertain"
        try:
            conf = float(data.get("confidence", 0.0))
            conf = min(max(conf, 0.0), 1.0)
        except (TypeError, ValueError):
            conf = 0.0
        return {
            "verdict": verdict,
            "confidence": conf,
            "reason": str(data.get("reason") or "")[:80],
        }
    except Exception as exc:
        return {"verdict": "uncertain", "confidence": 0.0, "reason": f"exception:{type(exc).__name__}"}


async def compare_two_images(user_image_b64: str, user_media_type: str, reference_image_b64: str, reference_media_type: str) -> dict:
    """async wrapper."""
    return await asyncio.to_thread(
        _compare_two_images_sync,
        user_image_b64, user_media_type, reference_image_b64, reference_media_type,
    )
