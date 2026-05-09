# PAYO — Backend Architecture Audit, Test Mapping & Model Intent Analysis
**Repository:** `https://github.com/rizalarb/payo` (branch: `main`)
**Audit date:** 2026-05-09
**Auditor scope:** `/backend`, `/tests`, model integration, API surface, memory, data flow, deployment, test reliability, product alignment.
**Audit method:** Full repo clone + file-by-file static review of every non-vendored file; cross-reference against PRD (`memory/PRD.md`), test reports (`test_reports/iteration_{1,2}.json`), pytest XML, and frontend `api.ts` to validate the API contract.

---

## 0. Up-front Reality Check (Important)

The continuation prompt repeatedly references **OCR engines, ONNX runtimes, receipt parsing, model loaders, parsing lifecycles, and a QVAC SDK**. After exhaustive inspection of the repo, the following is the ground truth:

| Prompt assumption | Repo reality |
|---|---|
| OCR pipeline / receipt extraction | **Not present.** PRD line 69 explicitly: *"OCR (struk receipt) — planned next iteration"*. No OCR code, no `pytesseract`/`paddleocr`/`easyocr`/`mindee`/`onnxruntime` import, no image-to-text path. |
| ONNX runtime / local model loaders | **Not present.** No `onnxruntime`, `onnx`, `transformers`, `torch`, `tflite` in `requirements.txt`. |
| QVAC SDK / on-device AI | **Removed.** PRD line 70: *"QVAC SDK local AI — replaced by cloud Whisper+GPT for now."* |
| Multi-module backend | **Single-file backend.** `backend/server.py` (~470 lines) is the only Python module beside tests. |
| Receipt/document parsing logic | **Does not exist.** Parsing logic in repo is rule-based + LLM-based **intent parsing for voice commands** (transfer/withdraw), not document OCR. |

The audit below is therefore performed **against the real product surface (Tether/QRIS payment app with voice STT)** and explicitly flags every gap where the prompt's expectations exceed what is implemented. Sections about OCR/ONNX are answered as **"not implemented — recommendation"** where applicable, rather than fabricated.

---

## 1. Phase 1 — Repository Structure Mapping

### 1.1 Full source-file inventory (excluding `node_modules`, `.metro-cache`, `.git`)

