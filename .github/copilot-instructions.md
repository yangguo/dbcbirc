# CBIRC Analysis System - AI Coding Instructions

## Architecture Overview

This is a full-stack regulatory penalty analysis system with a **FastAPI backend** and **Next.js frontend**. The system scrapes, processes, and analyzes Chinese Banking and Insurance Regulatory Commission (CBIRC) penalty data.

### Key Components
- **Backend**: `backend/app/` - FastAPI with async MongoDB operations and background task processing
- **Frontend**: `frontend/src/` - Next.js 14 with App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Data Processing**: CSV-based data pipeline with pandas for CBIRC penalty case analysis
- **Task Management**: Custom in-memory task service (`backend/app/services/task_service.py`) for tracking background operations

## Development Workflow

### AI Agent Guidelines
- **DO NOT** start servers or install packages directly using terminal commands
- **DO NOT** run `uvicorn`, `npm run dev`, `pip install`, or similar commands
- **INSTEAD**: Provide clear suggestions and commands for the user to execute manually
- Focus on code analysis, file modifications, and providing actionable recommendations

### Starting the System
```bash
# Backend (from project root)
cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (from project root)  
cd frontend && npm run dev
```

### API Development Patterns
- All API routes in `backend/app/api/v1/` follow FastAPI conventions
- Use `BackgroundTasks` for long-running operations (data scraping, processing)
- Task tracking via `task_service.create_*_task()` functions
- CORS enabled for localhost development

### Data Flow Architecture
1. **Scraping**: `scraper_service.py` fetches CBIRC data via aiohttp
2. **Storage**: CSV files in `/cbirc/` directory (not MongoDB for historical data)
3. **Processing**: pandas DataFrames for analysis and statistics
4. **API**: FastAPI serves processed data to frontend
5. **UI**: React components with React Query for data fetching

## Project-Specific Conventions

### Backend Patterns
- **Organization Types**: Use `OrganizationType` enum (`银保监会机关`, `银保监局本级`, `银保监分局本级`)
- **File Naming**: CBIRC data files follow pattern `cbircsum{org_suffix}_{timestamp}.csv`
- **Task Management**: Always create tasks via `create_update_cases_task()` or `create_update_details_task()`
- **Error Handling**: Background tasks must call `task_service.fail_task()` on exceptions

### Frontend Patterns
- **API Client**: Centralized in `frontend/src/lib/api.ts` with TypeScript interfaces
- **UI Components**: shadcn/ui components in `components/ui/` - never modify these directly
- **Data Fetching**: Use React Query with 5-30 second `refetchInterval` for real-time updates
- **Chinese Text**: All UI text in Chinese, following existing pattern
- **Styling**: Tailwind with custom CBIRC color palette, gradient backgrounds

### Data Conventions
- **Date Formats**: `YYYY-MM-DD` in APIs, display as Chinese format in UI
- **Currency**: Penalty amounts in RMB, display with appropriate formatting
- **Organization Mapping**: Use `org2name` dict in `admin.py` for file suffix mapping

## Critical Integration Points

### API-Frontend Communication
- Base URL: `http://localhost:8000` (configured in `next.config.js`)
- All API calls through `apiClient` instance in `frontend/src/lib/api.ts`
- Error handling via try-catch with user toast notifications

### Task Status Tracking
- Frontend polls `/api/v1/admin/tasks` endpoint every 5 seconds
- Task progress updates via `task_service.update_task_progress()`
- Real-time status display in admin dashboard components

### File System Dependencies
- CBIRC data directory: `{project_root}/cbirc/` (hardcoded in backend)
- CSV processing via pandas with specific column expectations
- File path construction using `get_csvdf()` utility function

## Common Debugging Commands

```bash
# Check backend API health
curl http://localhost:8000/health

# View active tasks
curl http://localhost:8000/api/v1/admin/tasks/active

# Monitor background task logs
cd backend && python -c "from app.services.task_service import task_service; print(task_service.get_all_tasks())"
```

## Key Files to Reference
- `backend/app/api/v1/admin.py` - Background task management patterns
- `frontend/src/components/admin/admin-dashboard.tsx` - Real-time data fetching
- `backend/app/services/task_service.py` - Task lifecycle management
- `backend/app/models/case.py` - Data model definitions and validation
- `frontend/src/lib/api.ts` - API client patterns and error handling
