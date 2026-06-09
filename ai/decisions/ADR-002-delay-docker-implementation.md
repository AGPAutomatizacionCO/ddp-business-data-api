# ADR-002 - Aplazamiento temporal de implementación con Docker

## Fecha
2026-06-05

## Estado
Aprobado

## Contexto
El proyecto `DDP Data Explorer` contempló inicialmente el uso de Docker para estandarizar el entorno de desarrollo y facilitar futuros despliegues.

Durante la configuración local se intentó instalar y ejecutar Docker Desktop con soporte WSL. Aunque Docker CLI y Docker Compose quedaron instalados, Docker Desktop presentó problemas al iniciar correctamente el engine.

Se evidenciaron errores asociados al entorno local de Docker Desktop y `dockerDesktopLinuxEngine`.

## Problema identificado
Docker no logró iniciar de forma estable en el equipo de desarrollo. Esto bloqueaba el avance de la PoC si se mantenía Docker como requisito obligatorio inmediato.

## Decisión
Se decide **aplazar temporalmente la implementación con Docker** y continuar el desarrollo local usando entorno virtual de Python.

## Justificación
La prioridad en esta fase es validar:
- Conexión a base de datos.
- Estructura de API FastAPI.
- Flujo frontend-backend.
- Autenticación con Microsoft Entra ID.
- Exploración controlada de tablas.
- Documentación de decisiones técnicas.
- Controles iniciales de seguridad.

Docker sigue siendo deseable, pero no debe bloquear la validación funcional de la PoC.

## Implementación temporal
El backend se ejecutará localmente mediante entorno virtual:

```powershell
cd backend
..\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload