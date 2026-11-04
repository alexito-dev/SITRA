@echo off
title SITRA - Sistema Integral de Tiempos de Atencion
chcp 65001 >nul
cls

echo ====================================================================
echo        SITRA - MONITOREO NACIONAL DE TIEMPOS DE ATENCION SUNAT
echo ====================================================================
echo  * Arquitectura: FastAPI 2.0 + React SPA (Vite / TypeScript)
echo  * 21 Intendencias de Tributos Internos y 93 Centros de Servicios
echo  * Acceso local: http://localhost:8080
echo ====================================================================
echo.

python run.py
pause
