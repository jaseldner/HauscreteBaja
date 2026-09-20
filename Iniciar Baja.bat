@echo off
title Hauscrete Baja ERP
cd /d "%~dp0"
echo.
echo   Iniciando Hauscrete Baja ERP...
echo   Abriendo http://localhost:3200 en tu navegador.
echo   Deja esta ventana abierta mientras usas el sistema. Cierrala para apagarlo.
echo.
start "" http://localhost:3200
node server.mjs
pause
