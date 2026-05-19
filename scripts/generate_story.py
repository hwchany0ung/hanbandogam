"""신규 종의 흥미로운 한 줄 이야기 자동 생성 (Claude API).

사용: python scripts/generate_story.py 마삭줄
출력: frontend/data/stories.json 업데이트 (key=종명, value=이야기)
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent.parent
STORIES_FILE = ROOT / "frontend" / "data" / "stories.json"
ENV_PATH = ROOT / "poc" / ".env"

CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL = "claude-haiku-4-5-20251001"


def load_token() -> str:
    env_token = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if env_token:
        return env_token
    if not ENV_PATH.exists():
        print(f"[ERROR] ANTHROPIC_API_KEY not in env, .env not found: {ENV_PATH}")
        sys.exit(1)
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("ANTHROPIC_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    print("[ERROR] ANTHROPIC_API_KEY not found")
    sys.exit(1)


def load_stories() -> dict:
    if STORIES_FILE.exists():
        return json.loads(STORIES_FILE.read_text(encoding="utf-8"))
    return {}


def save_stories(data: dict):
    STORIES_FILE.parent.mkdir(parents=True, exist_ok=True)
    STORIES_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


def build_prompt(korean_name: str) -> str:
    return (
        f"한국 도감 카드에 들어갈 '{korean_name}'에 대한 짧고 흥미로운 한국어 이야기를 작성해주세요.\n\n"
        "요구사항:\n"
        "- 정확히 2-3개 문장\n"
        "- 총 100~250자 사이\n"
        "- 흥미로운 사실, 놀라운 비밀, 의외의 정보 중심\n"
        "- 도감 사용자가 '오 그렇구나!' 할 만한 hook\n"
        "- 학술적이지 않고 친근한 톤\n"
        "- 마지막 문장은 인상적으로 마무리\n\n"
        "이야기 본문만 출력하세요 (제목·따옴표·접두어 없이):"
    )


def generate(korean_name: str, api_key: str) -> str | None:
    body = json.dumps({
        "model": CLAUDE_MODEL,
        "max_tokens": 400,
        "messages": [{
            "role": "user",
            "content": build_prompt(korean_name),
        }]
    }).encode("utf-8")

    req = urllib.request.Request(
        CLAUDE_API_URL,
        data=body,
        method="POST",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            text = data["content"][0]["text"].strip()
            # 따옴표 제거 (Claude가 가끔 감쌈)
            if text.startswith('"') and text.endswith('"'):
                text = text[1:-1]
            return text
    except urllib.error.HTTPError as e:
        print(f"  HTTPError {e.code}: {e.read().decode('utf-8', errors='replace')[:200]}")
    except Exception as e:
        print(f"  {type(e).__name__}: {e}")
    return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_story.py <korean_name>")
        sys.exit(1)

    korean_name = sys.argv[1].strip()
    if not korean_name:
        print("Empty name")
        sys.exit(1)

    api_key = load_token()
    stories = load_stories()

    if korean_name in stories and len(stories[korean_name]) > 30:
        print(f"  {korean_name} already has story, skip")
        return

    print(f"  Generating story for: {korean_name}")
    story = generate(korean_name, api_key)
    if not story:
        print(f"  FAILED")
        sys.exit(1)

    print(f"  OK ({len(story)} chars): {story[:80]}...")
    stories[korean_name] = story
    save_stories(stories)
    print(f"  Saved to {STORIES_FILE}")


if __name__ == "__main__":
    main()
