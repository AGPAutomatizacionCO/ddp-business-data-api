# Human Review 004 - Refactor de cliente API frontend

## Fecha
2026-06-05

## Elemento revisado
Refactorización del consumo de API desde el frontend mediante `frontend/services/apiClient.js`.

## Resultado de la revisión
Aprobado.

## Cambios validados
- El archivo `apiClient.js` se carga correctamente antes de `app.js`.
- Las llamadas HTTP quedan centralizadas en `apiGet()`.
- `app.js` ya no depende de `API_BASE_URL`.
- Se corrigieron errores de ejecución provocados por declaraciones duplicadas.
- El dashboard vuelve a consultar y mostrar datos correctamente.

## Beneficio técnico
La arquitectura frontend queda más limpia y preparada para integrar autenticación con Microsoft Entra ID mediante MSAL.js.

## Riesgos identificados
- Los endpoints aún no están protegidos por autenticación.
- El frontend todavía puede consumir datos si la API está disponible localmente.
- Se requiere implementar validación de token en backend antes de considerar uso productivo.

## Decisión final
Se aprueba el refactor del consumo API como base para la siguiente fase de seguridad con MSAL.js y Microsoft Entra ID.