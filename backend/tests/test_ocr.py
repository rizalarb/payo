# OCR endpoint tests (cloud fallback for QVAC vision)
import os
import io
import base64
import pytest
import requests

BASE_URL = (os.environ.get('EXPO_PUBLIC_BACKEND_URL')
            or os.environ.get('EXPO_BACKEND_URL')
            or 'https://qvac-payment-suite.preview.emergentagent.com').rstrip('/')


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _png_with_text(text="TXYZ1aBcDeFg"):
    from PIL import Image, ImageDraw
    img = Image.new('RGB', (240, 80), 'white')
    ImageDraw.Draw(img).text((10, 30), text, fill='black')
    buf = io.BytesIO()
    img.save(buf, 'PNG')
    return base64.b64encode(buf.getvalue()).decode()


def _tiny_1x1_png():
    # Minimal valid 1x1 transparent PNG that OpenAI vision typically rejects
    # as "unsupported image" — server should map this to HTTP 400, not 500.
    raw = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
           b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xfa\xcf"
           b"\x00\x00\x00\x02\x00\x01\xe2!\xbc3\x00\x00\x00\x00IEND\xaeB`\x82")
    return base64.b64encode(raw).decode()


class TestOcrExtract:
    def test_empty_base64_returns_400(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/ocr/extract", json={"image_base64": ""})
        assert r.status_code == 400
        assert "image_base64" in r.text.lower()

    def test_bogus_1x1_png_returns_400_not_500(self, api_client):
        # Regression for iter-4 fix: litellm BadRequestError on a degenerate
        # image must surface as a 4xx, never a 500.
        r = api_client.post(f"{BASE_URL}/api/ocr/extract",
                            json={"image_base64": _tiny_1x1_png()}, timeout=90)
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text[:300]}"

    def test_valid_image_returns_200_with_text(self, api_client):
        b64 = _png_with_text("TXYZ1aBcDeFg")
        r = api_client.post(f"{BASE_URL}/api/ocr/extract",
                            json={"image_base64": b64}, timeout=90)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "text" in body and isinstance(body["text"], str)
