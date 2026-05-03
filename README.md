# 🔨 PromptForge

> *Multi-model ensemble prompt composer with cross-matrix scoring.*

Compose, test, and score prompts across multiple language models in parallel. Built with cross-provider anti-sycophancy architecture.

## 🏗️ Architecture

```
┌──────────────────┐     ┌─────────────────────┐
│   React + Vite   │────▶│   Express Backend    │
│   (Frontend)     │     │   (API + Scoring)    │
└──────────────────┘     └──────────┬──────────┘
                                    │
                          ┌─────────▼──────────┐
                          │   Turso (SQLite)    │
                          │   + Drizzle ORM     │
                          └────────────────────┘
```

## 🛠️ Stack

### Frontend
- React 18 + Vite
- TypeScript

### Backend
- Express.js — REST API
- Turso — Distributed SQLite
- Drizzle ORM — Type-safe queries
- OpenAI SDK — Multi-model interface

## 🚀 Getting Started

```bash
# Backend
cd backend
npm install
npm run dev      # http://localhost:3001

# Frontend
cd frontend
npm install
npm run dev      # http://localhost:5173
```

## 📂 Structure

```
prompt-forge/
├── backend/
│   ├── src/
│   │   └── index.ts    # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   └── ...         # React app
│   └── package.json
└── CONSULTATION_REPORT.md
```

---

<p align="center"><i>⚡ Crafted by Arya Rizky Ardhi Pratama</i></p>
