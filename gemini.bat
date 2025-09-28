@echo off

REM --- CONFIGURACIÓN ---
REM Directorio donde se ejecutará el script (no es necesario cambiar esto).
set "directorioRaiz=%~dp0"

REM Nombre de la carpeta de salida.
set "carpetaSalida=output"

REM Ruta completa de la carpeta de salida.
set "rutaSalida=%directorioRaiz%%carpetaSalida%"
REM ---------------------

echo.
echo Creando la carpeta de salida si no existe: %rutaSalida%
if not exist "%rutaSalida%" mkdir "%rutaSalida%"

echo.
echo Buscando archivos para convertir...
echo ========================================

REM Bucle recursivo que recorre todos los archivos en el directorio raíz y subdirectorios.
FOR /R "%directorioRaiz%" %%F IN (*.*) DO (
    
    REM Comprobamos que el archivo NO esté dentro de la propia carpeta de salida.
    REM Esto evita que el script se procese a sí mismo en un bucle infinito.
    echo "%%~dpF" | findstr /I /C:"%rutaSalida%\" >nul
    if not errorlevel 1 (
        REM Si el archivo está en la carpeta de salida, lo ignoramos.
        echo Ignorando archivo en la carpeta de salida: %%~nxF
    ) ELSE (
        REM El archivo no está en la carpeta de salida, lo procesamos.
        echo Procesando: "%%F"
        
        REM Copiamos el archivo a la carpeta de salida plana, cambiando su extensión a .txt
        COPY "%%F" "%rutaSalida%\%%~nF.txt"
    )
)

echo.
echo ========================================
echo Proceso completado.
echo Los archivos convertidos estan en la carpeta: %carpetaSalida%
echo.
pause