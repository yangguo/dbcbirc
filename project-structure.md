# CBIRC Analysis System - Modern Architecture

## Project Structure

```
cbirc-analysis/
├── frontend/                    # Next.js Frontend
│   ├── src/
│   │   ├── app/                # App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── cases/
│   │   │   ├── search/
│   │   │   ├── analytics/
│   │   │   └── admin/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── charts/        # Chart components
│   │   │   ├── forms/         # Form components
│   │   │   └── layout/        # Layout components
│   │   ├── lib/               # Utilities and configurations
│   │   ├── hooks/             # Custom React hooks
│   │   └── types/             # TypeScript type definitions
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.js
│   └── next.config.js
├── backend/                     # FastAPI Backend
│   ├── app/
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── api/               # API routes
│   │   │   ├── v1/
│   │   │   │   ├── cases.py
│   │   │   │   ├── search.py
│   │   │   │   ├── analytics.py
│   │   │   │   └── admin.py
│   │   ├── core/              # Core functionality
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── models/            # Pydantic models
│   │   ├── services/          # Business logic
│   │   │   ├── scraper.py
│   │   │   ├── analyzer.py
│   │   │   └── classifier.py
│   │   └── utils/             # Utility functions
│   ├── requirements.txt
│   └── Dockerfile
└── docker-compose.yml           # Development environment
```

## Technology Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **React Query** for data fetching
- **Recharts** for data visualization
- **React Hook Form** for form handling

### Backend
- **FastAPI** for API development
- **SQLAlchemy** for ORM
- **Pydantic** for data validation
- **MongoDB** for data storage
- **Celery** for background tasks
- **Redis** for caching

### Development
- **Docker** for containerization
- **ESLint & Prettier** for code formatting
- **Husky** for git hooks