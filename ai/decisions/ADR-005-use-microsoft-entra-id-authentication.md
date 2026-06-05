# ADR-005 - Uso de Microsoft Entra ID para autenticación

## Estado
Aceptada

## Fecha
2026-06-04

## Contexto
La herramienta permite explorar metadatos y vistas previas de información de bases de datos empresariales. Aunque actualmente se ejecuta en entorno local, los endpoints pueden exponer estructura y datos controlados de la base.

## Decisión
Se implementará una capa de autenticación basada en Microsoft Entra ID para controlar el acceso de usuarios corporativos.

## Alcance inicial
- Login Microsoft en frontend mediante MSAL.js.
- Protección visual del frontend para usuarios no autenticados.
- Validación de access token en FastAPI.
- Endpoints públicos limitados a `/` y `/health`.
- Endpoints de datos protegidos mediante Bearer Token.

## Herramientas
- Microsoft Entra ID
- App Registration para frontend
- App Registration para backend API
- MSAL.js
- JWT validation en FastAPI

## Impacto
Ningún usuario podrá consultar esquemas, tablas, columnas o vistas previas sin autenticación corporativa válida.

## Pendientes
- Definir tenant ID.
- Crear app registration del frontend.
- Crear app registration del backend.
- Exponer scope de API.
- Definir roles o grupos autorizados.
- Implementar validación de token en backend.