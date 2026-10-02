@echo off
REM Start the research worker (DB poll loop). Run from research-worker\.
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

".venv\Scripts\python.exe" -m research_worker worker %*
endlocal
