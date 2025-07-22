# Technology Stack & Build System

## Framework & Runtime
- **Python 3.x** - Primary programming language
- **Streamlit** - Web application framework for the main UI
- **MongoDB** - Database for storing case data and analysis results

## Key Dependencies
- **pandas** - Data manipulation and analysis
- **plotly** - Interactive data visualization
- **beautifulsoup4** - Web scraping for CBIRC website
- **textrank4zh** - Chinese text summarization
- **pymongo** - MongoDB database driver
- **selenium** - Web automation for chart snapshots
- **requests** - HTTP client for API calls

## Development Environment
- **Virtual Environment**: Uses `venv` for Python dependency isolation
- **Environment Variables**: MongoDB connection via `MONGO_DB_URL` in `.env` file
- **Package Management**: Standard `requirements.txt` for dependencies

## Common Commands

### Setup & Installation
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Running the Application
```bash
# Start Streamlit app
streamlit run app.py

# Run data processing scripts
python scripts/split.py
python scripts/toamt.py
```

### Database Operations
- MongoDB runs locally on `localhost:27017` or via remote connection string
- Database operations handled through `database.py` module
- Collections organized by case type and organization level

## External APIs
- **Dify AI API** - Used for text processing and case classification
- **CBIRC Website** - Primary data source for case scraping
- API keys stored as environment variables for security