"""신규종/시연용 위키피디아 사진 다운로드.

사용: python scripts/download_3photos.py
출력: frontend/assets/photos/{name}.jpg
"""
import json
import time
import urllib.request
import urllib.error
from pathlib import Path

OUT_DIR = Path(__file__).parent.parent / "frontend" / "assets" / "photos"
OUT_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {"User-Agent": "HanbandoGam/1.0 (hackathon project; educational use)"}

# 종 → Wikipedia 페이지 제목
TARGETS = {
    # 신규종
    "산딸기":         "Rubus_crataegifolius",
    "마삭줄":         "Trachelospermum_asiaticum",
    "매미꽃":         "Hylomecon_japonica",
    # 시연용 (DEMO_CAPTURES)
    "한라솜다리":     "Leontopodium_japonicum",   # 한국 특산 → 유사 종
    "분홍바늘꽃":     "Chamaenerion_angustifolium",
    "노랑갈퀴":       "Vicia_chosenensis",        # 한국 특산
    "가시복분자딸기": "Rubus_phoenicolasius",
}

# 폴백 URL (Wikipedia REST API 실패 시 직접 URL)
FALLBACKS = {
    "산딸기":         "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Rubus_crataegifolius1.jpg/600px-Rubus_crataegifolius1.jpg",
    "마삭줄":         "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Trachelospermum_asiaticum6.jpg/600px-Trachelospermum_asiaticum6.jpg",
    "매미꽃":         "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Hylomecon_vernalis.jpg/600px-Hylomecon_vernalis.jpg",
    "한라솜다리":     "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Leontopodium_japonicum_2.jpg/600px-Leontopodium_japonicum_2.jpg",
    "분홍바늘꽃":     "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Chamerion_angustifolium_20050714_555.jpg/600px-Chamerion_angustifolium_20050714_555.jpg",
    "노랑갈퀴":       "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Vicia_cracca-1.jpg/600px-Vicia_cracca-1.jpg",  # 갈퀴나물 유사
    "가시복분자딸기": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Rubus_phoenicolasius_W.jpg/600px-Rubus_phoenicolasius_W.jpg",
}


def fetch_url(url, timeout=10):
    req = urllib.request.Request(url, headers=HEADERS)
    return urllib.request.urlopen(req, timeout=timeout).read()


def get_wiki_image(title: str) -> str | None:
    api_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
    try:
        data = json.loads(fetch_url(api_url))
        if "originalimage" in data:
            return data["originalimage"]["source"]
        if "thumbnail" in data:
            return data["thumbnail"]["source"]
    except urllib.error.HTTPError as e:
        print(f"  API HTTP {e.code} for {title}")
    except Exception as e:
        print(f"  API err for {title}: {type(e).__name__}")
    return None


def download(korean: str, url: str) -> bool:
    dest = OUT_DIR / f"{korean}.jpg"
    if dest.exists() and dest.stat().st_size > 1000:
        print(f"  {korean}.jpg already exists, skip")
        return True
    for attempt in range(3):
        try:
            data = fetch_url(url, timeout=20)
            dest.write_bytes(data)
            kb = dest.stat().st_size / 1024
            print(f"  OK {korean}.jpg ({kb:.0f}KB)")
            return True
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 2:
                print(f"  throttled (429), wait 15s")
                time.sleep(15)
                continue
            print(f"  HTTPError {e.code}: {e.reason}")
            return False
        except Exception as e:
            print(f"  fail {korean}: {type(e).__name__}: {e}")
            return False
    return False


def main():
    print(f"=== {len(TARGETS)}종 위키피디아 사진 다운로드 ===")
    ok = 0
    for korean, wiki_title in TARGETS.items():
        print(f"[{korean}] -> {wiki_title}")
        img_url = get_wiki_image(wiki_title)
        if not img_url:
            img_url = FALLBACKS.get(korean)
            if img_url:
                print(f"  fallback URL 사용")
            else:
                print(f"  skip (no URL)")
                continue
        if download(korean, img_url):
            ok += 1
        time.sleep(1.5)
    print(f"\nDone: {ok}/{len(TARGETS)}")


if __name__ == "__main__":
    main()
