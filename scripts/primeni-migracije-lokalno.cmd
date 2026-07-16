@echo off
REM Primenjuje sve *.sql migracije na lokalni supabase_db_* kontejner
setlocal EnableDelayedExpansion
cd /d "%~dp0\.."

for /f "tokens=*" %%c in ('docker ps --format "{{.Names}}" ^| findstr /i "supabase_db"') do set DB=%%c
if not defined DB (
  echo Nema supabase_db kontejnera. Pokreni: npx supabase start
  exit /b 1
)

echo Koristim kontejner: %DB%
echo.

for %%f in (*.sql) do (
  echo === %%f ===
  docker exec -i %DB% psql -U postgres -d postgres < "%%f"
  if errorlevel 1 echo [!] Upozorenje na %%f — proveri izlaz
)

echo.
echo Migracije zavrsene. Otvori Studio http://127.0.0.1:54323 za Auth user.
