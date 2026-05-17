# ClauseGuard AI

A full-stack legal document analysis system. Upload a PDF contract or agreement and get:

- **Clause identification** — 5–10 key provisions extracted and categorised
- **Risk assessment** — per-clause and overall risk scoring (low / medium / high / critical)
- **Plain-language summary** — non-lawyer-friendly explanation of what the document does
- **Document-grounded chat** — ask questions, get answers cited from the document text
- **Multi-user accounts** — JWT auth, per-user documents, persistent chat history (MongoDB)

---

## Architecture

```
final_submission_proejct-main/
├── backend/               FastAPI (Python 3.11+)
│   ├── main.py            App entry, lifespan, CORS
│   ├── config.py          Pydantic-settings (.env)
│   ├── db/                Motor MongoDB connection + indexes
│   ├── auth/              JWT, bcrypt, FastAPI dependencies
│   ├── models/            Pydantic API + user models
│   ├── storage/           Repositories + disk PDF storage (uploads/)
│   ├── services/          AI, PDF, chunking, analyzer, retriever
│   ├── routers/           auth, documents, chat, admin
│   └── middleware/        Safe error responses
└── frontend/              Vite + React 18 + Tailwind CSS
    └── src/
        ├── auth/          JWT session (localStorage)
        ├── services/api.js
        └── components/
```

---

## Setup

### Prerequisites

- Python 3.11+
- Node 18+
- **MongoDB** running locally or Atlas URI
- A [Groq API key](https://console.groq.com/) and/or [OpenRouter API key](https://openrouter.ai/)

---

### 1. MongoDB

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Or Docker
docker run -d -p 27017:27017 --name clauseguard-mongo mongo:7
```

---

### 2. Backend

```bash
cd backend

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env: MONGODB_URI, JWT_SECRET_KEY, GROQ_API_KEY, optional ADMIN_EMAIL/ADMIN_PASSWORD

uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

---

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

The Vite proxy forwards `/api/*` → `http://localhost:8000`.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `MONGODB_DB_NAME` | No | Database name (default: `clauseguard`) |
| `JWT_SECRET_KEY` | Yes | Long random secret for signing tokens |
| `GROQ_API_KEY` | Yes* | Groq API key (primary AI) |
| `OPENROUTER_API_KEY` | Yes* | OpenRouter fallback |
| `ADMIN_EMAIL` | No | Bootstrap admin email (created once on startup) |
| `ADMIN_PASSWORD` | No | Bootstrap admin password |
| `UPLOAD_DIR` | No | PDF storage directory (default: `uploads`) |
| `MAX_UPLOAD_BYTES` | No | Upload limit (default: 20MB) |

\*At least one AI provider key is required.

---

## API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | — | Create account |
| `POST` | `/api/auth/login` | — | Login, receive JWT |
| `GET` | `/api/auth/me` | User | Current profile |
| `POST` | `/api/documents/upload` | User | Upload PDF |
| `GET` | `/api/documents` | User | List your documents |
| `GET` | `/api/documents/{id}` | User | Document metadata + analysis |
| `DELETE` | `/api/documents/{id}` | User | Delete own document |
| `POST` | `/api/documents/{id}/analyze` | User | Run LLM analysis |
| `GET` | `/api/chat` | User | List chat threads |
| `GET` | `/api/chat/{document_id}` | User | Chat history for document |
| `POST` | `/api/chat` | User | Send message |
| `GET` | `/api/admin/users` | Admin | List users |
| `GET` | `/api/admin/documents` | Admin | List all documents |
| `DELETE` | `/api/admin/documents/{id}` | Admin | Delete any document |
| `GET` | `/health` | — | Health check |

Send `Authorization: Bearer <token>` on protected routes.

---

## Tests

```bash
cd backend
source .venv/bin/activate
pytest
```

Uses database `clauseguard_test` and directory `uploads_test` (see `tests/conftest.py`).

---

## Limitations

- Scanned / image-only PDFs are not supported (no OCR).
- Analysis is capped at 8 000 words.
- Not a substitute for qualified legal advice.
