@echo off
echo ========================================================
echo   Compilando Frontend React de SITRA (Vite + TypeScript)...
echo ========================================================
cd frontend
call npm run build
if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   Compilacion exitosa del frontend React.
    echo   Los archivos estaticos estan listos en: frontend\dist
    echo   El backend FastAPI servira automaticamente esta SPA.
    echo ========================================================
) else (
    echo.
    echo [ERROR] Ocurrio un problema durante la compilacion.
)
cd ..
pause
