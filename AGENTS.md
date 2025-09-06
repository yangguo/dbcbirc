# Repository Guidelines

## Project Structure & Module Organization
- Backend: `backend/app/` (FastAPI) with `api/v1/` routes, `core/` (config, database), `services/` (business logic), and `models/`.
- Frontend: `frontend/src/` (Next.js App Router) with `app/` pages, `components/`, and `lib/` utilities.
- Deployment: `vercel/` holds a minimal Next.js build used for hosting.
- Scripts/Assets: `scripts/` utilities, `map/` geojson, and legacy Python utilities at repo root (e.g., `app.py`, `dbcbirc.py`).

## Build, Test, and Development Commands
- Backend
  - Install: `pip install -r backend/requirements.txt`
  - Run (from `backend/`): `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
  - Env: configure `backend/.env` (e.g., `MONGO_DB_URL`, `MONGODB_DB`, `DISABLE_DATABASE=true` to run without MongoDB).
- Frontend
  - Install: `npm --prefix frontend install`
  - Dev: `npm --prefix frontend run dev` (Next dev server on 3000)
  - Build/Start: `npm --prefix frontend run build && npm --prefix frontend run start`
  - Lint/Types: `npm --prefix frontend run lint` and `npm --prefix frontend run type-check`

## Coding Style & Naming Conventions
- Python (backend)
  - PEP 8; 4-space indentation; type hints where practical.
  - Names: `snake_case` for modules/functions, `PascalCase` for classes.
  - API route files live in `backend/app/api/v1/` and are named by domain (e.g., `cases.py`, `analytics.py`).
- TypeScript/React (frontend)
  - Use ESLint (Next presets) and Prettier (Tailwind plugin). 2-space indentation.
  - Components `PascalCase` (e.g., `CaseList.tsx`); utilities/hooks `camelCase` in `src/lib/`.
  - Pages in `src/app/**/page.tsx`; colocate small component-specific styles.

## Testing Guidelines
- This repo has no formal test suite yet. When adding tests:
  - Backend: prefer `pytest`, place under `backend/tests/`, files named `test_*.py`.
  - Frontend: prefer React Testing Library + Vitest/Jest, place under `frontend/src/**/__tests__/`, files `*.test.ts(x)`.
  - Add `npm test` and CI steps in a follow-up PR.

## Commit & Pull Request Guidelines
- Commits: concise imperative subject (<=72 chars), optional body with rationale.
  - Example: `feat(search): add date range filter` or `fix(api): handle missing Mongo connection`
- PRs: clear description, linked issues, screenshots/GIFs for UI, reproduction steps, and checklists.
  - Ensure `npm run lint`, `npm run type-check`, and backend server start locally before requesting review.

## Security & Configuration Tips
- Do not commit secrets. Use `backend/.env` and `frontend/.env.local`.
- MongoDB defaults are in `backend/app/core/config.py`; update `ALLOWED_HOSTS` and DB settings as needed.
