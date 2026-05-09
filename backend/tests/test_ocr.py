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


class TestOcrExtract:
    def test_empty_base64_returns_400(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/ocr/extract", json={"image_base64": ""})
        assert r.status_code == 400
        assert "image_base64" in r.text.lower()

    def test_valid_image_returns_200_with_text(self, api_client):
        b64 = _png_with_text("TXYZ1aBcDeFg")
        r = api_client.post(f"{BASE_URL}/api/ocr/extract",
                            json={"image_base64": b64}, timeout=90)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "text" in body and isinstance(body["text"], str)
