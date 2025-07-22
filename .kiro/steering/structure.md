# Project Structure & Organization

## Root Directory Layout

```
├── app.py                 # Main Streamlit application entry point
├── database.py           # MongoDB connection and data operations
├── dbcbirc.py           # Core business logic and data processing
├── utils.py             # Utility functions (text processing, UI helpers)
├── snapshot.py          # Chart screenshot functionality using Selenium
├── requirements.txt     # Python dependencies
├── README.md           # Project documentation
├── .gitignore          # Git ignore patterns
└── .env                # Environment variables (not in repo)
```

## Key Directories

### `/cbirc/`
- Contains scraped case data files
- Organized by case type and organization level
- CSV and Parquet files for different data stages

### `/scripts/`
- **`split.py`** - AI-powered text splitting and analysis
- **`toamt.py`** - Penalty amount extraction from case text
- Batch processing scripts for data enhancement

### `/venv/`
- Python virtual environment (excluded from git)

## Code Organization Patterns

### Main Application (`app.py`)
- Streamlit page configuration and main menu
- Route handling for different application sections
- Session state management for search results

### Data Layer (`database.py`)
- MongoDB connection management with caching
- CRUD operations for case data
- Batch insert/update utilities

### Business Logic (`dbcbirc.py`)
- Web scraping functions for CBIRC website
- Data transformation and analysis
- Chart generation and visualization
- Search and filtering logic

### Utilities (`utils.py`)
- Text processing helpers (word splitting, summarization)
- UI component builders (AgGrid configurations)
- Common data manipulation functions

## File Naming Conventions

### Data Files
- `cbircsum{org}` - Summary case lists by organization
- `cbircdtl{org}` - Detailed case information
- `cbircsplit{org}` - AI-processed case analysis
- `cbirctoupd{org}` - Cases pending updates

### Organization Codes
- `jiguan` - CBIRC headquarters (银保监会机关)
- `benji` - Provincial CBIRC offices (银保监局本级)  
- `fenju` - Local CBIRC branches (银保监分局本级)

## Configuration Management
- Environment variables in `.env` file
- MongoDB connection strings
- API keys for external services
- Streamlit configuration via `st.set_page_config()`