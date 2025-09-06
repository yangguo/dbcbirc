# Contributing

Thanks for your interest in contributing! This repo has a FastAPI backend and a Next.js frontend. For detailed conventions and structure, see AGENTS.md.

## Quick Start Checklist
- Python 3.10+ and Node.js 18+ installed
- Optional: local MongoDB for full backend functionality
- Create env files: `backend/.env` and `frontend/.env.local` (see keys below)

## Local Development
- Backend
  - Install: `pip install -r backend/requirements.txt`
  - Run (from `backend/`): `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
  - Env (in `backend/.env`): `MONGO_DB_URL`, `MONGODB_DB`, `DISABLE_DATABASE=true` to run without MongoDB
- Frontend
  - Install: `npm --prefix frontend install`
  - Dev server: `npm --prefix frontend run dev` (http://localhost:3000)
  - Lint/Types: `npm --prefix frontend run lint` and `npm --prefix frontend run type-check`

## Commit & PR Checklist
- Write clear, imperative commit messages
  - Example: `feat(search): add date range filter`
- Open a PR with:
  - What/why summary and linked issues
  - Screenshots/GIFs for UI changes
  - Verified locally: backend starts, `npm run lint`, `npm run type-check`

## Code Style
- Python: PEP 8, 4-space indent, type hints; domain-based route files in `backend/app/api/v1/`
- TypeScript/React: ESLint (Next presets) + Prettier; components `PascalCase`, utilities/hooks `camelCase`

## Configuration Notes
- Do not commit secrets; use `backend/.env` and `frontend/.env.local`
- Backend CORS/DB defaults live in `backend/app/core/config.py`

## More Details
- See `AGENTS.md` for project structure, commands, style, and testing guidance.
