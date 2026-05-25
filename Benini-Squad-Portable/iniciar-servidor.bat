@echo off
cd /d "%~dp0"
set PORT=8080
echo Benini Squad — http://localhost:%PORT%/
echo Pressione Ctrl+C para encerrar.

where python >nul 2>&1
if %ERRORLEVEL%==0 (
  start "" "http://localhost:%PORT%/"
  python -m http.server %PORT%
  exit /b 0
)

where py >nul 2>&1
if %ERRORLEVEL%==0 (
  start "" "http://localhost:%PORT%/"
  py -m http.server %PORT%
  exit /b 0
)

echo Instale Python 3 para iniciar o servidor local.
pause
