# ClauseGuard AI

A full-stack legal document analysis system. Upload a PDF contract or agreement and get:

- **Clause identification** — 5–10 key provisions extracted and categorised
- **Risk assessment** — per-clause and overall risk scoring (low / medium / high / critical)
- **Plain-language summary** — non-lawyer-friendly explanation of what the document does
- **Document-grounded chat** — ask questions, get answers cited from the document text

---

## Architecture

```
clauseguard/
├── backend/               FastAPI (Python 3.11+)
│   ├── main.py            App entry, CORS, router wiring
│   ├── config.py          Pydantic-settings (reads .env)
│   ├── models/schemas.py  All Pydantic request/response types
│   ├── storage/           In-memory document store (dict-based)
│   ├── services/
│   │   ├── ai_client.py   Groq primary → OpenRouter fallback
│   │   ├── pdf_extractor  pdfplumber text extraction
│   │   ├── text_chunker   Overlapping word-count chunker
│   │   ├── analyzer       LLM structured JSON analysis
│   │   └── retriever      TF-IDF chunk retrieval (no vector DB)
│   └── routers/           /api/documents  +  /api/chat
└── frontend/              Vite + React 18 + Tailwind CSS
    └── src/
        ├── App.jsx         Phase state machine (idle→upload→analyze→ready)
        ├── services/api.js Axios client, exact backend contract
        └── components/     UploadZone, AnalysisPanel, ClauseCard,
                            RiskBadge, ChatPanel, LoadingState
```

### Key design decisions

| Decision | Rationale |
|---|---|
| In-memory document store | Removes DB operational overhead; valid for single-user/session use. Swap for SQLite/Postgres without touching other layers. |
| TF-IDF retrieval | Lightweight, reproducible, no external index service. Sufficient for single-document RAG. |
| Groq → OpenRouter fallback | Keeps the app operational during Groq rate-limit windows. |
| Word-count chunking with overlap | Clause boundaries don't align with character counts; overlap prevents silent mid-clause splits. |
| JSON-mode LLM analysis | Structured output eliminates parsing fragility; `_extract_json` handles fence leakage from non-compliant model variants. |

---

## Setup

### Prerequisites

- Python 3.11+
- Node 18+
- A [Groq API key](https://console.groq.com/) and/or an [OpenRouter API key](https://openrouter.ai/)

---

### Backend

```bash
cd backend

# 1. Create a virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env and set GROQ_API_KEY (and optionally OPENROUTER_API_KEY)

# 4. Start the server
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

---

### Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Open: http://localhost:5173

The Vite proxy forwards `/api/*` → `http://localhost:8000` automatically.

---

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GROQ_API_KEY` | Yes* | — | Groq API key (primary provider) |
| `OPENROUTER_API_KEY` | Yes* | — | OpenRouter key (fallback) |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Groq model ID |
| `OPENROUTER_MODEL` | No | `deepseek/deepseek-chat` | OpenRouter model ID |
| `MAX_CHUNK_SIZE` | No | `500` | Words per retrieval chunk |
| `CHUNK_OVERLAP` | No | `50` | Overlapping words between chunks |
| `MAX_CHUNKS_FOR_RETRIEVAL` | No | `5` | Top-k chunks injected into chat |

*At least one of `GROQ_API_KEY` or `OPENROUTER_API_KEY` must be set.

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/documents/upload` | Upload a PDF |
| `POST` | `/api/documents/{id}/analyze` | Trigger LLM analysis |
| `GET` | `/api/documents/{id}` | Get metadata + cached analysis |
| `POST` | `/api/chat` | Send a grounded chat message |
| `GET` | `/health` | Health check |

---

## Limitations

- Scanned / image-only PDFs are not supported (no OCR).
- The in-memory store resets on server restart.
- Analysis is capped at 8 000 words; longer documents are truncated at the beginning.
- Not a substitute for qualified legal advice.
