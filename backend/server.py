import bcrypt
from fastapi import FastAPI, APIRouter, HTTPException, Query, UploadFile, File, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import json
import logging
import uuid
import requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============= Models =============
class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # USDT, USDC, QRIS_STATIS, QRIS_DINAMIS, TRANSFER, WITHDRAW
    direction: str  # IN, OUT
    amount: float
    currency: str  # USDT, USDC, IDR
    counterparty: Optional[str] = None
    address: Optional[str] = None
    note: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TransferRequest(BaseModel):
    address: str
    amount: float
    note: Optional[str] = None


class WithdrawRequest(BaseModel):
    bank_code: str
    account_number: str
    account_holder: str
    amount_idr: float
    note: Optional[str] = None


class QRISGenerateRequest(BaseModel):
    amount: float
    currency: str = "IDR"
    note: Optional[str] = None


# ============= Helpers =============
def serialize_tx(tx: dict) -> dict:
    out = {k: v for k, v in tx.items() if k != "_id"}
    if isinstance(out.get("timestamp"), datetime):
        out["timestamp"] = out["timestamp"].isoformat()
    return out


_rate_cache = {"rate": None, "ts": None}


def get_usdt_idr_rate() -> float:
    now = datetime.now(timezone.utc)
    if _rate_cache["rate"] and _rate_cache["ts"] and (now - _rate_cache["ts"]).seconds < 300:
        return _rate_cache["rate"]
    try:
        r = requests.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": "tether", "vs_currencies": "idr"},
            timeout=8,
        )
        rate = float(r.json()["tether"]["idr"])
    except Exception as e:
        logging.warning(f"CoinGecko fetch failed: {e}; using fallback 16250")
        rate = 16250.0
    _rate_cache["rate"] = rate
    _rate_cache["ts"] = now
    return rate


SAMPLE_RECIPIENTS = [
    {"name": "Andi Wijaya", "address": "TXYZ1aBcDeFg2hIjKlMnOpQ3rStUvWxY"},
    {"name": "Siti Rahma", "address": "TLmNoPq4RsTuVwXy5zAbCdEfGhIjKlMn"},
    {"name": "Budi Santoso", "address": "TQrStUvW6xYzAbCdEfGhIjKlMnOpQrSt"},
    {"name": "Dewi Lestari", "address": "TUvWxYzAb7cDeFgHiJkLmNoPqRsTuVwX"},
    {"name": "Rio Pratama", "address": "TYzAbCdEf8gHiJkLmNoPqRsTuVwXyZaB"},
]

BANKS = [
    {"code": "BCA", "name": "Bank Central Asia"},
    {"code": "MANDIRI", "name": "Bank Mandiri"},
    {"code": "BRI", "name": "Bank Rakyat Indonesia"},
    {"code": "BNI", "name": "Bank Negara Indonesia"},
    {"code": "CIMB", "name": "CIMB Niaga"},
    {"code": "PERMATA", "name": "Bank Permata"},
]


async def ensure_seed_data():
    count = await db.transactions.count_documents({})
    if count > 0:
        return
    today_start = datetime.now(timezone.utc).replace(hour=2, minute=0, second=0, microsecond=0)
    seed_today = [
        {"type": "USDT", "direction": "IN", "amount": 4500.00, "currency": "USDT", "counterparty": "Andi Wijaya", "address": SAMPLE_RECIPIENTS[0]["address"], "note": "Tiket Konser Milea", "timestamp": today_start + timedelta(hours=1)},
        {"type": "USDC", "direction": "IN", "amount": 45.05, "currency": "USDC", "counterparty": "Siti Rahma", "address": SAMPLE_RECIPIENTS[1]["address"], "note": "Pembayaran F&B", "timestamp": today_start + timedelta(hours=2, minutes=16)},
        {"type": "QRIS_STATIS", "direction": "IN", "amount": 145000, "currency": "IDR", "counterparty": "QRIS Statis", "note": "Pembayaran Merchandise", "timestamp": today_start + timedelta(hours=2, minutes=30)},
        {"type": "QRIS_DINAMIS", "direction": "IN", "amount": 250000, "currency": "IDR", "counterparty": "QRIS Dinamis", "note": "Tiket VIP", "timestamp": today_start + timedelta(hours=3)},
        {"type": "TRANSFER", "direction": "OUT", "amount": 150.00, "currency": "USDT", "counterparty": "Budi Santoso", "address": SAMPLE_RECIPIENTS[2]["address"], "note": "Refund tiket", "timestamp": today_start + timedelta(hours=4)},
    ]
    older = []
    for i in range(15):
        older.append({
            "type": ["USDT", "USDC", "QRIS_STATIS", "QRIS_DINAMIS", "TRANSFER"][i % 5],
            "direction": "OUT" if i % 4 == 0 else "IN",
            "amount": [120.5, 89.2, 320000, 175000, 50.0][i % 5],
            "currency": ["USDT", "USDC", "IDR", "IDR", "USDT"][i % 5],
            "counterparty": SAMPLE_RECIPIENTS[i % 5]["name"],
            "address": SAMPLE_RECIPIENTS[i % 5]["address"],
            "note": f"Riwayat #{i+1}",
            "timestamp": today_start - timedelta(days=i + 1, hours=i % 6),
        })
    docs = [Transaction(**s).model_dump() for s in seed_today + older]
    await db.transactions.insert_many(docs)
    logging.info(f"Seeded {len(docs)} transactions")


