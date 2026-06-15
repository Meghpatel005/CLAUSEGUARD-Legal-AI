# ClauseGuard AI

<p align="center">
  <strong>AI-Powered Legal Contract Analysis Platform</strong>
</p>

<p align="center">
  Upload contracts, identify legal risks, extract critical clauses, generate plain-language summaries, and interact with documents through an AI-powered chat interface.
</p>

---

## Overview

ClauseGuard AI is a full-stack legal intelligence platform designed to help individuals, startups, compliance teams, and legal professionals quickly understand complex contracts and agreements.

The platform leverages Large Language Models (LLMs), document retrieval techniques, and PDF processing pipelines to automatically analyze legal documents, highlight risks, explain legal language in plain English, and provide contextual question-answering grounded in the uploaded document.

### Key Benefits

* Reduce contract review time
* Identify potentially risky clauses
* Understand legal language without legal expertise
* Ask questions directly about uploaded agreements
* Maintain secure document ownership and chat history
* Support multi-user collaboration through authentication and role-based access

---

# Features

## Legal Document Analysis

Upload PDF contracts and automatically receive:

* Clause extraction and categorization
* Risk-level assessment
* Legal issue identification
* Plain-English explanations
* Overall document summary

## AI-Powered Contract Chat

Ask questions such as:

* "What are the termination conditions?"
* "Does this agreement contain automatic renewal?"
* "What are my liabilities under this contract?"
* "Are there any high-risk clauses?"

Responses are generated using document-grounded retrieval to ensure relevance to the uploaded contract.

## Risk Assessment Engine

Each contract is analyzed for:

* Liability clauses
* Termination provisions
* Confidentiality obligations
* Payment terms
* Indemnification language
* Renewal conditions
* Compliance concerns

Risk levels are categorized as:

* Low
* Medium
* High
* Critical

## Secure User Authentication

* JWT Authentication
* Password hashing using bcrypt
* Protected API routes
* User-specific document ownership
* Persistent chat history

## Administrative Dashboard

Administrators can:

* View registered users
* Monitor uploaded documents
* Manage platform content
* Remove inappropriate or unnecessary files

---

# System Architecture

```text
┌─────────────────────────┐
│      React Frontend     │
│    Vite + TailwindCSS   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│      FastAPI Backend    │
│ Authentication & APIs   │
└────────────┬────────────┘
             │
     ┌───────┼────────┐
     ▼                ▼

PDF Processing      AI Services
(pdfplumber,        Groq/OpenRouter
 PyMuPDF)           LLM Integration

     ▼                ▼

Document Chunks → Retrieval Engine

             ▼

       MongoDB Database
```

---

# Technology Stack

## Frontend

* React 18
* Vite
* Tailwind CSS
* Axios
* Lucide React

## Backend

* FastAPI
* Python 3.11+
* Motor
* PyMongo
* JWT Authentication
* Pydantic

## AI & Document Processing

* Groq API
* OpenRouter API
* PDFPlumber
* PyMuPDF
* Retrieval-Augmented Processing

## Database

* MongoDB

---

# Project Structure

```text
CLAUSEGUARD/
│
├── backend/
│   ├── auth/
│   ├── db/
│   ├── middleware/
│   ├── models/
│   ├── routers/
│   ├── services/
│   ├── storage/
│   ├── tests/
│   └── uploads/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── dist/
│
└── README.md
```

---

# Installation

## Prerequisites

Before starting, ensure you have:

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
# Windows
# .venv\Scripts\activate

pip install -r requirements.txt
```

Create a `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=clauseguard

JWT_SECRET_KEY=your_secret_key

GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_key

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_password
```

Run the server:

```bash
uvicorn main:app --reload
```

Backend URL:

```text
http://localhost:8000
```

API Documentation:

```text
http://localhost:8000/docs
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

---

# API Endpoints

## Authentication

| Method | Endpoint         | Description      |
| ------ | ---------------- | ---------------- |
| POST   | /api/auth/signup | Register account |
| POST   | /api/auth/login  | Login            |
| GET    | /api/auth/me     | Current user     |

## Documents

| Method | Endpoint                    |
| ------ | --------------------------- |
| POST   | /api/documents/upload       |
| GET    | /api/documents              |
| GET    | /api/documents/{id}         |
| DELETE | /api/documents/{id}         |
| POST   | /api/documents/{id}/analyze |

## Chat

| Method | Endpoint                |
| ------ | ----------------------- |
| GET    | /api/chat               |
| GET    | /api/chat/{document_id} |
| POST   | /api/chat               |

## Administration

| Method | Endpoint                  |
| ------ | ------------------------- |
| GET    | /api/admin/users          |
| GET    | /api/admin/documents      |
| DELETE | /api/admin/documents/{id} |

---

# Security Features

* JWT-based authentication
* Password hashing with bcrypt
* User-specific document isolation
* Protected API routes
* Environment-based secret management
* Secure MongoDB integration

---

# Testing

Run backend tests:

```bash
cd backend

pytest
```

Tests cover:

* Authentication workflows
* API endpoints
* Authorization logic
* Document processing functionality

---

# Future Enhancements

* OCR support for scanned contracts
* Multi-language legal analysis
* Contract comparison engine
* Clause recommendation system
* Exportable compliance reports
* Team collaboration workspaces
* E-signature integrations
* Advanced legal knowledge graph

---

# Use Cases

### Legal Professionals

Accelerate contract reviews and identify risks faster.

### Startups

Review vendor agreements, NDAs, and investment documents.

### Compliance Teams

Detect contractual obligations and compliance issues.

### Business Owners

Understand legal commitments without extensive legal expertise.

---

# License

This project is licensed under the MIT License.

---

# Author

**ClauseGuard AI**

An intelligent legal document analysis platform built using modern AI technologies, FastAPI, React, and MongoDB.
