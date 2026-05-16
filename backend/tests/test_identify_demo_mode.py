from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers.identify import router
from backend.services import identify_service


def test_demo_mode_returns_cache_without_claude(monkeypatch):
    monkeypatch.setenv("APP_DEMO_MODE", "1")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    async def fail_identify_species(*args, **kwargs):
        raise AssertionError("Claude should not be called in demo mode")

    monkeypatch.setattr(identify_service, "identify_species", fail_identify_species)

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    response = client.post(
        "/api/identify",
        files={"file": ("황소개구리.jpg", b"image-bytes", "image/jpeg")},
        data={"memo": ""},
    )

    assert response.status_code == 200
    assert response.json()["korean_name"] == "황소개구리"
    assert response.json()["native_status"] == "외래종"


def test_demo_mode_uses_deterministic_fallback(monkeypatch):
    monkeypatch.setenv("APP_DEMO_MODE", "TRUE")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    response = client.post(
        "/api/identify",
        files={"file": ("unknown.jpg", b"image-bytes", "image/jpeg")},
        data={"memo": "힌트 없음"},
    )

    assert response.status_code == 200
    assert response.json()["korean_name"] == "구상나무"
