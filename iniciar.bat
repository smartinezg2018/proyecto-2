@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Gestion de Edificios - Entorno local

rem Ir a la carpeta donde esta este .bat (raiz del proyecto)
cd /d "%~dp0"

echo ============================================================
echo   Gestion de Edificios - Arranque local (ver docs\DATOS_PRUEBA.md)
echo ============================================================
echo.

rem --- 0. Verificaciones previas ---------------------------------------------
where docker >nul 2>&1 || (echo [ERROR] Docker no esta instalado o no esta en el PATH. & goto :fail)
where npm.cmd >nul 2>&1 || (echo [ERROR] Node.js/npm no esta instalado o no esta en el PATH. & goto :fail)

docker info >nul 2>&1 || (echo [ERROR] Docker Desktop no esta corriendo. Inicialo y vuelve a ejecutar este archivo. & goto :fail)

if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] No existe .env, se crea a partir de .env.example
        copy /y ".env.example" ".env" >nul
    ) else (
        echo [ERROR] Falta el archivo .env en la raiz del proyecto.
        goto :fail
    )
)

rem --- Dependencias (solo si faltan) -------------------------------------------
if not exist "node_modules" (
    echo [INFO] Instalando dependencias de la raiz...
    call npm.cmd install || goto :fail
)
if not exist "apps\api\node_modules" (
    echo [INFO] Instalando dependencias de la API...
    call npm.cmd install --prefix apps/api || goto :fail
)
if not exist "apps\web\node_modules" (
    echo [INFO] Instalando dependencias del frontend...
    call npm.cmd install --prefix apps/web || goto :fail
)

rem --- 1. Levantar MySQL ------------------------------------------------------
echo.
echo [1/4] Levantando MySQL en Docker...
docker compose up -d mysql || goto :fail

echo       Esperando a que MySQL este "healthy"...
set /a INTENTOS=0
:wait_mysql
set "ESTADO="
for /f "delims=" %%s in ('docker inspect --format "{{.State.Health.Status}}" building-management-mysql 2^>nul') do set "ESTADO=%%s"
if /i "%ESTADO%"=="healthy" goto :mysql_ok
set /a INTENTOS+=1
if %INTENTOS% GEQ 40 (
    echo [ERROR] MySQL no quedo healthy despues de ~2 minutos. Estado actual: %ESTADO%
    goto :fail
)
timeout /t 3 /nobreak >nul
goto :wait_mysql
:mysql_ok
echo       MySQL listo.

rem --- 2. Migraciones ---------------------------------------------------------
echo.
echo [2/4] Aplicando migraciones...
call npm.cmd run db:migrate || goto :fail

rem --- 3. Seeds ---------------------------------------------------------------
echo.
echo [3/4] Cargando datos semilla (idempotente)...
call npm.cmd run db:seed || goto :fail

rem --- 4. Iniciar la aplicacion -----------------------------------------------
echo.
echo ============================================================
echo   Usuarios de prueba  (http://localhost:3000)
echo ------------------------------------------------------------
echo   admin@example.com      Admin123!      Administrador general
echo   edificio@example.com   Edificio123!   Administrador de edificio
echo   auditor@example.com    Auditor123!    Auditor
echo   operador@example.com   Operador123!   Operador
echo   inactivo@example.com   Inactivo123!   Operador (inactivo)
echo ============================================================
echo.
echo [4/4] Iniciando API (puerto 5000) y Web (puerto 3000)...
echo       Presiona Ctrl+C para detener.
echo.

rem Abrir el navegador unos segundos despues de que arranque Vite
start "" cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000"

call npm.cmd run dev
goto :eof

:fail
echo.
echo El arranque se detuvo por un error.
pause
exit /b 1
