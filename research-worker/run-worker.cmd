@echo off
REM Start the research worker (DB poll loop). ALWAYS use this on Windows.
REM Do NOT run: python -m research_worker worker  with Microsoft Store Python —
REM that hits user site-packages / blocked native DLLs. This script uses .venv.
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo .venv missing — run setup-windows.cmd first.
  exit /b 1
)
if not exist ".env" (
  echo .env missing — copy .env.example to .env and fill secrets.
  exit /b 1
)

echo Using: %CD%\.venv\Scripts\python.exe
".venv\Scripts\python.exe" -m research_worker worker %*
endlocal