# ============= Routes =============
@api_router.get("/")
async def root():
    return {"message": "PAYO API"}


@api_router.get("/dashboard/today")
async def dashboard_today():
    await ensure_seed_data()
    rate = get_usdt_idr_rate()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    cursor = db.transactions.find({"timestamp": {"$gte": today_start}, "direction": "IN"})
    total_usdt = 0.0
    count = 0
    async for tx in cursor:
        amt = float(tx.get("amount", 0))
        cur = tx.get("currency", "USDT")
        if cur == "IDR":
            total_usdt += amt / rate
        elif cur in ("USDT", "USDC"):
            total_usdt += amt
        count += 1
    if total_usdt == 0:
        total_usdt = 9020.21
        count = 5
    return {
        "total_usdt": round(total_usdt, 2),
        "total_idr": round(total_usdt * rate, 2),
        "rate_usdt_idr": rate,
        "transaction_count": count,
        "date": datetime.now(timezone.utc).isoformat(),
        "location": "Cengkareng, Jakarta Barat",
        "event": "Milea Concert",
    }


@api_router.get("/exchange-rate")
async def exchange_rate():
    return {"usdt_idr": get_usdt_idr_rate(), "fetched_at": datetime.now(timezone.utc).isoformat()}


@api_router.get("/transactions/recent")
async def recent_transactions(limit: int = Query(5, ge=1, le=50)):
    await ensure_seed_data()
    cursor = db.transactions.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit)
    items = [serialize_tx(tx) async for tx in cursor]
    return {"items": items, "count": len(items)}


@api_router.get("/transactions")
async def list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    date: Optional[str] = Query(None, description="YYYY-MM-DD filter"),
):
    await ensure_seed_data()
    query: dict = {}
    if date:
        try:
            d = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            query["timestamp"] = {"$gte": d, "$lt": d + timedelta(days=1)}
        except ValueError:
            raise HTTPException(400, "Invalid date format, expected YYYY-MM-DD")
    total = await db.transactions.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.transactions.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit)
    items = [serialize_tx(tx) async for tx in cursor]
    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": max(1, (total + limit - 1) // limit),
    }


