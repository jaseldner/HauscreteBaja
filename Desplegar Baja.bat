@echo off
title Desplegar Hauscrete Baja a la nube
cd /d "%~dp0"
REM Baja vive en su PROPIA cuenta de Fly. El token de esa cuenta esta en
REM fly-token.txt (una linea). Asi no hay que cambiar de login: Hauscrete
REM sigue con la cuenta de siempre y Baja usa la suya.
if not exist fly-token.txt (
  echo.
  echo   Falta el archivo fly-token.txt con el token de la cuenta de Fly de Baja.
  echo.
  pause
  exit /b 1
)
set /p FLY_API_TOKEN=<fly-token.txt
echo.
echo   Desplegando Hauscrete Baja ERP  ->  https://hauscrete-baja-erp.fly.dev
echo.
flyctl deploy --now
echo.
pause
