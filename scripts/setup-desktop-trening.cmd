@echo off
REM SPC — desktop trening: provera preduslova + pokretanje lokalnog stacka
setlocal
cd /d "%~dp0\.."

echo.
echo === SPC desktop trening — preduslovi ===
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo [X] Docker NIJE u PATH — instaliraj Docker Desktop i restartuj CMD.
  goto :fail
) else (
  echo [OK] docker
)

docker ps >nul 2>&1
if errorlevel 1 (
  echo [X] Docker daemon ne radi — pokreni Docker Desktop (zeleno Running).
  goto :fail
) else (
  echo [OK] docker ps
)

where node >nul 2>&1
if errorlevel 1 (
  echo [X] Node.js NIJE u PATH — instaliraj LTS sa nodejs.org
  goto :fail
) else (
  echo [OK] node
  node --version
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [X] npm nije dostupan
  goto :fail
) else (
  echo [OK] npm
)

echo.
echo === npm install ===
call npm install
if errorlevel 1 goto :fail

echo.
echo === supabase start (prvi put moze 5-20 min) ===
call npx supabase start
if errorlevel 1 (
  echo Ako supabase CLI nije globalan, koristi: npm install -g supabase
  goto :fail
)

echo.
echo === supabase status — sacuvaj anon key za .env.local ===
call npx supabase status

echo.
echo Dalje:
echo  1. copy .env.example .env.local
echo  2. U .env.local: VITE_SUPABASE_URL=http://127.0.0.1:54321 + anon key
echo  3. Migracije: scripts\primeni-migracije-lokalno.cmd
echo  4. npm run dev
echo.
echo Gotovo preduslove. Ne zatvaraj Docker.
goto :eof

:fail
echo.
echo Preduslovi nisu kompletirani. Ispravi gresku i pokreni ponovo.
exit /b 1
