# ADR-007 - Uso temporal de Session ID opaco con cookie HttpOnly

## Fecha

2026-06-09

## Estado

Aprobado para PoC y desarrollo controlado

## Contexto

El proyecto `DDP Data Explorer` requiere proteger endpoints internos que exponen metadatos y vistas previas de datos empresariales.

La estrategia ideal consiste en usar una App Registration independiente para el Backend API, exponer scopes y validar Bearer Tokens emitidos específicamente para la API. Sin embargo, en esta fase no se cuenta con disponibilidad inmediata del equipo administrador para aprobar dicha configuración.

## Decisión

Se implementa temporalmente una estrategia de sesión backend basada en Session ID opaco y cookie `HttpOnly`.

## Flujo

1. El frontend autentica al usuario con Microsoft Entra ID mediante MSAL.js.
2. El frontend obtiene un ID Token emitido para la SPA.
3. El frontend envía el ID Token al backend mediante `POST /auth/session`.
4. FastAPI valida el ID Token contra Microsoft Entra ID.
5. FastAPI crea una sesión interna.
6. FastAPI devuelve una cookie `ddp_session` con `HttpOnly`.
7. Los endpoints sensibles requieren sesión activa.

## Controles aplicados

* Cookie `HttpOnly`.
* Session ID opaco.
* Validación de ID Token antes de crear sesión.
* Bloqueo de endpoints sensibles sin sesión.
* Encabezados `Cache-Control: no-store`.
* Enmascaramiento de datos sensibles desde backend.

## Ventajas

* Permite avanzar sin depender de aprobación inmediata de Backend API App Registration.
* Evita dejar la API abierta directamente.
* Impide que JavaScript lea la cookie de sesión.
* Reduce exposición de datos internos.
* Mantiene un camino de migración futuro hacia Bearer Token real.

## Limitaciones

* La sesión está en memoria del proceso.
* Al reiniciar FastAPI, las sesiones se pierden.
* En producción se debe usar Redis, base de datos o sesión centralizada.
* No reemplaza definitivamente el modelo recomendado de Backend API App Registration y validación de Bearer Token.

## Decisión futura

Cuando IT esté disponible, se recomienda evolucionar hacia:

```text
Frontend SPA + MSAL
→ Access Token para Backend API
→ FastAPI valida Bearer Token
→ Scopes, roles y grupos de Entra ID
```

## Estado final

Aprobado como solución temporal controlada para PoC y desarrollo local.
