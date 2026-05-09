"""PAYO PIN security tests (iteration 3).

Covers: pin/status, pin/create (match/mismatch/format), pin/verify (success,
wrong attempts, lockout, locked-state response). Each test class isolates by
using a unique device_id and resetting state via direct upsert through the API
flow (delete/recreate). To keep the DB clean, we use a TEST_-prefixed device.
"""
import os
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


def _reset_device(s, device_id):
    """Reset by overwriting with a known PIN — pin/create is upsert and zeros
    failed_attempts + locked_until."""
    s.post(f"{API}/pin/create", json={"pin": "000000", "confirm_pin": "000000", "device_id": device_id}, timeout=15)


# ==== Status / Create / Verify happy path ====
class TestPinStatusAndCreate:
    DEVICE = "TEST_dev_status_create"

    def test_status_when_not_set(self, s):
        # Use a brand-new device id (won't exist)
        dev = "TEST_dev_brand_new_xyz"
        r = s.get(f"{API}/pin/status", params={"device_id": dev}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["is_set"] is False
        assert d["is_locked"] is False
        assert d["failed_attempts"] == 0
        assert d.get("time_until_unlock") is None

    def test_create_mismatch(self, s):
        r = s.post(f"{API}/pin/create", json={
            "pin": "123456", "confirm_pin": "654321", "device_id": self.DEVICE,
        }, timeout=15)
        assert r.status_code == 400, r.text
        # Indonesian error message check
        assert "tidak cocok" in r.json().get("detail", "").lower()

    def test_create_invalid_format_5_digits(self, s):
        r = s.post(f"{API}/pin/create", json={
            "pin": "12345", "confirm_pin": "12345", "device_id": self.DEVICE,
        }, timeout=15)
        assert r.status_code == 422, r.text

    def test_create_invalid_format_letters(self, s):
        r = s.post(f"{API}/pin/create", json={
            "pin": "12345a", "confirm_pin": "12345a", "device_id": self.DEVICE,
        }, timeout=15)
        assert r.status_code == 422, r.text

    def test_create_success(self, s):
        r = s.post(f"{API}/pin/create", json={
            "pin": "123456", "confirm_pin": "123456", "device_id": self.DEVICE,
        }, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "success"

    def test_status_after_create(self, s):
        r = s.get(f"{API}/pin/status", params={"device_id": self.DEVICE}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["is_set"] is True
        assert d["is_locked"] is False
        assert d["failed_attempts"] == 0


class TestPinVerify:
    DEVICE = "TEST_dev_verify"

    @pytest.fixture(autouse=True)
    def _setup(self, s):
        _reset_device(s, self.DEVICE)
        # Re-establish known PIN for each test
        s.post(f"{API}/pin/create", json={
            "pin": "246810", "confirm_pin": "246810", "device_id": self.DEVICE,
        }, timeout=15)

    def test_verify_correct(self, s):
        r = s.post(f"{API}/pin/verify", json={"pin": "246810", "device_id": self.DEVICE}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "success"
        # failed_attempts reset
        st = s.get(f"{API}/pin/status", params={"device_id": self.DEVICE}, timeout=15).json()
        assert st["failed_attempts"] == 0

    def test_verify_wrong_returns_401_with_remaining(self, s):
        r = s.post(f"{API}/pin/verify", json={"pin": "111111", "device_id": self.DEVICE}, timeout=15)
        assert r.status_code == 401, r.text
        msg = r.json().get("detail", "")
        assert "salah" in msg.lower() or "sisa" in msg.lower()
        # status reflects 1 failed attempt
        st = s.get(f"{API}/pin/status", params={"device_id": self.DEVICE}, timeout=15).json()
        assert st["failed_attempts"] == 1
        assert st["is_locked"] is False


class TestPinLockout:
    """Drives 5 wrong attempts → lockout."""
    DEVICE = "TEST_dev_lockout"

    def test_five_wrong_then_locked(self, s):
        # Reset & create
        s.post(f"{API}/pin/create", json={
            "pin": "999999", "confirm_pin": "999999", "device_id": self.DEVICE,
        }, timeout=15)
        # 4 wrong → still 401
        last_status = None
        for i in range(4):
            r = s.post(f"{API}/pin/verify", json={"pin": "000001", "device_id": self.DEVICE}, timeout=15)
            assert r.status_code == 401, f"attempt {i+1}: {r.status_code} {r.text}"
            last_status = r
        # 5th wrong → 429 lockout triggered
        r = s.post(f"{API}/pin/verify", json={"pin": "000001", "device_id": self.DEVICE}, timeout=15)
        assert r.status_code == 429, r.text
        msg = r.json().get("detail", "").lower()
        assert "terkunci" in msg or "terlalu" in msg
        # Status reflects locked
        st = s.get(f"{API}/pin/status", params={"device_id": self.DEVICE}, timeout=15).json()
        assert st["is_locked"] is True
        assert st["failed_attempts"] >= 5
        assert st.get("time_until_unlock") and st["time_until_unlock"] > 0

    def test_when_locked_correct_pin_still_429(self, s):
        # device should still be locked from prev test
        r = s.post(f"{API}/pin/verify", json={"pin": "999999", "device_id": self.DEVICE}, timeout=15)
        assert r.status_code == 429, r.text
        assert "terkunci" in r.json().get("detail", "").lower()
