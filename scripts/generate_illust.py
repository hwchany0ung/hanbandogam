"""신규 도감 종 일러스트 자동 생성 (Replicate flux-schnell, 직접 HTTP API)

기존 fetch_plant_images.py 와 동일한 프롬프트 사용.
Python 3.14 호환을 위해 replicate 라이브러리 대신 직접 HTTP API 호출.

사용: python scripts/generate_illust.py 마삭줄:토종 산딸기:토종
출력: frontend/assets/illustrations/{korean_name}.png
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).parent.parent
OUT_DIR = ROOT / "frontend" / "assets" / "illustrations"
ENV_PATH = ROOT / "poc" / ".env"

OUT_DIR.mkdir(parents=True, exist_ok=True)

# .env 파일에서 토큰 읽기
def load_token() -> str:
    if not ENV_PATH.exists():
        print(f"[ERROR] .env not found: {ENV_PATH}")
        sys.exit(1)
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("REPLICATE_API_TOKEN="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    print("[ERROR] REPLICATE_API_TOKEN not found in .env")
    sys.exit(1)


TOKEN = load_token()
API_URL = "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions"


def make_prompt(korean: str, status: str) -> str:
    if status == "토종":
        return (
            f"{korean}, Korean endemic plant species, "
            "Korean traditional minhwa folk painting style, "
            "ink and color on rice paper, elegant brush strokes, "
            "soft natural pigments, single plant centered, "
            "subtle aged paper texture background, "
            "no text, no labels, no signature"
        )
    return (
        f"{korean}, "
        "botanical illustration in vintage encyclopedia style, "
        "soft watercolor painting, korean traditional art aesthetic, "
        "single plant centered on clean off-white background, "
        "detailed leaves and flowers, soft pastel color palette, "
        "natural lighting, side view, no text, no labels, no signature"
    )


def http_request(url: str, method: str = "GET", body: dict | None = None, extra_headers: dict | None = None, timeout: int = 60) -> dict:
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def generate(korean: str, status: str) -> bool:
    out = OUT_DIR / f"{korean}.png"
    if out.exists() and out.stat().st_size > 1000:
        print(f"  {korean} -- already exists, skip")
        return True

    prompt = make_prompt(korean, status)
    print(f"  {korean} ({status}) ...", flush=True)

    body = {
        "input": {
            "prompt": prompt,
            "aspect_ratio": "1:1",
            "output_format": "png",
            "num_outputs": 1,
            "num_inference_steps": 4,
            "go_fast": True,
        }
    }

    for attempt in range(3):
        try:
            start = time.time()
            # sync wait (Prefer: wait, default 60s)
            pred = http_request(
                API_URL,
                method="POST",
                body=body,
                extra_headers={"Prefer": "wait=60"},
                timeout=90,
            )

            # 결과 polling (만약 not completed yet)
            poll_url = pred.get("urls", {}).get("get")
            while pred.get("status") not in ("succeeded", "failed", "canceled"):
                if not poll_url:
                    break
                time.sleep(2)
                pred = http_request(poll_url)

            if pred.get("status") != "succeeded":
                err = pred.get("error", "unknown")
                print(f"    FAIL status={pred.get('status')} err={err}")
                if attempt < 2:
                    time.sleep(5)
                    continue
                return False

            output = pred.get("output")
            if isinstance(output, list):
                img_url = output[0]
            else:
                img_url = output

            urllib.request.urlretrieve(img_url, str(out))
            elapsed = time.time() - start
            kb = out.stat().st_size / 1024
            print(f"    OK {elapsed:.1f}s, {kb:.0f}KB -> {out.name}")
            return True

        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 2:
                print(f"    throttled (429), wait 12s")
                time.sleep(12)
                continue
            print(f"    HTTPError {e.code}: {e.reason}")
            return False
        except Exception as e:
            print(f"    {type(e).__name__}: {e}")
            if attempt < 2:
                time.sleep(5)
                continue
            return False
    return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_illust.py 종명:토종 종명:외래종 ...")
        sys.exit(1)

    targets = []
    for arg in sys.argv[1:]:
        if ":" in arg:
            name, status = arg.split(":", 1)
        else:
            name, status = arg, "토종"
        targets.append((name.strip(), status.strip()))

    print(f"=== {len(targets)} species generation ===")
    ok = 0
    for name, status in targets:
        if generate(name, status):
            ok += 1
        time.sleep(2)

    print(f"\nDone: {ok}/{len(targets)}")
    print(f"Output: {OUT_DIR}")


if __name__ == "__main__":
    main()
