@echo off
title SITRA - Sistema de Monitoreo Nacional SUNAT
color 0B
cls
echo ====================================================================
echo      SUNAT - SISTEMA INTEGRAL DE TIEMPOS DE ATENCION (SITRA)
echo                     DESPLIEGUE EN RED LOCAL
echo ====================================================================
echo.
echo  Detectando direccion IP de la maquina en la red local...

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" /c:"Direcci" 2^>nul') do (
    set IP_DETECTADA=%%a
    goto :encontrada
)

:encontrada
set IP_DETECTADA=%IP_DETECTADA: =%
echo.
echo  ====================================================================
echo    [+] ENLACE PARA COMPARTIR EN LA OFICINA / RED LOCAL / VPN:
echo.
echo        http://%IP_DETECTADA%:8080/nacional
echo.
echo    [+] ACCESO EN ESTA COMPUTADORA:
echo.
echo        http://localhost:8080/nacional
echo  ====================================================================
echo.
echo  Iniciando servidor SITRA...
echo  (Presione Ctrl + C para detener el servidor)
echo.

python run.py
pause
