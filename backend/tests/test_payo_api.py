"""PAYO backend API tests using public preview URL.

Covers: dashboard, exchange rate, transactions (list/recent/daily-summary/date-filter),
recipients, transfer, banks, withdraw, qris, voice parse-text fallback.
"""
import os
from datetime import datetime, timezone

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
if not BASE_URL:
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
            assert k in data
        assert data["total_usdt"] > 0 and data["total_idr"] > 0
        assert data["event"] == "Milea Concert"

    def test_exchange_rate(self, s):
        r = s.get(f"{API}/exchange-rate", timeout=20)
        assert r.status_code == 200
        assert r.json()["usdt_idr"] > 0


# ==== Transactions ====
class TestTransactions:
    def test_recent_default(self, s):
        r = s.get(f"{API}/transactions/recent?limit=5", timeout=20)
        assert r.status_code == 200
        items = r.json()["items"]
        assert 0 < len(items) <= 5
        for tx in items:
            assert "_id" not in tx
            for k in ("id", "type", "direction", "amount", "currency", "timestamp"):
                assert k in tx

    def test_paginated(self, s):
        r = s.get(f"{API}/transactions?page=1&limit=5", timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("items", "page", "limit", "total", "total_pages"):
            assert k in d
        assert d["page"] == 1 and d["limit"] == 5

    def test_date_filter(self, s):
        # Use today's UTC date (seed always inserts today)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = s.get(f"{API}/transactions?date={today}&limit=50", timeout=20)
        assert r.status_code == 200, r.text
        items = r.json()["items"]
        assert len(items) > 0, "Expected today's seeded transactions"
        for tx in items:
            assert tx["timestamp"].startswith(today), f"tx outside requested date: {tx['timestamp']}"

    def test_date_filter_invalid(self, s):
        r = s.get(f"{API}/transactions?date=2026-13-99", timeout=20)
        assert r.status_code == 400

    def test_daily_summary(self, s):
        r = s.get(f"{API}/transactions/daily-summary?days=14", timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "items" in d and "rate_usdt_idr" in d
        assert isinstance(d["items"], list) and len(d["items"]) > 0
        for row in d["items"]:
            for k in ("date", "total_usdt", "total_idr", "count"):
                assert k in row, f"missing {k} in {row}"
            assert isinstance(row["count"], int) and row["count"] > 0
            assert row["total_usdt"] >= 0 and row["total_idr"] >= 0


# ==== Recipients ====
class TestRecipients:
    def test_list(self, s):
        r = s.get(f"{API}/recent-recipients", timeout=20)
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 5
        for rec in items:
            assert "name" in rec and "address" in rec


# ==== Transfer ====
class TestTransfer:
    def test_create_valid(self, s):
        payload = {"address": "TXYZTESTADDRESS00000000000000001", "amount": 12.34, "note": "TEST_transfer"}
        r = s.post(f"{API}/transfer", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        tx = r.json()
        assert tx["type"] == "TRANSFER" and tx["direction"] == "OUT"
        assert tx["amount"] == 12.34 and "_id" not in tx
        recent = s.get(f"{API}/transactions/recent?limit=20", timeout=20).json()["items"]
        assert any(t["id"] == tx["id"] for t in recent)

    def test_reject_zero(self, s):
        r = s.post(f"{API}/transfer", json={"address": "Tabc", "amount": 0}, timeout=20)
        assert r.status_code == 400

    def test_reject_negative(self, s):
        r = s.post(f"{API}/transfer", json={"address": "Tabc", "amount": -5}, timeout=20)
        assert r.status_code == 400


# ==== Banks ====
class TestBanks:
    def test_list_six_banks(self, s):
        r = s.get(f"{API}/banks", timeout=20)
        assert r.status_code == 200, r.text
        items = r.json()["items"]
        codes = {b["code"] for b in items}
        assert codes == {"BCA", "MANDIRI", "BRI", "BNI", "CIMB", "PERMATA"}, codes
        for b in items:
            assert "name" in b and len(b["name"]) > 3


# ==== Withdraw ====
class TestWithdraw:
    def test_valid_withdraw_bca(self, s):
        payload = {
            "bank_code": "BCA",
            "account_number": "1234567890",
            "account_holder": "TEST_Budi",
            "amount_idr": 500000,
            "note": "TEST_withdraw",
        }
        r = s.post(f"{API}/withdraw", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("transaction", "amount_idr", "fee_idr", "net_idr", "estimated_arrival", "rate_usdt_idr"):
            assert k in d, f"missing {k}"
        assert d["amount_idr"] == 500000
        # 0.5% of 500000 = 2500
        assert d["fee_idr"] == 2500, f"fee should be 2500, got {d['fee_idr']}"
        assert d["net_idr"] == 497500
        tx = d["transaction"]
        assert tx["type"] == "WITHDRAW" and tx["direction"] == "OUT"
        assert "_id" not in tx
        # Verify persistence
        recent = s.get(f"{API}/transactions/recent?limit=20", timeout=20).json()["items"]
        assert any(t["id"] == tx["id"] for t in recent)

    def test_below_minimum(self, s):
        r = s.post(f"{API}/withdraw", json={
            "bank_code": "BCA", "account_number": "1", "account_holder": "x", "amount_idr": 49999,
        }, timeout=20)
        assert r.status_code == 400, r.text

    def test_invalid_bank(self, s):
        r = s.post(f"{API}/withdraw", json={
            "bank_code": "FAKEBANK", "account_number": "1", "account_holder": "x", "amount_idr": 100000,
        }, timeout=20)
        assert r.status_code == 400, r.text


# ==== QRIS ====
class TestQRIS:
    def test_generate_dynamic(self, s):
        r = s.post(f"{API}/qris/generate", json={"amount": 50000, "currency": "IDR"}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "MILEA-CONCERT" in d["qris_payload"] and "AMOUNT=50000" in d["qris_payload"]

    def test_generate_zero_rejected(self, s):
        r = s.post(f"{API}/qris/generate", json={"amount": 0}, timeout=20)
        assert r.status_code == 400

    def test_static(self, s):
        r = s.get(f"{API}/qris/static", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["merchant_name"] == "Milea Concert"
        assert d["merchant_id"] == "PAYO00012345"


# ==== Voice / STT (text fallback) ====
class TestVoiceParseText:
    def test_transfer_intent(self, s):
        # Form-encoded
        r = requests.post(f"{API}/voice/parse-text", data={"text": "transfer 50 USDT ke Andi"}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["transcript"] == "transfer 50 USDT ke Andi"
        intent = d["intent"]
        assert intent["action"] == "transfer", intent
        assert float(intent["amount"]) == 50, intent
        assert intent["currency"] == "USDT", intent
        rec = (intent.get("recipient") or "").lower()
        assert "andi" in rec, intent

    def test_withdraw_intent(self, s):
        r = requests.post(
            f"{API}/voice/parse-text",
            data={"text": "tarik 500 ribu ke BCA 1234567890"},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        intent = r.json()["intent"]
        assert intent["action"] == "withdraw", intent
        assert float(intent["amount"]) == 500000, intent
        assert intent["currency"] == "IDR", intent
        assert intent["bank"] == "BCA", intent
