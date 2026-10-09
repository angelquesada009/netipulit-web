@echo off
REM ============================================================
REM  Arranca la web de Netipulit en http://localhost:3000
REM  Doble clic en este archivo. Para pararla: cierra esta ventana.
REM ============================================================
cd /d "%~dp0"
title Netipulit - servidor en localhost:3000

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js no esta instalado en este ordenador.
  echo  Descarga la version LTS de https://nodejs.org, instalala
  echo  y vuelve a hacer doble clic en este archivo.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias, solo la primera vez...
  call npm install
  if errorlevel 1 ( pause & exit /b 1 )
)

REM Abre el navegador 3 segundos despues, cuando el servidor ya este listo
start "" /min cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

call npm run dev
pause
