from contextlib import asynccontextmanager
from pathlib import Path
import os
import html as html_module

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

try:
    from backend.db.repository import init_db
    from backend.routers import collection, identify
except ImportError:
    from db.repository import init_db
    from routers import collection, identify


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="한반도감 API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://localhost:8080",
    ).split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(identify.router)
app.include_router(collection.router)

assets_dir = Path(__file__).parent / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/health")
def health():
    return {"status": "ok"}


# 한반도감 카드 공유용 OG 메타태그 페이지
SHARE_SPECIES_PHOTOS = {
    "구상나무":"/assets/photos/구상나무.jpg","미선나무":"/assets/photos/미선나무.jpg",
    "금강초롱꽃":"/assets/photos/금강초롱꽃.jpg","동강할미꽃":"/assets/photos/동강할미꽃.jpg",
    "노랑붓꽃":"/assets/photos/노랑붓꽃.jpg","개느삼":"/assets/photos/개느삼.jpg",
    "고려엉겅퀴":"/assets/photos/고려엉겅퀴.jpg","곰취":"/assets/photos/곰취.jpg",
    "노랑무늬붓꽃":"/assets/photos/노랑무늬붓꽃.jpg","금꿩의다리":"/assets/photos/금꿩의다리.jpg",
    "개족도리풀":"/assets/photos/개족도리풀.jpg","좀민들레":"/assets/photos/좀민들레.jpg",
    "가시딸기":"/assets/photos/가시딸기.jpg","나도승마":"/assets/photos/나도승마.jpg",
    "서양민들레":"/assets/photos/서양민들레.jpg","돼지풀":"/assets/photos/돼지풀.jpg",
    "단풍잎돼지풀":"/assets/photos/단풍잎돼지풀.jpg","미국쑥부쟁이":"/assets/photos/미국쑥부쟁이.jpg",
    "양미역취":"/assets/photos/양미역취.jpg","가시박":"/assets/photos/가시박.jpg",
    "따오기":"/assets/photos/따오기.jpg","수달":"/assets/photos/수달.jpg",
}

SHARE_RARITY_KR = {
    "구상나무":"특산","미선나무":"전설","금강초롱꽃":"희귀","동강할미꽃":"희귀",
    "노랑붓꽃":"희귀","개느삼":"희귀","고려엉겅퀴":"비범","곰취":"희귀",
    "노랑무늬붓꽃":"희귀","금꿩의다리":"희귀","개족도리풀":"희귀","좀민들레":"비범",
    "가시딸기":"희귀","나도승마":"희귀","서양민들레":"비범","돼지풀":"평범",
    "단풍잎돼지풀":"평범","미국쑥부쟁이":"평범","양미역취":"평범","가시박":"평범",
    "따오기":"전설","수달":"특산","한라솜다리":"전설","분홍바늘꽃":"희귀",
}

RARITY_KR_TO_PCT = {"전설":"0.3", "특산":"1.2", "희귀":"4.5", "비범":"15", "평범":"40"}


@app.get("/share/{korean_name}", response_class=HTMLResponse)
def share_page(korean_name: str):
    site = os.getenv("SITE_URL", "https://hanban-do.com")
    photo = SHARE_SPECIES_PHOTOS.get(korean_name, "/assets/photos/미선나무.jpg")
    rarity_kr = SHARE_RARITY_KR.get(korean_name, "")
    pct = RARITY_KR_TO_PCT.get(rarity_kr, "")
    photo_url = site + photo

    name_safe = html_module.escape(korean_name)
    if rarity_kr and pct:
        desc_text = f"전국민 중 상위 {pct}%만 보유한 {rarity_kr}급 카드 · 한반도감"
    elif rarity_kr:
        desc_text = f"{rarity_kr}급 한국 토종 생물 카드 · 한반도감"
    else:
        desc_text = "전국민이 함께 만드는 한국 토종 생물 도감 · 한반도감"
    desc_safe = html_module.escape(desc_text)

    html_doc = f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>한반도감 — {name_safe}</title>

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="한반도감">
  <meta property="og:title" content="한반도감 - {name_safe} 발견!">
  <meta property="og:description" content="{desc_safe}">
  <meta property="og:image" content="{photo_url}">
  <meta property="og:url" content="{site}/share/{name_safe}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="한반도감 - {name_safe} 발견!">
  <meta name="twitter:description" content="{desc_safe}">
  <meta name="twitter:image" content="{photo_url}">

  <meta http-equiv="refresh" content="0;url=/">
  <link rel="canonical" href="{site}/">
  <style>
    body {{ font-family: 'Noto Sans KR', sans-serif; text-align: center; padding: 60px 20px; background:#F4EDDC; color:#1F1A12; }}
    .badge {{ display:inline-block; padding:6px 14px; background:rgba(184,144,47,0.15); color:#B8902F; border-radius:20px; font-size:12px; margin-bottom:16px; font-weight:700; }}
    h1 {{ font-size:24px; margin:8px 0; }}
    a {{ color:#B8902F; text-decoration:underline; }}
  </style>
</head>
<body>
  <div class="badge">한반도감</div>
  <h1>{name_safe}</h1>
  <p>{desc_safe}</p>
  <p><a href="/">한반도감으로 이동 →</a></p>
  <script>setTimeout(function(){{ window.location.href = "/"; }}, 100);</script>
</body>
</html>"""
    return HTMLResponse(html_doc)


frontend_dir = Path(__file__).parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
