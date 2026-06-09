# ADR-001 - Uso de FastAPI como framework backend

## Fecha
2026-06-05

## Estado
Aprobado

## Contexto
El proyecto `DDP Data Explorer` requiere una API backend que permita consultar información empresarial de forma controlada, estructurada y documentada.

La solución necesita exponer endpoints para:
- Validar estado general de la API.
- Validar conexión a base de datos.
- Consultar esquemas y tablas.
- Consultar columnas.
- Consultar vistas previas de datos.
- Integrarse posteriormente con autenticación corporativa mediante Microsoft Entra ID.

Se evaluó la necesidad de contar con una tecnología backend flexible, rápida de implementar y compatible con buenas prácticas de documentación, validación y separación por capas.

## Decisión
Se decide utilizar **FastAPI** como framework backend principal para el desarrollo de la API.

## Justificación
FastAPI permite:
- Crear endpoints REST de forma clara y estructurada.
- Generar documentación automática mediante OpenAPI.
- Consultar la documentación interactiva desde `/docs`.
- Separar rutas, servicios, configuración y conexión a base de datos.
- Integrarse con autenticación Bearer Token en fases posteriores.
- Trabajar con modelos de validación mediante Pydantic.
- Ejecutarse localmente con Uvicorn.
- Prepararse para despliegues futuros en Azure App Service, Azure Functions, Azure Container Apps u otros entornos.

## Implementación actual
La API se ejecuta localmente mediante:

```powershell
python -m uvicorn app.main:app --reload