```
.emergent/emergent.yml                       # Emergent platform metadata
.emergent/markers/.bootstrap-complete        # restore markers (infra)
.gitconfig
.gitignore
README.md                                    # placeholder ("Here are your Instructions")
test_result.md                               # testing protocol (empty data block)
backend/
  ├── requirements.txt                       # 27 deps
  ├── server.py                              # SOLE backend module (FastAPI app, all routes, all logic)
  └── tests/
      ├── __init__.py
      └── test_payo_api.py                   # 20 integration tests against live preview URL
tests/                                       # ROOT-LEVEL — virtually empty
  └── __init__.py                            # 0 bytes / unused
memory/
  ├── .gitkeep
  └── PRD.md                                 # Product Requirements Doc (canonical product spec)
test_reports/
  ├── iteration_1.json                       # 12/12 backend pass + UI findings
  ├── iteration_2.json                       # 20/20 backend pass + UI findings
  └── pytest/pytest_results.xml              # JUnit XML, 20 tests, 0 fail, 6.976s
frontend/                                    # Expo SDK 54 + expo-router (TS, React Native)
  ├── app.json
  ├── package.json
  ├── eslint.config.js
  ├── metro.config.js
  ├── tsconfig.json
  ├── app/
  │   ├── (tabs)/_layout.tsx, index.tsx, pendapatan.tsx, settings.tsx
  │   ├── _layout.tsx, +html.tsx
  │   ├── all-transactions.tsx, input-manual.tsx,
  │   ├── scan-qris.tsx, transaction-detail.tsx,
  │   ├── transfer.tsx, withdraw.tsx
  │   └── (no /backend, /api routes — frontend is a thin RN client)
  └── src/
      ├── api.ts                             # Single typed REST client wrapping `/api/*`
      ├── theme.ts
      └── components/
          ├── StaticQrisOverlay.tsx
          ├── SuccessModal.tsx
          └── VoiceMicButton.tsx
```

### 1.2 Test classification

| Category | Location | Files | Count |
|---|---|---|---|
| Unit tests | — | none | 0 |
| Integration / API tests | `backend/tests/test_payo_api.py` | 1 | 20 cases (8 classes) |
| OCR tests | — | none | 0 |
| Backend-service tests | folded into integration tests | 1 | (subset of 20) |
| Memory / DB tests | — | none (DB exercised indirectly via API) | 0 |
| Frontend unit tests | — | none | 0 |
| Root `/tests/` package | `tests/__init__.py` | 1 | 0 cases (dead stub) |

**Verdict on test layout:** the *only* meaningful test artifact is `backend/tests/test_payo_api.py`. It is a black-box integration suite hitting the live preview URL via `requests`. There is **no unit-level isolation** of business functions (`get_usdt_idr_rate`, `_parse_intent_simple`, `serialize_tx`, `ensure_seed_data`).

### 1.3 Test-to-module coverage matrix

| Backend module / function (`server.py`) | Covered by | Coverage type |
|---|---|---|
| `GET /api/dashboard/today` | `TestDashboard.test_today` | smoke + schema |
| `GET /api/exchange-rate` | `TestDashboard.test_exchange_rate` | smoke |
| `GET /api/transactions/recent` | `TestTransactions.test_recent_default` | schema + `_id` leak check |
| `GET /api/transactions` (paginated) | `TestTransactions.test_paginated`, `test_date_filter`, `test_date_filter_invalid` | happy + invalid date |
| `GET /api/transactions/daily-summary` | `TestTransactions.test_daily_summary` | aggregation correctness |
| `GET /api/recent-recipients` | `TestRecipients.test_list` | smoke |
| `POST /api/transfer` | `TestTransfer.{test_create_valid,test_reject_zero,test_reject_negative}` | happy + 2 negative |
| `GET /api/banks` | `TestBanks.test_list_six_banks` | exact set equality |
| `POST /api/withdraw` | `TestWithdraw.{test_valid_withdraw_bca,test_below_minimum,test_invalid_bank}` | happy + 2 negative + fee math |
| `POST /api/qris/generate` | `TestQRIS.{test_generate_dynamic,test_generate_zero_rejected}` | happy + negative |
| `GET /api/qris/static` | `TestQRIS.test_static` | smoke |
| `POST /api/voice/parse-text` | `TestVoiceParseText.{test_transfer_intent,test_withdraw_intent}` | LLM round-trip |
| `POST /api/voice/parse` (audio) | **NOT TESTED** | — (requires real audio file) |
| `_parse_intent_simple` (rule fallback) | **NOT UNIT-TESTED** (only via LLM path) | — |
| `get_usdt_idr_rate` cache | **NOT TESTED** (cache TTL, fallback path) | — |
| `ensure_seed_data` idempotency | **NOT TESTED** | — |
| `serialize_tx` (`_id` strip) | indirectly asserted in 4 test cases | partial |
| Error/exception paths in `voice_parse` | **NOT TESTED** (empty audio, >25 MB, missing key) | — |
| `@app.on_event("shutdown")` | **NOT TESTED** | — |

**Coverage gaps (impact-ranked):**
1. **CRITICAL:** No test exercises the audio path. A regression in `OpenAISpeechToText` integration would ship undetected.
2. **HIGH:** `EMERGENT_LLM_KEY` missing → 500 contract is asserted nowhere.
3. **HIGH:** Rule-based fallback `_parse_intent_simple` (the *only* parser when LLM is unavailable in production) has zero direct unit tests; if LLM passes, you're effectively only testing GPT-4o-mini, not your own code.
4. **MEDIUM:** Concurrency / cache safety of `_rate_cache` (module-level dict) untested.
5. **MEDIUM:** Seed idempotency (`ensure_seed_data`) — accidental double-seed would silently inflate dashboard numbers.
6. **LOW:** Date filter timezone edge case (UTC midnight crossover at WIB users) untested.

### 1.4 Dead / redundant code

| Item | Status |
|---|---|
| `tests/__init__.py` (root) | **Dead stub** — confusing because `backend/tests/` is the real location. Either delete or convert into a `pytest.ini`/`pyproject.toml`-rooted suite. |
| `pandas`, `numpy`, `boto3`, `requests-oauthlib`, `python-jose`, `pyjwt`, `bcrypt`, `passlib`, `email-validator`, `jq`, `typer` in `requirements.txt` | **Unused.** Not imported anywhere in `server.py`. ~120 MB of unnecessary install footprint and supply-chain attack surface. |
| `mypy`, `black`, `isort`, `flake8` in runtime requirements | Should live in `requirements-dev.txt` only. |
| Hardcoded fallback `total_usdt = 9020.21` in `dashboard_today` | Demo-only; flagged in iteration_1 + iteration_2 reports — still present. Can mask zero-income state in production. |
| `+html.tsx` in frontend (Expo) | Web-only file; safe to keep but worth confirming intent. |

### 1.5 Functional architecture diagram

```
                    ┌────────────────────────────────────────────┐
                    │           Expo / React Native (TS)          │
                    │  app/(tabs)/index.tsx  …  app/withdraw.tsx  │
                    │       └─ src/api.ts (typed client)          │
                    │       └─ src/components/VoiceMicButton.tsx  │
                    └───────────────┬─────────────────────────────┘
                                    │  HTTPS (CORS *)  /api/*
                                    ▼
        ┌────────────────────────────────────────────────────────────────┐
        │                     FastAPI (single file)                      │
        │                       backend/server.py                        │
        │                                                                │
        │  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐    │
        │  │ Dashboard +  │   │ Transfer /   │   │ Voice (STT +      │   │
        │  │ Transactions │   │ Withdraw /   │   │ Intent parse)     │   │
        │  │ /Recipients  │   │ QRIS         │   │  └ rule fallback  │   │
        │  └──────┬───────┘   └──────┬───────┘   └─────────┬────────┘    │
        │         │                  │                     │             │
        │         │           ┌──────┴─────────┐           │             │
        │         │           │ Pydantic models │          │             │
        │         │           │ + serialize_tx │           │             │
        │         │           └──────┬─────────┘           │             │
        │         ▼                  ▼                     ▼             │
        │   ┌──────────────┐   ┌──────────────┐   ┌─────────────────┐    │
        │   │ MongoDB via  │   │ CoinGecko    │   │ emergent-       │    │
        │   │ Motor (async)│   │ /simple/price│   │ integrations    │    │
        │   │ db.transac-  │   │ (5-min cache,│   │ ▸ Whisper-1     │    │
        │   │ tions        │   │ fallback     │   │ ▸ gpt-4o-mini   │    │
        │   │              │   │  16 250)     │   │ (EMERGENT_LLM)  │    │
        │   └──────────────┘   └──────────────┘   └─────────────────┘    │
        └────────────────────────────────────────────────────────────────┘
```

### 1.6 Dependency chain

```
server.py
├─ fastapi, starlette CORSMiddleware            (HTTP server)
├─ motor.motor_asyncio.AsyncIOMotorClient       (DB driver)
├─ pydantic.BaseModel                           (request/response models)
├─ requests                                     (sync external HTTP — CoinGecko)
├─ python-dotenv                                (env loading)
├─ emergentintegrations.llm.chat (LlmChat,
│    UserMessage)                               (LLM intent parse)
├─ emergentintegrations.llm.openai
│    .OpenAISpeechToText                        (Whisper STT)
└─ stdlib: io, json, logging, uuid, re,
   datetime, pathlib
```

External services: **MongoDB**, **CoinGecko REST**, **Emergent Universal LLM key** (proxying OpenAI Whisper-1 + GPT-4o-mini).

---

## 2. Phase 2 — Backend Core Analysis

The backend is a **single Python module**. The audit per "module" below is therefore a **per-functional-block** audit inside `server.py`.

### 2.1 Backend Module Inventory (the requested deliverable table — Phase 6 #2 expanded)

| Block / Function | File · Lines | Function | Inputs | Outputs | External deps | Risks | Priority |
|---|---|---|---|---|---|---|---|
| App bootstrap (env, Motor client, FastAPI, router) | `server.py` 1–25 | wire-up | `MONGO_URL`, `DB_NAME` env | global `app`, `db`, `api_router` | Motor, dotenv | **HIGH:** `os.environ['MONGO_URL']` raises `KeyError` if missing — server fails on import (no graceful boot diagnostics). | High |
| `Transaction`, `TransferRequest`, `WithdrawRequest`, `QRISGenerateRequest` (Pydantic) | 27–58 | request/response shape | dict | Model | pydantic v2 | **MEDIUM:** No length/regex validation on `address` (TRC20 addresses are 34 chars, prefix `T`); accepts any string. No `min_length` on `account_number`. | High |
| `serialize_tx` | 61–65 | strip Mongo `_id`, ISO-format datetime | dict | dict | — | OK | Low |
| `_rate_cache` + `get_usdt_idr_rate` | 68–87 | 5-min in-process cache, CoinGecko fallback `16250` | network | float | `requests` | **HIGH:** Module-level dict — not safe under multiple Uvicorn workers (each worker has its own cache → uneven rate). **Sync `requests.get` inside async app** blocks event loop on cold misses. | High |
| `SAMPLE_RECIPIENTS`, `BANKS` constants | 90–105 | hardcoded dictionaries | — | — | — | **HIGH (product-impact):** Banks list is hardcoded. Any change requires redeploy. Should live in DB. | Medium |
| `ensure_seed_data` | 108–134 | demo seed (20 tx) on cold DB | DB | side-effect insert | Motor | **HIGH:** Called inside *every* read endpoint (`dashboard/today`, `transactions/*`, `recent-recipients`). That's a `count_documents({})` on the hot path of *every* page-load. Use a startup hook + flag. **Demo logic in production code path.** | High |
| `GET /api/` | 138–140 | health/banner | — | `{"message":"PAYO API"}` | — | OK | Low |
| `GET /api/dashboard/today` | 143–170 | day aggregate | none | dict | DB, rate | **MEDIUM:** Hardcoded `9020.21` zero-income fallback (carryover bug per iter_1 & iter_2 reports). **MEDIUM:** Aggregation done in Python loop `async for` — would be cleaner & faster as `$group` pipeline. | Medium |
| `GET /api/exchange-rate` | 173–175 | rate passthrough | none | dict | rate | OK | Low |
| `GET /api/transactions/recent` | 178–183 | recent N | `limit` 1–50 | list | DB | OK | Low |
| `GET /api/transactions` | 186–210 | paginated + date filter | `page,limit,date` | list+meta | DB | **LOW:** Date parsed as UTC; Indonesian users in WIB (+07:00) will see edge-case off-by-one for early-morning tx. | Medium |
| `GET /api/transactions/daily-summary` | 213–248 | per-day rollup | `days` 1–90 | list+rate | DB aggregate | **LOW:** Uses USDT/IDR rate snapshot at request-time for *historical* days → revaluation drift if rate changes. Acceptable for MVP. | Low |
| `GET /api/recent-recipients` | 251–271 | de-duped recipients | DB | list | DB | OK | Low |
| `POST /api/transfer` | 274–289 | new TRANSFER tx | `TransferRequest` | tx | DB | **HIGH:** No idempotency key → double-tap can create duplicate transactions. **HIGH:** No actual TronWeb/USDT broadcast — purely DB-only mock (PRD-acknowledged). **HIGH:** Address shorter than 8 chars → IndexError-free but truncation on `address[:8]` produces ugly counterparty strings. | High |
| `GET /api/banks` | 292–294 | static bank list | — | list | — | OK | Low |
| `POST /api/withdraw` | 297–324 | withdraw to bank, 0.5% fee | `WithdrawRequest` | tx + breakdown | DB, rate | **HIGH:** Ditto idempotency + double-spend. **MEDIUM:** No verification of `account_number` length per bank. **LOW:** Hardcoded `"1–2 jam kerja"` arrival string instead of computed estimate. | High |
| `POST /api/qris/generate` | 327–341 | dynamic QRIS string | amount/currency/note | payload+expiry | uuid | **HIGH:** Output is a plaintext pipe-delimited string, **not BI-compliant EMV-CRC16 QRIS** spec. No CRC, no merchant ID, no NMID, no checksum. Real QRIS parsers will reject this. | High |
| `GET /api/qris/static` | 344–351 | merchant card | — | dict | — | Same QRIS-format risk as above. | High |
| `_parse_intent_simple` | 355–401 | rule-based fallback | text | intent dict | regex | **LOW:** Greedy regex may miss multi-word recipients with non-ASCII names; defaults reasonable. | Low |
| `_parse_intent_llm` | 404–431 | GPT-4o-mini intent JSON | text | intent dict | emergentintegrations | **MEDIUM:** Markdown-code-fence stripping is fragile (`s.strip("`").lstrip("json")`) — model occasionally returns `\`\`\`json\n…` plus a trailing comment, breaking `json.loads`. Catches all exceptions and silently degrades. | Medium |
| `POST /api/voice/parse` | 434–458 | audio → Whisper → intent | UploadFile, lang | dict | OpenAISpeechToText | **HIGH:** No file-type validation (`audio/m4a` vs `application/octet-stream`); reads entire file into memory (RAM spike for 25 MB audio × concurrent users). **MEDIUM:** Per-request import of `OpenAISpeechToText` (cold-start latency on every call). | High |
| `POST /api/voice/parse-text` | 461–465 | LLM/rule parse for web | form `text` | dict | LLM | OK | Low |
| `app.include_router`, CORS, logging, shutdown hook | 468–476 | wiring | — | — | — | **HIGH:** `allow_origins=["*"]` with `allow_credentials=True` is browser-rejected per CORS spec; works in current testing but not safe for production with cookies/auth. | High |

### 2.2 Model Intent (per the prompt's "C. Model Intent")

| Aspect | Reality |
|---|---|
| AI models in use | `whisper-1` (STT) + `gpt-4o-mini` (intent JSON) |
| OCR engine type | **None.** |
| ONNX integration | **None.** No `onnxruntime`, no `.onnx` artefacts, no model loaders. |
| LLM integration | Cloud-only via `emergentintegrations` SDK (`v0.1.0`) → routes through Emergent Universal Key → OpenAI backend. |
| SDK dependencies | `emergentintegrations==0.1.0` (sole AI SDK) |
| Local / Cloud / Hybrid | **100% Cloud.** No local inference. PRD line 70 documents that QVAC (local) was deliberately replaced. |
| GPU/CPU strategy | Not applicable — all inference offloaded to OpenAI. CPU-only host. |
| Memory expectations | Audio buffer fully loaded in RAM (`await audio.read()`) → up to 25 MB per concurrent voice request. No streaming. |
| Constraint optimisation | **None present.** No batching, no result cache for identical voice transcripts, no rate-limiting, no per-user quota. |

### 2.3 Memory system

| Layer | Implementation | Notes |
|---|---|---|
| Persistent store | MongoDB (`db.transactions` collection only) | Single collection. No users, no merchants, no audit log, no idempotency keys. |
| In-process cache | `_rate_cache` (USDT→IDR, 5 min) | Per-worker, not shared. |
| LLM session | `LlmChat(session_id=str(uuid.uuid4()))` per request | Stateless — no continuation, no memory across calls. Correct for intent parsing. |
| File / object storage | **None.** | Voice audio is consumed in-memory and discarded — no archival, no replay-debug. |
| `memory/` folder in repo | Holds `PRD.md` only | This is *documentation* memory, not runtime memory. |

### 2.4 Data flow (happy path: voice transfer)

```
[user taps mic] → expo-av records m4a → POST /api/voice/parse (multipart)
   └─ FastAPI reads bytes → in-memory BytesIO
       └─ OpenAISpeechToText.transcribe(model=whisper-1, lang=id)
           └─ returns {text}
       └─ _parse_intent_llm(text)
           └─ LlmChat(gpt-4o-mini).send_message(prompt) → JSON
               └─ json.loads → {action, amount, currency, recipient, bank, …}
   └─ response: {transcript, intent}

[client] auto-fills address (substring match against /api/recent-recipients) + amount
[user taps "Transfer"] → POST /api/transfer {address, amount, note}
   └─ Pydantic validate → Transaction(uuid4) → db.transactions.insert_one
   └─ response: serialize_tx(tx)

NB: NO real Tron/TRC20 broadcast. NO double-spend protection. NO authorisation.
```

### 2.5 Deployment assumptions

| Assumption | Reality / Risk |
|---|---|
| Single Uvicorn process | `_rate_cache` and demo `ensure_seed_data` race condition assume single-worker deployment. Multi-worker = N seed attempts on cold DB (mitigated only by `count_documents` check, not by lock). |
| MongoDB on local network | `MONGO_URL` from env, no SSL flag enforced, no replica-set awareness. |
| Public preview behind ingress | All routes `/api/*` (good — matches Emergent ingress contract). |
| TLS termination upstream | App binds plain HTTP — fine if behind ingress; risky if directly exposed. |
| Env keys required | `MONGO_URL`, `DB_NAME`, `EMERGENT_LLM_KEY`. Voice endpoints will 500 without the LLM key — graceful fallback exists for `/voice/parse-text` only (rule parser), but **`/voice/parse` (audio) hard-fails** without key. |

---

## 3. Phase 3 — OCR & AI Pipeline Reverse Engineering

> **Stated scope vs. real scope:** the prompt asks to reverse-engineer the OCR lifecycle. There **is no OCR lifecycle in PAYO**. What exists is a *voice-command → intent JSON* pipeline. I document that pipeline truthfully, and treat OCR as a roadmap recommendation in §6.

### 3.1 Actual AI lifecycle in PAYO (voice → intent)

```
1. INPUT
   └─ multipart/form-data, field "audio" (UploadFile), optional "language" (default "id")

2. VALIDATION
   ├─ EMERGENT_LLM_KEY presence → else 500
   ├─ len(content) > 0 → else 400 "Empty audio"
   ├─ len(content) ≤ 25 MB → else 400 "Audio too large"
   └─ ❌ No MIME-type whitelist, no magic-byte sniff, no duration cap

3. PREPROCESSING
   └─ wrap raw bytes in BytesIO; preserve filename or default "voice.m4a"
   └─ ❌ No transcoding, no silence trim, no noise gate, no dB normalisation

4. RECOGNITION (STT)
   └─ OpenAISpeechToText(api_key).transcribe(
        file=bio, model="whisper-1",
        language=language, response_format="json")
   └─ Returns object/dict with .text  (defensive .get fallback)

5. PARSING (Intent)
   └─ _parse_intent_llm(text) →
       LlmChat(openai, gpt-4o-mini)
         .with_system("Return only valid JSON.")
         .send_message(structured prompt)
       → strip ```json fences → json.loads
   └─ On any exception → fall back to _parse_intent_simple (regex)

6. JSON EXPORT
   └─ {transcript, intent: {action, amount, currency, recipient, bank,
                            account_number, note, raw_text, source}}

7. CLEANUP
   └─ Implicit: BytesIO + UploadFile dropped at request end. No persistence.
```

### 3.2 Reliability evaluation

| Failure mode | Probability | Impact | Current handling |
|---|---|---|---|
| Whisper transient 429/5xx | Med | High (whole feature down) | None — exception bubbles up to generic 500. No retry/backoff. |
| LLM returns non-JSON | Med | Med | Falls back to rule parser. Good. |
| Rule parser misses Indonesian compound numbers (e.g., "satu juta dua ratus ribu") | High | Med | Regex only handles `\d+`. No word-number expansion. |
| Audio not actually m4a/wav | Low | High (Whisper rejects) | Whisper error returned as opaque 500. |
| Large m4a (~25 MB ≈ 30 min) loaded into RAM × N concurrent users | Med | Critical (OOM) | No streaming, no concurrency guard. |
| EMERGENT_LLM_KEY rotated/expired | Low | Critical (audio path 500s) | `/voice/parse-text` survives via rule fallback; `/voice/parse` does not. |
| LLM hallucinates invalid bank code | Low | Med | Frontend validates against `/api/banks`; OK. |

### 3.3 Bottlenecks

1. **Per-request SDK import** in `voice_parse` (`from emergentintegrations.llm.openai import OpenAISpeechToText`) — first call cold-start ~200–500 ms penalty.
2. **Sync `requests.get`** in `get_usdt_idr_rate` blocks the async event loop on every cache miss (≤ once per 5 min, but compounded across N workers).
3. **`ensure_seed_data` on every read** — `count_documents({})` is O(collection) without index; trivial today (~20 docs), but a foot-gun.
4. **Single MongoDB collection** without indexes on `timestamp` and `(direction, timestamp)` — daily-summary aggregation will scale linearly with row count.

### 3.4 Runtime / cross-platform / ONNX risks

| Topic | Status |
|---|---|
| Node compatibility | N/A — backend is Python; the frontend Expo build targets Node ≥ 18 implicitly via Expo SDK 54. |
| ONNX deployment | Not present. **Recommendation only:** if/when receipt OCR is added (PaddleOCR ONNX, Tesseract, or a Layout-LM ONNX), pin `onnxruntime>=1.19`, build CPU-only wheel, mount model files outside the container image, expose a `/healthz` model-warm endpoint. |
| Bare-runtime dep conflicts | `pandas`, `numpy`, `boto3` are unused but bring `numpy`-platform-specific wheels. On ARM containers (`expo_mongo_base_image_cloud_arm` per `.emergent/emergent.yml`), `numpy>=1.26` and `pandas>=2.2` add >90 s to image build. Trim them. |
| Cross-platform | Backend is platform-agnostic (Python 3.11 stdlib + pure-Python deps). Frontend handles iOS/Android/Web with `Platform.OS` branches; voice recording is gracefully degraded to text input on web. |

---

## 4. Phase 4 — Backend Intent vs. Product Vision

### 4.1 What PAYO actually is

Per `memory/PRD.md` line 4: *"PAYO is a Tether-(USDT)-based mobile payment app for event/concert merchants in Indonesia. Supports dynamic & static QRIS, USDT TRC20 transfer, withdraw to local bank, and **voice commands** for transfer/withdraw."*

The **likely end-goal** is a **merchant-facing crypto-acceptance + IDR-cash-out app** for live-event vendors (concerts, expos, F&B booths) — not a personal wallet, not an OCR-driven accounting tool, not a generic SME finance stack.

### 4.2 Alignment scorecard

| Backend capability | Aligned with vision? | Gap |
|---|---|---|
| Dashboard / today income / multi-currency aggregate | ✅ | OK |
| Recent transactions / pagination / daily summary | ✅ | OK |
| Static + dynamic QRIS endpoints | ⚠️ Partially | **Output is not real EMV-QRIS** (no CRC, no NMID). Real BI/QRIS scanners will not parse. |
| Transfer (USDT TRC20) | ⚠️ | DB-only mock. No TronWeb integration, no balance check, no signing key, no fee, no on-chain confirm. |
| Withdraw (bank IDR) | ⚠️ | DB-only mock. No bank API (Xendit, Flip, Midtrans-Iris). No KYC, no AML. |
| Voice (Whisper + GPT-4o-mini) | ✅ | Good for MVP; needs tests for audio path. |
| OCR / receipt | ❌ | Not implemented. PRD lists as next iteration. |
| Authentication / merchant identity | ❌ | **No auth at all.** Any caller can transfer/withdraw against the demo wallet. |
| Multi-merchant / tenancy | ❌ | Hardcoded "Milea Concert" in seed + `/dashboard/today` + QRIS. |
| Security / rate-limit / abuse | ❌ | None. |

### 4.3 Missing modules for production readiness

| Module | Status | Why critical |
|---|---|---|
| **Authentication** (merchant login, API token / JWT) | Missing | All endpoints public; `POST /transfer` is a self-checkout. |
| **Authorization** (per-merchant transaction scoping) | Missing | Single-tenant by accident. |
| **Idempotency** (`Idempotency-Key` header + dedupe collection) | Missing | Double-tap dupes are inevitable on flaky mobile networks. |
| **Real Tron/TRC20 integration** (or escrow custodian) | Missing | Otherwise this is theatre. |
| **Real bank-out** (Xendit/Flip Disbursement API, KYC pass-through) | Missing | |
| **EMV-QRIS-compliant codec** (CRC16-CCITT, NMID, MID, currency 360, country ID) | Missing | Existing string is custom-pipe format, won't be scannable. |
| **Rate limiting / abuse guard** (slowapi or Redis token bucket) | Missing | Voice endpoint forwards user audio to paid OpenAI API. |
| **Logging / observability** (structlog + JSON, OpenTelemetry traces) | Only `logging.basicConfig(INFO)` | No request IDs, no correlation, no metrics, no error reporting. |
| **Monitoring** (Sentry/Better Stack/Grafana) | Missing | |
| **Database schema migrations** (Alembic / Beanie / odm) | Missing | Pure ad-hoc dict inserts; no schema enforcement at DB layer. |
| **CI/CD** (GitHub Actions running `pytest`, `ruff`, `mypy`) | Missing | Tests exist but are not gated. |
| **Secret management** (Vault/Doppler) | `.env` only | Acceptable for staging, not for prod. |
| **Backup / restore** for MongoDB | None documented | |
| **Health endpoints** (`/livez`, `/readyz`) | Only `/api/` banner | Insufficient for k8s probes. |
| **OpenAPI doc hygiene** (response_model on every route) | Inconsistent — many routes return `dict` without `response_model` | Auto-generated client (e.g., `api.ts`) is hand-maintained instead. |

---

## 5. Phase 5 — Quality & Production Readiness Review

### 5.1 Security

| Topic | Finding | Severity |
|---|---|---|
| Secrets exposure | `.env` git-ignored (`.gitignore` covers `*.env`). ✅ | OK |
| `MONGO_URL`, `DB_NAME`, `EMERGENT_LLM_KEY` | Loaded via `os.environ` with `python-dotenv` ✅ | OK |
| CORS | `allow_origins=["*"]` + `allow_credentials=True` — browser ignores credentials with wildcard origin per spec; functionally a misconfiguration. | **High** |
| Authentication / authorisation | None. Any HTTP client can `POST /transfer` & `POST /withdraw`. | **Critical** |
| Input sanitisation | Pydantic validates types; no length/regex on `address`, `account_number`, `note`. `note` flowed verbatim into a string concat in `withdraw` — potential log-injection. | **High** |
| Rate limiting | None. | **High** (voice endpoint costs $$$ per call) |
| Dependency risk | `requirements.txt` carries 27 deps, ~12 unused (boto3, pandas, numpy, jq, …). Each unused dep is unnecessary CVE surface. | **High** |
| Supply chain | `emergentintegrations==0.1.0` is a private/internal index dep — single SBOM source must be reviewed and pinned via lockfile. | Medium |
| Logging of sensitive data | `note` in `withdraw` includes full account number + account holder; ends up in `logging.exception` in voice handler if it ever wraps that flow. **PII in logs.** | High |
| TLS | Assumes upstream ingress. ✅ on Emergent. | OK in context |
| `requests` lib for outbound | No timeout on default cases — there *is* `timeout=8` on CoinGecko ✅, but no outbound TLS verify pinning. | Low |

### 5.2 Performance

| Topic | Finding |
|---|---|
| Async architecture | Mostly async (Motor, FastAPI). ⚠️ `requests.get` in `get_usdt_idr_rate` is **sync inside async** — should be `httpx.AsyncClient`. |
| OCR load times | N/A. |
| LLM latency | Whisper ~1–3 s, gpt-4o-mini ~1–2 s — observed 3.4 s in `test_transfer_intent`, 1.7 s in `test_withdraw_intent`. Acceptable for one-shot voice command. |
| Memory leaks | Audio buffer fully read into RAM; no cleanup beyond GC. Per-worker `_rate_cache` is small but dictionary-based (no LRU bound). |
| Throughput | Bound by external services (LLM, DB). With Uvicorn workers=1, ~50 req/s safe; with seed-on-every-read pattern, much lower under cold cache. |
| Batch processing | None. Daily summary uses Mongo `$group` (good); other aggregations done in Python (improvable). |
| Indexes | None declared. Collection has implicit `_id` index only. **Missing:** `{timestamp: -1}`, `{direction: 1, timestamp: -1}`, `{address: 1, timestamp: -1}`. |

### 5.3 Maintainability

| Topic | Finding | Score (0–10) |
|---|---|---|
| Code modularity | Single 476-line file. Models, helpers, routes, LLM logic all mixed. Should split into `models/`, `routers/`, `services/`. | 4 |
| Test clarity | Tests are well-organised by class, readable, hit live URL → easy black-box validation but slow & flaky over CI without preview. | 7 |
| Documentation quality | `README.md` is a placeholder (`"Here are your Instructions"`). PRD is excellent but private. No OpenAPI tags / descriptions per route. | 4 |
| Config separation | Single `.env`. ✅. No staging/prod profiles. | 6 |
| Version compatibility | `fastapi==0.110.1` (older — current is 0.115+). `pydantic>=2.6.4` (OK). `motor==3.3.1` (OK). `pymongo==4.5.0` aligns. Voice deps not pinned beyond `emergentintegrations==0.1.0`. | 6 |
| Linting / typing | `ruff`, `mypy`, `black`, `isort`, `flake8` declared but no CI to enforce. | 3 |

### 5.4 Readability scoring (per 1.13 Production-Readiness rubric)

| File | Lines | Cyclomatic complexity (worst function) | Readability (0–10) |
|---|---|---|---|
| `backend/server.py` | 476 | `_parse_intent_simple` ~12; `dashboard_today` ~9 | 7 |
| `backend/tests/test_payo_api.py` | 228 | low; idiomatic pytest | 9 |
| `frontend/src/api.ts` | 90 | low | 9 |
| `frontend/src/components/VoiceMicButton.tsx` | 162 | medium (Animated + state machine) | 7 |

---

## 6. Phase 6 — Deliverables

### 6.1 Executive Summary

PAYO is a **Tether-based merchant payment MVP** for live events in Indonesia. The backend is a single-file FastAPI application (~476 LOC) that serves a polished Expo client. It correctly demonstrates: dashboard aggregation, paginated transactions, daily rollups, simulated USDT transfer + bank withdraw, dynamic & static QRIS issuance, and a **voice-command pipeline** (Whisper-1 → GPT-4o-mini intent JSON, with rule-based fallback). All 20 declared backend tests pass.

**Strengths.** Clean async I/O against MongoDB; sensible Pydantic models; LLM intent parsing with a fail-safe rule fallback; CoinGecko rate cache with safe fallback; explicit `/api` prefix matching the Emergent ingress contract; no `_id` leak in API responses; frontend `api.ts` is well-typed and matches the contract; iteration_2 reports 100 % verified on all critical user flows; permissions declared properly in `app.json`.

**Weaknesses.** **Zero authentication or authorization.** **No idempotency.** Hardcoded zero-income demo fallback in production code. CORS misconfiguration (`*` + credentials). QRIS payloads are a custom pipe-string, not EMV-QRIS-compliant. ~12 unused heavyweight dependencies in `requirements.txt`. The root `tests/` directory is a dead stub (real tests live in `backend/tests/`). No unit tests for the rule-based fallback parser or for the audio-upload path. No indexes on the `transactions` collection. Single-file backend will not scale architecturally past the next 5–6 features.

**Immediate priorities.** (1) Add merchant auth (JWT or session) before *any* production traffic. (2) Add `Idempotency-Key` to `/transfer` and `/withdraw`. (3) Fix CORS for production. (4) Replace QRIS payload with EMV-CRC16-compliant string. (5) Trim `requirements.txt`. (6) Split `server.py` into routers + services. (7) Add unit tests for `_parse_intent_simple` and Mongo cache/seeding logic.

### 6.2 Backend Module Inventory

See **§2.1** above — full table delivered.

### 6.3 Model Interaction Blueprint

```
                ┌────────────────────────────────────────────┐
                │ Frontend (Expo)                            │
                │  VoiceMicButton (record m4a / web text)    │
                └───────┬───────────────────┬────────────────┘
                        │ audio (multipart) │ text (form)
                        ▼                   ▼
       ┌───────────── /api/voice/parse ──┬── /api/voice/parse-text ──┐
       │                                 │                           │
       │   io.BytesIO(audio_bytes)       │                           │
       │            │                    │                           │
       │            ▼                    │                           │
       │  emergentintegrations.llm.      │                           │
       │  openai.OpenAISpeechToText      │                           │
       │  .transcribe(model=whisper-1,   │                           │
       │              lang=id)           │                           │
       │            │                    │                           │
       │      transcript text ◀──────────┼──── input text ───────────┤
       │            ▼                    ▼                           │
       │   _parse_intent_llm                                         │
       │     LlmChat(.with_model("openai", "gpt-4o-mini"))           │
       │     prompt: "Return only valid JSON …"                      │
       │     → strip ```json fences → json.loads                     │
       │            │                                                │
       │   on exception │                                            │
       │            ▼                                                │
       │   _parse_intent_simple (regex fallback)                     │
       │            │                                                │
       │            ▼                                                │
       │   intent JSON: {action, amount, currency,                   │
       │                 recipient, bank, account_number, note,      │
       │                 raw_text, source}                           │
       │            │                                                │
       │            ▼                                                │
       │   { transcript, intent }                                    │
       └─────────────┬───────────────────────────────────────────────┘
                     ▼
                 Frontend autofills /transfer or /withdraw form
                     ▼
       ┌──────── POST /api/transfer  /  POST /api/withdraw ──────────┐
       │   Pydantic validate                                         │
       │      └─ Transaction(uuid4) → db.transactions.insert_one     │
       │      └─ serialize_tx(_id stripped, ISO timestamp)           │
       └───────────────────────────────┬─────────────────────────────┘
                                       ▼
                           MongoDB (Motor async)
                              db.transactions

  External: api.coingecko.com /simple/price?ids=tether&vs_currencies=idr
            (5-min in-process cache, fallback 16250)
```

| Layer | What it is | What it isn't |
|---|---|---|
| OCR | — | (not implemented; flagged as future) |
| LLM | gpt-4o-mini via Emergent Universal Key | not a chat-memory bot, not RAG |
| Parsing | LLM JSON + regex rule fallback | not a grammar parser, not Lark |
| Storage | MongoDB single collection (`transactions`) | not multi-tenant, no users/merchants |
| API | FastAPI, 14 routes, no auth | not REST-strict (some routes return ad-hoc dicts), no GraphQL |

### 6.4 Missing Production Features — Prioritized Roadmap

| Priority | Feature | Effort | Why |
|---|---|---|---|
| **Critical** | Merchant authentication (JWT + refresh) | 2 d | Currently anyone can `POST /transfer`. |
| **Critical** | Idempotency keys on `/transfer`, `/withdraw`, `/qris/generate` | 0.5 d | Prevents double-charge on retries. |
| **Critical** | EMV-QRIS-compliant payload (CRC16-CCITT, NMID, MID, country ID) | 1 d | Without it, real scanners won't read the QR. |
| **Critical** | Real Tron TRC20 broadcast OR custodial integration | 5–10 d | Otherwise transfers are theatre. |
| **Critical** | Real bank disbursement (Xendit / Flip Iris / Midtrans) + KYC | 5–10 d | Ditto for withdrawals. |
| **Critical** | Trim unused deps + lockfile (`pip-tools` / `uv.lock`) | 0.5 d | Supply-chain & image-size hygiene. |
| **Important** | Per-route `response_model` + OpenAPI tags + descriptions | 0.5 d | Auto-docs unlock client autogen. |
| **Important** | Mongo indexes on `transactions.timestamp`, `(direction, timestamp)`, `(address, timestamp)` | 0.5 d | Query performance. |
| **Important** | Replace `requests` with `httpx.AsyncClient` for CoinGecko | 0.25 d | Don't block the event loop. |
| **Important** | Replace per-read `ensure_seed_data` with `@app.on_event("startup")` + advisory lock | 0.25 d | Hot-path cleanup. |
| **Important** | Structured logging (`structlog`) + request IDs + `X-Request-ID` header | 1 d | Observability. |
| **Important** | Rate-limiting on `/voice/parse*` (per-IP, per-merchant) | 0.5 d | LLM-cost protection. |
| **Important** | Sentry / OTEL traces | 0.5 d | Production tail-latency triage. |
| **Important** | Split `server.py` → `routers/`, `services/`, `models/`, `core/config.py`, `core/db.py` | 1 d | Code maintainability. |
| **Important** | Unit tests for `_parse_intent_simple`, `serialize_tx`, `get_usdt_idr_rate` cache | 0.5 d | Real coverage. |
| **Important** | E2E test of `/voice/parse` (audio) with a tiny fixture m4a | 0.5 d | Currently uncovered. |
| **Important** | Remove hardcoded `9020.21` zero-income fallback | 5 min | Carryover from iter_1 + iter_2. |
| **Important** | CI: GitHub Actions running `pytest`, `ruff`, `mypy`, `bandit` | 0.5 d | Gate merges. |
| Optional | OCR (PaddleOCR ONNX or Mindee) for receipts | 5–10 d | PRD next iteration. |
| Optional | Multi-tenant (merchant model + middleware) | 3 d | When >1 event served. |
| Optional | Background workers (Celery/Arq/Dramatiq) for delayed bank settlement polling | 3 d | When real bank API arrives. |
| Optional | Webhook subscriptions for incoming transactions | 2 d | Merchant POS integrations. |
| Optional | i18n on backend error messages | 0.5 d | Currently mixed ID/EN. |

### 6.5 Technical Debt Report

| Category | Item | Severity | Fix |
|---|---|---|---|
| Architecture | Single-file backend (`server.py` 476 LOC) | High | Split into routers/services. |
| Architecture | `tests/` root stub vs. real tests in `backend/tests/` | Low | Delete root `tests/` or consolidate. |
| Architecture | Demo seed inside hot-path read endpoints | High | Move to startup hook with `IF EXISTS` guard + advisory lock. |
| Architecture | LLM SDK imported per-request | Med | Cache module-level after env check. |
| Compatibility | Sync `requests` inside async FastAPI | High | Migrate to `httpx.AsyncClient`. |
| Compatibility | `fastapi==0.110.1` is 5+ minor versions behind | Low | Upgrade to ≥ 0.115; review CORS+lifespan API. |
| Compatibility | `boto3`, `pandas`, `numpy`, `pyjwt`, `bcrypt`, `passlib`, `email-validator`, `jq`, `typer`, `python-jose`, `requests-oauthlib` unused | Med | Remove. |
| Performance | No DB indexes on `transactions` | High | Add at startup. |
| Performance | Module-level `_rate_cache` not worker-shared | Med | Use Redis or `cachetools.TTLCache` + worker affinity, or accept current limit. |
| Performance | 25-MB audio fully buffered in memory | Med | Stream to a temp file or pipe directly to SDK. |
| Security | No auth | Critical | Add JWT. |
| Security | No idempotency | Critical | Header + dedupe collection. |
| Security | CORS `*` + credentials | High | Whitelist origins. |
| Security | PII in logs (account numbers) | High | Mask in `note` and structured fields. |
| Security | No rate limit on LLM endpoints | High | `slowapi`. |
| Security | No input length limits on `address`, `note`, `account_number` | Med | Pydantic `max_length`. |
| Functional | QRIS payload is non-EMV pipe-string | High | Build proper EMV-CRC16-CCITT TLV string. |
| Functional | Hardcoded zero-income fallback `9020.21` | Med | Remove. |
| Functional | Hardcoded "Milea Concert" + Cengkareng location | Med | Move to config / per-merchant. |
| Functional | `address[:8] + "..."` truncation on short addresses | Low | Validate TRC20 length first. |
| Test | No unit test for rule fallback parser | High | Add. |
| Test | No test for audio path | High | Add fixture-based test. |
| Test | No test for missing `EMERGENT_LLM_KEY` 500 contract | Med | Add. |
| Test | Tests hit live preview URL → CI flakiness | Med | Add an in-process `TestClient` suite alongside. |
| Test | TEST_-tagged transfers/withdraws left in DB after each run (per iter reports) | Low | Tear-down or use isolated test DB. |
| Docs | `README.md` is a placeholder | Med | Write proper README + ADRs. |
| Docs | OpenAPI lacks per-route descriptions / tags / response_model | Low | Annotate. |

---

## 7. Phase 7 — Final Strategic Recommendations

### 7.1 Refactoring priorities (top 7, in order)

1. **Auth layer** — `core/security.py` (JWT issue/verify) + `Depends(current_merchant)` on every mutating route.
2. **Routers split** — `routers/dashboard.py`, `routers/transactions.py`, `routers/payments.py` (transfer + withdraw + qris), `routers/voice.py`. Move models to `models/transaction.py`.
3. **Idempotency** — `services/idempotency.py` reading `Idempotency-Key` header, persisting `(key, response_hash)` in `db.idempotency` with TTL=24 h.
4. **Async HTTP everywhere** — replace `requests` with `httpx.AsyncClient` initialised once at startup.
5. **Startup-only seed + indexes** — `@app.on_event("startup")` runs `ensure_seed_data` once, plus `db.transactions.create_index([...])`.
6. **EMV-QRIS encoder** — implement TLV builder + CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF). Test against BI sandbox.
7. **Trimmed deps + lockfile** — drop boto3/pandas/numpy/jq/typer/pyjwt/passlib/etc. Use `uv pip compile` for `requirements.lock`.

### 7.2 Test expansion plan

| Layer | Add | Tooling |
|---|---|---|
| Unit | `test_rule_parser.py`, `test_serialize_tx.py`, `test_rate_cache.py` (with `freezegun`) | pytest + `pytest-asyncio` |
| Integration (in-process) | `TestClient`-based suite that does **not** require preview URL; spins up motor with `mongomock-motor` or testcontainers-mongo | `pytest`, `httpx.AsyncClient`, `mongomock-motor` |
| Audio path | Tiny 1-second silent-m4a fixture; test 200 + 400 (empty) + 400 (>25 MB synthetic) | pytest |
| Auth | Once auth lands: 401 on missing token, 403 on wrong-merchant transfer | pytest |
| Property tests | Hypothesis on amount validation, date parsing | `hypothesis` |
| Load | k6 or Locust profile against `/transactions/recent` and `/voice/parse-text` | optional |
| CI | GitHub Actions matrix: `python-3.11`, `python-3.12`, on push & PR; `mongo:7` service container | GHA |

### 7.3 Deployment strategy

- **Staging:** keep current Emergent preview workflow.
- **Production:**
  - Container image based on `python:3.11-slim` (current ARM cloud arm image is fine).
  - 2-stage build: deps layer cached separately from code layer.
  - Run with **`uvicorn --workers 2 --proxy-headers`** behind ingress (TLS termination upstream).
  - Mongo: managed (Atlas) M10 minimum; replica set; daily snapshot.
  - Secrets in Doppler / SSM, not `.env`.
  - Region close to Indonesian users (Jakarta or Singapore).
  - Health probes: `/api/livez` (process up), `/api/readyz` (DB ping + LLM key present).

### 7.4 Dockerization suggestions

```dockerfile
# stage 1 – deps
FROM python:3.11-slim AS builder
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.lock .
RUN pip install --prefix=/install --no-cache-dir -r requirements.lock

# stage 2 – runtime
FROM python:3.11-slim
RUN useradd -m -u 1000 payo
WORKDIR /app
COPY --from=builder /install /usr/local
COPY backend/ ./backend
USER payo
ENV PYTHONUNBUFFERED=1 PORT=8001
EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request,sys;sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8001/api/livez',timeout=3).status==200 else 1)"
CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2", "--proxy-headers"]
```

### 7.5 CI/CD recommendations

- **GitHub Actions** workflow `.github/workflows/backend.yml`:
  - `lint`: `ruff check`, `mypy backend`, `bandit -r backend -ll`
  - `test`: spin up `services: mongo:7`, run `pytest -q --junitxml=...` against `TestClient`
  - `build`: build & push image to GHCR with semver tag
  - `deploy-staging`: triggered on `main` push; uses Emergent publish hook
  - `deploy-prod`: manual approval, tag-based
- Pin all GitHub Actions to commit SHAs (not floating tags).
- Add **Dependabot** for `pip` + `npm` + `actions`.

### 7.6 Model packaging recommendations

- **Today:** nothing to package — all inference is OpenAI-hosted.
- **When QVAC / on-device returns** (per PRD), or when receipt OCR is added:
  - Use **ONNX Runtime** with provider auto-detect (`CPUExecutionProvider` first; let mobile pick `CoreML`/`NNAPI`).
  - Store models in object storage; download on first boot to a writable cache dir; verify SHA-256.
  - Wrap inference behind a `services/ai.py` interface so the cloud-vs-local switch is one config flag.
  - Quantise to int8 where accuracy allows (PaddleOCR det + rec models drop to ~6 MB total int8).

### 7.7 Open-source readiness improvements

- Replace `README.md` placeholder with: project intro, screenshots, quickstart, contracts, env variables, contribution guide, license.
- Add `LICENSE` (MIT or Apache-2.0).
- Add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` (incl. responsible-disclosure email).
- Add `CHANGELOG.md` with Keep-a-Changelog format.
- Public **OpenAPI JSON** rendered as a Stoplight or Redoc page.
- Examples folder: `examples/curl/transfer.sh`, `examples/postman/PAYO.postman_collection.json`.
- ADRs in `docs/adr/0001-*.md` capturing decisions (e.g., "Why Tether instead of multi-stable", "Why GPT-4o-mini for intent").
- Demo recording (gif) or hosted preview link.

---

## 8. Scoring Summary

| Score | Value (0–100) | Justification |
|---|---|---|
| **Production Readiness** | **42 / 100** | Strong dev-loop, good tests for the surface that exists, but blocked by no-auth, no-idempotency, mock crypto/bank rails, non-EMV QRIS, no observability, no rate-limit. |
| **Open-Source Maturity** | **22 / 100** | No README content, no LICENSE, no CONTRIBUTING, no ADRs, no public OpenAPI, no examples. Useful PRD exists but is internal. |
| **AI Infrastructure** | **48 / 100** | Cloud LLM integration is clean and resilient (LLM→rule fallback). But: per-request SDK import, no model-versioning, no audio test, no batching, no cost guard, no PII redaction before sending audio to OpenAI. |
| Test Coverage (functional) | 70 / 100 | 20/20 happy-path API. 0 unit tests, 0 audio-path test. |
| Code Quality | 60 / 100 | Readable, idiomatic FastAPI; structurally a single-file monolith with mixed concerns. |
| Security | 25 / 100 | No auth, no rate-limit, CORS misconfig, PII in logs. |
| Documentation | 30 / 100 | PRD is excellent; everything else is missing. |

### Risk grading (top 10, ordered)

| # | Risk | Severity | First-touch fix |
|---|---|---|---|
| 1 | Unauthenticated `/transfer` & `/withdraw` | Critical | Add JWT middleware. |
| 2 | Non-EMV QRIS payload | Critical | Implement TLV+CRC16. |
| 3 | No idempotency on mutating endpoints | Critical | `Idempotency-Key`. |
| 4 | Mocked Tron + bank rails (product-correct, but ship-blocking) | Critical (for prod) | Integrate real custodian + disbursement. |
| 5 | CORS `*` + credentials | High | Whitelist. |
| 6 | Demo seed on every read endpoint | High | Move to startup. |
| 7 | Sync `requests` inside async path | High | `httpx.AsyncClient`. |
| 8 | Unused heavyweight deps (boto3/pandas/numpy/…) | High | Trim. |
| 9 | No DB indexes | High | `create_index` at startup. |
| 10 | Hardcoded zero-income fallback | Medium | Delete. |

---

## 9. Final Verdict

PAYO is a **well-built MVP for an Indonesian merchant USDT-acceptance product**, with a particularly tasteful voice-command pipeline that is the standout differentiator. The backend's surface is small, coherent, and well-tested at the integration layer — it is a strong base. It is **not** an OCR / receipt-parsing / accounting product, despite the framing of the audit prompt, and any pivot toward those use-cases would require new code, not a refactor.

To reach **production-grade for crypto-payments**, three blockers dominate: **auth**, **idempotency**, and **real on-chain + bank rails** (the latter being a business decision, not a coding one). To reach **open-source-investor-grade**, the repo needs documentation, license, ADRs, and a CI/CD pipeline. To reach **technical-due-diligence-pass**, it needs the §7.1 refactor, the §7.2 test expansion, the §7.5 CI, and the §6.5 technical-debt items resolved.

Effort to move the production-readiness score from **42 → 80**: roughly **3–4 engineer-weeks** of focused work, excluding the bank/crypto rails (which are vendor-dependent).

— end of audit —
