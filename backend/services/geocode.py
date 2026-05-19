import urllib.request
import urllib.parse
import json


_NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
_HEADERS = {"User-Agent": "한반도감/1.0"}
_TIMEOUT = 3


def reverse_geocode(lat: float, lng: float) -> str | None:
    """GPS 좌표를 읍/면/동 텍스트로 변환. 실패 시 None 반환."""
    params = urllib.parse.urlencode({
        "lat": lat,
        "lon": lng,
        "format": "json",
        "accept-language": "ko",
        "zoom": 14,
    })
    url = f"{_NOMINATIM_URL}?{params}"
    req = urllib.request.Request(url, headers=_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            data = json.loads(resp.read().decode())
        addr = data.get("address", {})
        district = (
            addr.get("village")
            or addr.get("suburb")
            or addr.get("town")
            or addr.get("city_district")
            or addr.get("county")
        )
        return district or None
    except Exception:
        return None
