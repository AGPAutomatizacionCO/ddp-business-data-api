# Human Review 005 - Solicitud de aprobación Microsoft Entra ID

## Fecha

2026-06-05

## Elemento revisado

Integración inicial de autenticación Microsoft Entra ID mediante MSAL.js para el proyecto `DDP Data Explorer`.

## Resultado de la revisión

Aprobado para continuar, sujeto a aprobación administrativa.

## Evidencia

El flujo de autenticación redirigió correctamente al login corporativo de Microsoft Entra ID. Posteriormente, Microsoft solicitó aprobación administrativa para la aplicación:

`AGP DDP Data Explorer - Backend API - DEV`

## Decisiones tomadas

* Mantener Microsoft Entra ID como mecanismo de autenticación corporativa.
* Mantener MSAL.js como estándar para frontends JavaScript tipo SPA.
* Solicitar aprobación administrativa para continuar con el flujo de autenticación.
* No avanzar a uso productivo hasta validar autenticación, autorización y protección de endpoints.

## Riesgos identificados

* La aplicación aún no cuenta con aprobación administrativa.
* Los endpoints del backend todavía no validan tokens Bearer.
* El sistema no debe exponerse a usuarios finales sin control de acceso completo.
* La aprobación debe ser gestionada por IT o administrador de Microsoft Entra ID.

## Decisión final

La integración inicial con Microsoft Entra ID queda validada técnicamente hasta el punto de solicitud de aprobación. Se debe esperar la aprobación administrativa para continuar con la protección del backend.
