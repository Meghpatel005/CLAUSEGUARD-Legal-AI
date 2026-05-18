# ClauseGuard AI

ClauseGuard AI is an intelligent legal document analysis platform designed to simplify complex contracts and agreements using AI. The system allows users to upload legal PDFs, automatically identify important clauses, evaluate potential risks, generate easy-to-understand summaries, and interact with documents through an AI-powered chat interface.

Built as a full-stack application, ClauseGuard combines modern web technologies with large language models to create a practical and user-friendly legal analysis experience.

---

# Features

## AI-Powered Contract Analysis

* Detects and extracts key clauses from legal documents
* Categorises clauses into meaningful legal sections
* Generates clause-level and overall risk assessments
* Highlights risky or unusual contract language

## Plain Language Summaries

* Converts complex legal text into simple explanations
* Helps non-technical users understand contracts quickly
* Provides document-wide summaries in a readable format

## AI Chat with Documents

* Ask questions directly about uploaded contracts
* Context-aware responses based on document content
* Maintains conversation history for each document

## Authentication & User Management

* Secure JWT-based authentication system
* User signup and login functionality
* Persistent user sessions and protected API routes
* Individual document storage and chat history per user

## Document Management

* Upload and store PDF contracts
* View previously analysed documents
* Delete and manage uploaded files
* MongoDB-based persistent storage

---

# Tech Stack

## Frontend

* React 18
* Vite
* Tailwind CSS
* Axios

## Backend

* FastAPI
* Python 3.11+
* JWT Authentication
* Motor (Async MongoDB Driver)
* Pydantic

## Database

* MongoDB Atlas / Local MongoDB

## AI Integration

* Groq API
* OpenRouter API
* DeepSeek Models

---

# System Architecture

```bash
CLAUSEGUARD/
├── backend/
│   ├── auth/              # JWT authentication and security
│   ├── db/                # MongoDB connection and indexes
│   ├── middleware/        # Error handling and middleware
│   ├── models/            # Pydantic schemas and models
│   ├── routers/           # API route handlers
│   ├── services/          # AI analysis and document processing
│   ├── storage/           # File storage and repositories
│   └── main.py            # FastAPI application entry point
│
└── frontend/
    ├── src/
    │   ├── auth/          # Authentication handling
    │   ├── components/    # UI components
    │   ├── pages/         # Application pages
    │   └── services/      # API integration
```

---

# How ClauseGuard Works

1. User uploads a legal PDF document.
2. The backend extracts text from the document.
3. The AI analysis service processes the contract.
4. Important clauses are identified and categorised.
5. Risk scores are generated for sensitive clauses.
6. A simplified summary is created.
7. Users can interact with the document using AI chat.
8. Results and chat history are stored securely in MongoDB.

---

# Authentication Flow

The platform uses JWT-based authentication for secure access.

### Login Process

1. User signs up or logs into the system.
2. Passwords are securely hashed using bcrypt.
3. The backend generates a JWT token after successful authentication.
4. The frontend stores the token in local storage.
5. Protected API routes validate the token before granting access.

### Security Features

* Password hashing with bcrypt
* JWT token validation
* Protected API endpoints
* User-specific document access
* CORS protection and safe error handling

---

# Installation & Setup

## Prerequisites

Make sure the following are installed:

* Python 3.11+
* Node.js 18+
* MongoDB
* Groq API Key or OpenRouter API Key

---

## Backend Setup

```bash
cd backend

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
```

Update the `.env` file:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET_KEY=your_secret_key
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_key
```

Start the backend server:

```bash
uvicorn main:app --reload --port 8000
```

Backend running at:

```bash
http://localhost:8000
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend running at:

```bash
http://localhost:5173
```

---

# API Endpoints

| Method | Endpoint                      | Description               |
| ------ | ----------------------------- | ------------------------- |
| POST   | `/api/auth/signup`            | Create user account       |
| POST   | `/api/auth/login`             | User login                |
| GET    | `/api/auth/me`                | Get current user          |
| POST   | `/api/documents/upload`       | Upload PDF document       |
| GET    | `/api/documents`              | Get user documents        |
| POST   | `/api/documents/{id}/analyze` | Analyse uploaded contract |
| POST   | `/api/chat`                   | AI chat with document     |
| GET    | `/health`                     | Health check endpoint     |

---

# Future Improvements

* OCR support for scanned PDFs
* Multi-language contract analysis
* PDF highlighting for risky clauses
* Downloadable AI-generated reports
* Advanced legal analytics dashboard
* Real-time collaborative document review

---

# Project Goals

The goal of ClauseGuard AI is to make legal documents easier to understand for students, professionals, freelancers, startups, and everyday users who may not have a legal background.

The project focuses on combining AI accessibility with practical real-world functionality while maintaining a clean and scalable full-stack architecture.

---

# Disclaimer

ClauseGuard AI is an educational and research-based project. The analysis generated by the system should not be considered official legal advice.

---

# Author

Developed as a Final Year AI/ML Project focused on AI-assisted legal document intelligence and secure full-stack application development.
