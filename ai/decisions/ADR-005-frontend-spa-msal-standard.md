# ADR-005 - Estándar frontend SPA con MSAL.js

## Estado
Aceptada

## Fecha
2026-06-04

## Contexto
Las soluciones digitales internas pueden consumir APIs, datos empresariales, servicios protegidos y recursos internos. Por seguridad, trazabilidad y mantenibilidad, los frontends deben autenticar usuarios corporativos antes de permitir acceso a funcionalidades o datos.

## Decisión
Todo desarrollo frontend en JavaScript deberá construirse como SPA e integrar MSAL.js para autenticación con Microsoft Entra ID cuando consuma APIs internas, datos empresariales o servicios protegidos.

## Alcance
Aplica para:
- Frontends JavaScript.
- Interfaces web internas.
- Consolas administrativas.
- Dashboards operativos personalizados.
- Herramientas de consulta o exploración de datos.
- Aplicaciones que consuman APIs internas.

## Regla técnica
Los frontends deberán:
- Usar arquitectura SPA.
- Integrar MSAL.js.
- Autenticar usuarios con Microsoft Entra ID.
- Obtener access tokens para consumir APIs protegidas.
- Enviar tokens mediante `Authorization: Bearer`.
- Centralizar llamadas API en un cliente común.
- Evitar credenciales, secretos o connection strings en el frontend.

## Exclusiones
Power Apps se gobierna mediante conectores, Power Automate, variables de entorno y Microsoft Entra ID según aplique. No usa MSAL.js directamente como un frontend JavaScript personalizado.

## Impacto
Las soluciones frontend quedarán preparadas para autenticación corporativa, control de acceso y consumo seguro de APIs.

## Pendientes
- Crear App Registration del frontend.
- Crear App Registration del backend API.
- Definir scopes.
- Validar tokens en FastAPI.
- Definir roles o grupos autorizados.