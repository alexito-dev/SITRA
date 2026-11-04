@echo off
echo ========================================================
echo   Compilando SITRA a ejecutable nativo (.exe)...
echo ========================================================
python -m PyInstaller --clean SITRA.spec
if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   Compilacion exitosa.
    echo   El ejecutable se encuentra en: dist\SITRA.exe
    echo ========================================================
) else (
    echo.
    echo [ERROR] Ocurrio un problema durante la compilacion.
)
pause