@api_router.get("/transactions/daily-summary")
async def daily_summary(days: int = Query(14, ge=1, le=90)):
    """Return per-day aggregation of IN transactions for the last N days."""
    await ensure_seed_data()
    rate = get_usdt_idr_rate()
    since = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days - 1)
    pipeline = [
        {"$match": {"timestamp": {"$gte": since}, "direction": "IN"}},
        {"$project": {
            "_id": 0,
            "amount": 1, "currency": 1, "timestamp": 1,
            "amount_usdt": {
                "$cond": [
                    {"$eq": ["$currency", "IDR"]},
                    {"$divide": ["$amount", rate]},
                    "$amount",
                ]
            },
            "day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
        }},
        {"$group": {
            "_id": "$day",
            "total_usdt": {"$sum": "$amount_usdt"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": -1}},
    ]
    out = []
    async for row in db.transactions.aggregate(pipeline):
        out.append({
            "date": row["_id"],
            "total_usdt": round(row["total_usdt"], 2),
            "total_idr": round(row["total_usdt"] * rate, 2),
            "count": row["count"],
        })
    return {"items": out, "rate_usdt_idr": rate}


@api_router.get("/recent-recipients")
async def recent_recipients():
    await ensure_seed_data()
    cursor = db.transactions.find(
        {"direction": "OUT", "address": {"$ne": None}}, {"_id": 0}
    ).sort("timestamp", -1).limit(20)
    seen = {}
    async for tx in cursor:
        addr = tx.get("address")
        if addr and addr not in seen:
            seen[addr] = {
                "name": tx.get("counterparty", "Unknown"),
                "address": addr,
                "last_amount": tx.get("amount"),
                "last_currency": tx.get("currency"),
                "last_timestamp": tx["timestamp"].isoformat() if isinstance(tx.get("timestamp"), datetime) else tx.get("timestamp"),
            }
    for r in SAMPLE_RECIPIENTS:
        if r["address"] not in seen:
            seen[r["address"]] = {"name": r["name"], "address": r["address"]}
    return {"items": list(seen.values())[:10]}


@api_router.post("/transfer")
async def create_transfer(payload: TransferRequest):
    if payload.amount <= 0:
        raise HTTPException(400, "Amount must be > 0")
    counterparty = payload.address[:8] + "..."
    # If address belongs to known recipient use their name
    for r in SAMPLE_RECIPIENTS:
        if r["address"] == payload.address:
            counterparty = r["name"]
            break
    tx = Transaction(
        type="TRANSFER", direction="OUT", amount=payload.amount, currency="USDT",
        counterparty=counterparty, address=payload.address, note=payload.note,
    )
    await db.transactions.insert_one(tx.model_dump())
    return serialize_tx(tx.model_dump())


@api_router.get("/banks")
async def list_banks():
    return {"items": BANKS}


@api_router.post("/withdraw")
async def create_withdraw(payload: WithdrawRequest):
    if payload.amount_idr < 50000:
        raise HTTPException(400, "Minimum withdraw IDR 50.000")
    if not any(b["code"] == payload.bank_code for b in BANKS):
        raise HTTPException(400, "Invalid bank")
    rate = get_usdt_idr_rate()
    fee_idr = round(payload.amount_idr * 0.005)  # 0.5% fee
    net_idr = payload.amount_idr - fee_idr
    usdt_equivalent = round(payload.amount_idr / rate, 2)
    note = f"Withdraw to {payload.bank_code} {payload.account_number} a.n {payload.account_holder}"
    if payload.note:
        note += f" — {payload.note}"
    tx = Transaction(
        type="WITHDRAW", direction="OUT", amount=usdt_equivalent, currency="USDT",
        counterparty=f"{payload.bank_code} · {payload.account_holder}",
        address=payload.account_number, note=note,
    )
    await db.transactions.insert_one(tx.model_dump())
    return {
        "transaction": serialize_tx(tx.model_dump()),
        "amount_idr": payload.amount_idr,
        "fee_idr": fee_idr,
        "net_idr": net_idr,
        "usdt_debited": usdt_equivalent,
        "rate_usdt_idr": rate,
        "estimated_arrival": "1–2 jam kerja",
    }


@api_router.post("/qris/generate")
async def generate_dynamic_qris(payload: QRISGenerateRequest):
    if payload.amount <= 0:
        raise HTTPException(400, "Amount must be > 0")
    payload_str = (
        f"PAYO|DYNAMIC|MERCHANT=MILEA-CONCERT|AMOUNT={payload.amount}|"
        f"CUR={payload.currency}|REF={uuid.uuid4().hex[:12].upper()}"
    )
    return {
        "qris_payload": payload_str,
        "amount": payload.amount,
        "currency": payload.currency,
        "note": payload.note,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat(),
    }


@api_router.get("/qris/static")
async def static_qris():
    return {
        "qris_payload": "PAYO|STATIC|MERCHANT=MILEA-CONCERT|MID=PAYO00012345|TID=A1B2C3",
        "merchant_name": "Milea Concert",
        "merchant_id": "PAYO00012345",
        "location": "Cengkareng, Jakarta Barat",
    }


# ============= Voice / STT =============
def _parse_intent_simple(text: str) -> dict:
    """Lightweight rule-based parser as a fallback when LLM not available.
    Looks for action (transfer/kirim/tarik/withdraw), amount, and recipient name."""
    import re
    t = text.lower()
    action = "transfer"
    if any(k in t for k in ["tarik", "withdraw", "cair"]):
        action = "withdraw"
    elif any(k in t for k in ["kirim", "transfer", "send"]):
        action = "transfer"
    # amount: number followed by usdt/idr/rupiah/rp
    amount = None
    currency = "USDT" if action == "transfer" else "IDR"
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(juta|ribu|usdt|idr|rupiah|rp)?", t)
    if m:
        try:
            num = float(m.group(1).replace(",", "."))
            unit = (m.group(2) or "").lower()
            if "juta" in unit:
                num *= 1_000_000; currency = "IDR"
            elif "ribu" in unit:
                num *= 1_000; currency = "IDR"
            elif unit in ("idr", "rupiah", "rp"):
                currency = "IDR"
            elif unit == "usdt":
                currency = "USDT"
            amount = num
        except Exception:
            pass
    # recipient: word after "ke" or "to"
    recipient = None
    m2 = re.search(r"(?:ke|kepada|to)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)", t)
    if m2:
        recipient = m2.group(1).strip().title()
    bank = None
    for b in BANKS:
        if b["code"].lower() in t or b["name"].lower() in t:
            bank = b["code"]; break
    return {
        "action": action,
        "amount": amount,
        "currency": currency,
        "recipient": recipient,
        "bank": bank,
        "raw_text": text,
        "source": "rule",
    }


async def _parse_intent_llm(text: str) -> dict:
    """Use GPT-4o-mini via emergentintegrations to parse intent. Falls back to rule-based."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return _parse_intent_simple(text)
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        prompt = (
            "You are an intent parser for an Indonesian payment app. Output ONLY valid JSON with keys: "
            "action ('transfer' or 'withdraw'), amount (number or null), currency ('USDT' or 'IDR'), "
            "recipient (full name or null, for transfer), bank (one of BCA, MANDIRI, BRI, BNI, CIMB, PERMATA, or null), "
            "account_number (string of digits or null, for withdraw), note (string or null). "
            "Rules: 'kirim/transfer' -> transfer; 'tarik/withdraw/cair' -> withdraw; 'juta'=1000000 IDR; 'ribu'=1000 IDR; default currency USDT for transfer, IDR for withdraw. "
            f"User said: \"{text}\""
        )
        chat = (LlmChat(api_key=api_key, session_id=str(uuid.uuid4()), system_message="Return only valid JSON.")
                .with_model("openai", "gpt-4o-mini"))
        resp = await chat.send_message(UserMessage(text=prompt))
        s = str(resp).strip()
        if s.startswith("```"):
            s = s.strip("`").lstrip("json").strip()
        data = json.loads(s)
        data["raw_text"] = text
        data["source"] = "llm"
        return data
    except Exception as e:
        logging.warning(f"LLM intent parse failed: {e}; falling back to rule parser")
        return _parse_intent_simple(text)


@api_router.post("/voice/parse")
async def voice_parse(audio: UploadFile = File(...), language: str = Form("id")):
    """Accept audio file → Whisper transcription → intent JSON."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")
    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText
        content = await audio.read()
        if len(content) == 0:
            raise HTTPException(400, "Empty audio")
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(400, "Audio too large (>25MB)")
        bio = io.BytesIO(content)
        bio.name = audio.filename or "voice.m4a"
        stt = OpenAISpeechToText(api_key=api_key)
        result = await stt.transcribe(file=bio, model="whisper-1", language=language, response_format="json")
        text = getattr(result, "text", None) or (result.get("text") if isinstance(result, dict) else str(result))
        intent = await _parse_intent_llm(text or "")
        return {"transcript": text, "intent": intent}
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Voice parse failed")
        raise HTTPException(500, f"Voice parse failed: {e}")


@api_router.post("/voice/parse-text")
async def voice_parse_text(text: str = Form(...)):
    """Fallback for web (no mic) — accept typed text and parse intent."""
    intent = await _parse_intent_llm(text)
    return {"transcript": text, "intent": intent}


# ============= OCR (cloud fallback when QVAC offline not available) =============
class OcrRequest(BaseModel):
    image_base64: str


@api_router.post("/ocr/extract")
async def ocr_extract(payload: OcrRequest):
    """Accept base64 image and run GPT-4o vision OCR. Used as fallback for web preview only."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")
    if not payload.image_base64:
        raise HTTPException(400, "image_base64 required")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        b64 = payload.image_base64
        if b64.startswith("data:"):
            b64 = b64.split(",", 1)[-1]
        img = ImageContent(image_base64=b64)
        prompt = (
            "Read ALL visible text in this image (receipt, ticket, QR, address). "
            "Return the raw text only, preserving line breaks. No commentary."
        )
        chat = (LlmChat(api_key=api_key, session_id=str(uuid.uuid4()), system_message="You are an OCR engine. Output raw text only.")
                .with_model("openai", "gpt-4o"))
        resp = await chat.send_message(UserMessage(text=prompt, file_contents=[img]))
        text = str(resp).strip()
        return {"text": text}
    except HTTPException:
        raise
    except Exception as e:
        msg = str(e)
        # OpenAI rejects unsupported / corrupt images — surface as 400 instead of 500.
        if "unsupported image" in msg.lower() or "BadRequestError" in msg or "invalid" in msg.lower():
            raise HTTPException(400, f"Invalid image: {msg[:200]}")
        logging.exception("OCR failed")
        raise HTTPException(500, f"OCR failed: {msg[:200]}")


# ============= PIN (transaction security) =============
DEFAULT_DEVICE_ID = "default-device"
PIN_MAX_ATTEMPTS = 5
PIN_LOCKOUT_SECONDS = 900  # 15 minutes


class PinCreateRequest(BaseModel):
    pin: str = Field(..., pattern=r"^\d{6}$")
    confirm_pin: str = Field(..., pattern=r"^\d{6}$")
    device_id: Optional[str] = None


class PinVerifyRequest(BaseModel):
    pin: str = Field(..., pattern=r"^\d{6}$")
    device_id: Optional[str] = None


def _hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def _verify_pin_hash(pin: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pin.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


@api_router.get("/pin/status")
async def pin_status(device_id: str = Query(DEFAULT_DEVICE_ID)):
    doc = await db.pins.find_one({"device_id": device_id}, {"_id": 0, "hashed_pin": 0})
    now = datetime.now(timezone.utc)
    if not doc:
        return {"is_set": False, "is_locked": False, "failed_attempts": 0, "time_until_unlock": None}
    locked_until = doc.get("locked_until")
    is_locked = False
    time_until_unlock = None
    if locked_until:
        if isinstance(locked_until, str):
            locked_until = datetime.fromisoformat(locked_until)
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if now < locked_until:
            is_locked = True
            time_until_unlock = int((locked_until - now).total_seconds())
    return {
        "is_set": True,
        "is_locked": is_locked,
        "failed_attempts": doc.get("failed_attempts", 0),
        "time_until_unlock": time_until_unlock,
    }


@api_router.post("/pin/create")
async def pin_create(payload: PinCreateRequest):
    if payload.pin != payload.confirm_pin:
        raise HTTPException(400, "PIN dan konfirmasi tidak cocok")
    device_id = payload.device_id or DEFAULT_DEVICE_ID
    now = datetime.now(timezone.utc)
    await db.pins.update_one(
        {"device_id": device_id},
        {"$set": {
            "device_id": device_id,
            "hashed_pin": _hash_pin(payload.pin),
            "failed_attempts": 0,
            "locked_until": None,
            "updated_at": now,
        }, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    return {"status": "success", "message": "PIN berhasil dibuat", "device_id": device_id}


@api_router.post("/pin/verify")
async def pin_verify(payload: PinVerifyRequest):
    device_id = payload.device_id or DEFAULT_DEVICE_ID
    now = datetime.now(timezone.utc)
    doc = await db.pins.find_one({"device_id": device_id})
    if not doc:
        raise HTTPException(404, "PIN belum diatur")

    locked_until = doc.get("locked_until")
    if locked_until:
        if isinstance(locked_until, str):
            locked_until = datetime.fromisoformat(locked_until)
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if now < locked_until:
            wait = int((locked_until - now).total_seconds())
            raise HTTPException(429, f"Akun terkunci. Coba lagi dalam {wait} detik.")

    ok = _verify_pin_hash(payload.pin, doc["hashed_pin"])
    if ok:
        await db.pins.update_one({"device_id": device_id}, {"$set": {"failed_attempts": 0, "locked_until": None}})
        return {"status": "success", "message": "PIN benar"}

    new_attempts = int(doc.get("failed_attempts", 0)) + 1
    update: dict = {"failed_attempts": new_attempts}
    locked_now = False
    if new_attempts >= PIN_MAX_ATTEMPTS:
        update["locked_until"] = now + timedelta(seconds=PIN_LOCKOUT_SECONDS)
        locked_now = True
    await db.pins.update_one({"device_id": device_id}, {"$set": update})

    if locked_now:
        raise HTTPException(429, f"Terlalu banyak percobaan. Akun terkunci {PIN_LOCKOUT_SECONDS // 60} menit.")
    remaining = PIN_MAX_ATTEMPTS - new_attempts
    raise HTTPException(401, f"PIN salah. Sisa percobaan: {remaining}")


app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
