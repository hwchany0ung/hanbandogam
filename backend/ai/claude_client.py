import asyncio
import os

import anthropic

from domain.types import IdentifyResult

_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")

_SYSTEM = """당신은 한국 생물종 식별 전문가입니다.
사진을 보고 생물을 식별하여 아래 JSON 형식으로만 응답하세요. 마크다운 없이 JSON만 출력하세요.

{
  "korean_name": "한국어 종명",
  "scientific_name": "학명",
  "native_status": "토종" | "외래종" | "불명확",
  "confidence": 0.0~1.0,
  "ecology_summary": "생태 요약 2~3문장",
  "conservation_status": "보전 현황",
  "morphological_clues": "식별 포인트"
}"""


async def identify_species(image_base64: str, media_type: str = "image/jpeg") -> IdentifyResult:
    def _call():
        resp = _client.messages.create(
            model=_MODEL,
            max_tokens=1024,
            system=_SYSTEM,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_base64}},
                    {"type": "text", "text": "이 생물을 식별해주세요."},
                ],
            }],
        )
        return resp.content[0].text

    raw = await asyncio.to_thread(_call)
    return IdentifyResult.model_validate_json(raw)
