@echo off
REM DETECTIVE research-worker — Windows CMD helper
REM Run this FROM the research-worker folder only.
REM Wrong: detective-laptop-handoff-full\  (repo root — no pyproject.toml)
REM Right: detective-laptop-handoff-full\research-worker\

setlocal EnableExtensions
cd /d "%~dp0"

if not exist "pyproject.toml" (
  echo ERROR: pyproject.toml not found.
  echo You must run this inside the research-worker folder.
  echo If that folder is missing, sync tip cursor/case-research-agent-6548 first.
  exit /b 1
)

where py >nul 2>&1
if %ERRORLEVEL%==0 (
  set "PY=py -3"
) else (
  where python >nul 2>&1
  if %ERRORLEVEL%==0 (
    set "PY=python"
  ) else (
    echo ERROR: Python not on PATH. Install from https://www.python.org/downloads/
    echo Check "Add python.exe to PATH", then open a NEW Command Prompt.
    exit /b 1
  )
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating .venv ...
  %PY% -m venv .venv
  if errorlevel 1 exit /b 1
)

echo Upgrading pip ...
".venv\Scripts\python.exe" -m pip install -U pip
echo Installing research-worker ...
".venv\Scripts\python.exe" -m pip install -e ".[dev]"
if errorlevel 1 exit /b 1

if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo Created .env from .env.example — edit it before running live research:
    echo   notepad .env
    echo Set CASES_DATABASE_URL, OPENAI_API_KEY, OPENAI_MODEL_*, BRAVE_API_KEY
  ) else (
    echo WARNING: no .env.example found
  )
)

echo.
echo Setup OK. Next:
echo   1^) notepad .env
echo   2^) run-worker.cmd
echo Or now:
echo   .venv\Scripts\python.exe -m research_worker worker
endlocal
