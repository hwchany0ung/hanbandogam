import base64
import os

from ai.claude_client import identify_species
from domain.types import IdentifyResult

_UPSTAGE_KEY = os.getenv("UPSTAGE_API_KEY", "")


async def run_identify(image_bytes: bytes, media_type: str, memo: str) -> IdentifyResult:
    image_b64 = base64.b64encode(image_bytes).decode()
    result = await identify_species(image_b64, media_type)

    if _UPSTAGE_KEY:
        enriched = await enrich_korean_text(result.ecology_summary)
        result = result.model_copy(update={"ecology_summary": enriched})

    return result


async def enrich_korean_text(ecology_summary: str) -> str:
    """Upstage solar-pro2 후처리. 실패 시 원문 반환."""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.upstage.ai/v1/solar/chat/completions",
                headers={"Authorization": f"Bearer {_UPSTAGE_KEY}"},
                json={
                    "model": "solar-pro2",
                    "messages": [
                        {"role": "system", "content": "아래 생태 설명을 누구나 이해할 수 있는 자연스러운 한국어로 다듬어주세요. 내용은 유지하고 결과만 출력하세요."},
                        {"role": "user", "content": ecology_summary},
                    ],
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
    except Exception:
        return ecology_summary
