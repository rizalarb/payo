"""PAYO backend API tests using public preview URL."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
# Frontend env file is the source of truth
if not BASE_URL:
    # Read from frontend/.env as a last resort (testing infra convention)
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip()
                    break
    except Exception:
        pass

BASE_URL = (BASE_URL or "").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ==== Dashboard ====
class TestDashboard:
    def test_today(self, s):
        r = s.get(f"{API}/dashboard/today", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("total_usdt", "total_idr", "rate_usdt_idr", "location", "event", "date"):
            assert k in data, f"missing {k}"
        assert isinstance(data["total_usdt"], (int, float)) and data["total_usdt"] > 0
        assert isinstance(data["total_idr"], (int, float)) and data["total_idr"] > 0
        assert data["event"] == "Milea Concert"
        assert "Cengkareng" in data["location"]

    def test_exchange_rate(self, s):
        r = s.get(f"{API}/exchange-rate", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "usdt_idr" in data
        assert isinstance(data["usdt_idr"], (int, float)) and data["usdt_idr"] > 0


# ==== Transactions ====
class TestTransactions:
    def test_recent_default(self, s):
        r = s.get(f"{API}/transactions/recent?limit=5", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert len(data["items"]) <= 5
        assert len(data["items"]) > 0
        for tx in data["items"]:
            for k in ("id", "type", "direction", "amount", "currency", "timestamp"):
                assert k in tx, f"tx missing {k}"
            assert tx["direction"] in ("IN", "OUT")
            assert "_id" not in tx

    def test_paginated_page1(self, s):
        r = s.get(f"{API}/transactions?page=1&limit=5", timeout=20)
        assert r.status_code == 200
        data = r.json()
        for k in ("items", "page", "limit", "total", "total_pages"):
            assert k in data
        assert data["page"] == 1
        assert data["limit"] == 5
        assert len(data["items"]) <= 5
        assert data["total"] >= 5

    def test_paginated_page2_different(self, s):
        r1 = s.get(f"{API}/transactions?page=1&limit=5", timeout=20).json()
        r2 = s.get(f"{API}/transactions?page=2&limit=5", timeout=20).json()
        if r1["total_pages"] >= 2:
            ids1 = {t["id"] for t in r1["items"]}
            ids2 = {t["id"] for t in r2["items"]}
            assert ids1 != ids2 and ids1.isdisjoint(ids2)


# ==== Recipients ====
class TestRecipients:
    def test_list(self, s):
        r = s.get(f"{API}/recent-recipients", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert len(data["items"]) >= 5
        for rec in data["items"]:
            assert "name" in rec and "address" in rec


# ==== Transfer ====
class TestTransfer:
    def test_create_transfer_valid(self, s):
        payload = {"address": "TXYZTESTADDRESS00000000000000001", "amount": 12.34, "note": "TEST_transfer"}
        r = s.post(f"{API}/transfer", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        tx = r.json()
        assert tx["type"] == "TRANSFER"
        assert tx["direction"] == "OUT"
        assert tx["amount"] == 12.34
        assert tx["address"] == payload["address"]
        assert "_id" not in tx
        # Verify persistence: it should appear in recent
        r2 = s.get(f"{API}/transactions/recent?limit=10", timeout=20).json()
        assert any(t["id"] == tx["id"] for t in r2["items"])

    def test_reject_zero_amount(self, s):
        r = s.post(f"{API}/transfer", json={"address": "Tabc", "amount": 0}, timeout=20)
        assert r.status_code == 400

    def test_reject_negative(self, s):
        r = s.post(f"{API}/transfer", json={"address": "Tabc", "amount": -5}, timeout=20)
        assert r.status_code == 400


# ==== QRIS ====
class TestQRIS:
    def test_generate_dynamic(self, s):
        r = s.post(f"{API}/qris/generate", json={"amount": 50000, "currency": "IDR"}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "qris_payload" in data and "expires_at" in data
        assert "MILEA-CONCERT" in data["qris_payload"]
        assert "AMOUNT=50000" in data["qris_payload"]

    def test_generate_zero_rejected(self, s):
        r = s.post(f"{API}/qris/generate", json={"amount": 0}, timeout=20)
        assert r.status_code == 400

    def test_static(self, s):
        r = s.get(f"{API}/qris/static", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["merchant_name"] == "Milea Concert"
        assert data["merchant_id"] == "PAYO00012345"
        assert "qris_payload" in data and len(data["qris_payload"]) > 0
