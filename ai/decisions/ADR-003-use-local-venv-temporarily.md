# ADR-003 - Uso temporal de entorno virtual local de Python

## Fecha
2026-06-05

## Estado
Aprobado

## Contexto
Debido al aplazamiento temporal de Docker, el proyecto requiere una forma estable de ejecutar el backend FastAPI en ambiente local.

La alternativa seleccionada es usar un entorno virtual de Python para aislar dependencias y permitir ejecución local controlada.

## Decisión
Se decide utilizar temporalmente un entorno virtual local de Python (`.venv`) para ejecutar el backend del proyecto.

## Justificación
El entorno virtual permite:
- Aislar dependencias del proyecto.
- Evitar conflictos con instalaciones globales de Python.
- Instalar paquetes necesarios para FastAPI, Uvicorn, pyodbc y configuración.
- Mantener un flujo local funcional mientras Docker se estabiliza.
- Facilitar pruebas rápidas durante la PoC.

## Implementación
El entorno virtual se ubica en la raíz del proyecto:

```text
ddp-business-data-api/
├── .venv/
├── backend/
└── frontend/