# Estado actual de arquitectura - DDP Data Explorer

## 1. Resumen general

`DDP Data Explorer` es una aplicación interna para explorar de forma controlada metadatos y vistas previas de datos empresariales.

La solución actual funciona como una PoC segura en entorno local, utilizando:

* FastAPI como backend.
* Frontend estático servido por FastAPI.
* Microsoft Entra ID para autenticación.
* MSAL.js en el frontend.
* Sesión backend con Session ID opaco.
* Cookie `HttpOnly`.
* Auditoría básica en archivo `.jsonl`.
* Enmascaramiento de datos sensibles desde backend.

## 2. Flujo actual de autenticación

El flujo implementado es el siguiente:

1. El usuario entra al frontend desde `http://localhost:8000`.
2. El usuario inicia sesión con Microsoft mediante MSAL.js.
3. El frontend obtiene un ID Token de Microsoft Entra ID.
4. El frontend envía el ID Token al backend mediante `POST /auth/session`.
5. FastAPI valida el ID Token contra Microsoft Entra ID.
6. Si el token es válido, FastAPI crea una sesión interna.
7. FastAPI entrega una cookie `ddp_session` con `HttpOnly`.
8. Los endpoints protegidos validan la sesión antes de responder datos.

## 3. Sesión backend

La sesión backend utiliza un Session ID opaco.

Esto significa que la cookie no contiene datos del usuario, claims, roles ni información sensible. Solo contiene un identificador aleatorio.

Los datos reales de la sesión se almacenan del lado del backend.

### Configuración actual

* Cookie: `ddp_session`
* Tipo: Session ID opaco
* HttpOnly: sí
* SameSite: Lax
* Secure: false en local
* Almacenamiento de sesión: memoria del proceso FastAPI

### Consideración para producción

En producción, `Secure` debe ser `true` y las sesiones no deben almacenarse en memoria. Deben moverse a Redis, base de datos o un mecanismo centralizado de sesiones.

## 4. Endpoints protegidos

Los endpoints protegidos actualmente son:

* `/api/database/*`
* `/health/db`
* `/health/summary`

Estos endpoints requieren:

1. Sesión backend válida.
2. Header interno del frontend: `X-DDP-Client: web`.

El header `X-DDP-Client` se utiliza como barrera práctica para evitar navegación directa casual por URL. No reemplaza la autorización real.

## 5. Endpoints públicos

El endpoint público actual es:

* `/health`

Este endpoint solo indica que la API está viva. No expone información sensible de base de datos.

## 6. CORS

La aplicación actualmente opera principalmente en mismo origen:

* Frontend: `http://localhost:8000`
* Backend: `http://localhost:8000`

Se configuró CORS restrictivo para preparar la futura migración a React/Vite.

Orígenes permitidos:

* `http://localhost:8000`
* `http://localhost:5173`

No se usa `allow_origins=["*"]`, ya que la aplicación trabaja con cookies y credenciales.

## 7. Auditoría

Se implementó auditoría básica en archivo `.jsonl`.

Ruta actual:

```text
backend/logs/audit.jsonl
```

Cada acción auditada registra:

* Fecha UTC.
* Usuario autenticado.
* Acción realizada.
* Recurso consultado.
* Endpoint.
* Query params.
* IP.
* User-Agent.
* Detalles de consulta, como schema, tabla, rango y registros retornados.

Los logs no deben subirse al repositorio.

## 8. Enmascaramiento de datos sensibles

El backend detecta columnas potencialmente sensibles mediante palabras clave.

Cuando una columna se considera sensible, su valor en la vista previa se reemplaza por:

```text
***
```

Esto se hace desde backend, no desde frontend.

Por tanto, aunque un usuario inspeccione la respuesta de red, no recibe el valor sensible original.

## 9. Archivos principales

### Backend

* `backend/app/main.py`
* `backend/app/core/config.py`
* `backend/app/core/session.py`
* `backend/app/core/request_guard.py`
* `backend/app/api/routes/auth_routes.py`
* `backend/app/api/routes/database_routes.py`
* `backend/app/api/routes/health_routes.py`
* `backend/app/services/database_service.py`
* `backend/app/services/audit_service.py`

### Frontend

* `frontend/index.html`
* `frontend/styles/main.css`
* `frontend/auth/msalConfig.js`
* `frontend/auth/authService.js`
* `frontend/services/apiClient.js`
* `frontend/js/app.js`
* `frontend/js/health.js`
* `frontend/js/tables.js`
* `frontend/js/preview.js`

## 10. Validaciones realizadas

Se validó que:

* El login con Microsoft funciona.
* El backend crea la cookie `ddp_session`.
* La cookie es `HttpOnly`.
* `document.cookie` no puede leer `ddp_session`.
* La API bloquea acceso sin sesión.
* La navegación directa casual queda bloqueada con `X-DDP-Client`.
* La app web sí puede consumir los endpoints protegidos.
* Los datos sensibles se enmascaran desde backend.
* La auditoría registra acciones en `audit.jsonl`.
* El frontend carga estilos correctamente.
* CORS restrictivo no rompe el funcionamiento actual.

## 11. Limitaciones actuales

La solución actual sigue siendo una PoC. Sus principales limitaciones son:

* Las sesiones se almacenan en memoria.
* Al reiniciar FastAPI, las sesiones se pierden.
* El header `X-DDP-Client` no es una barrera de seguridad fuerte.
* No hay todavía roles, grupos o permisos por usuario.
* No hay auditoría persistente en base de datos.
* No hay visor administrativo de auditoría.
* No hay despliegue productivo con HTTPS.
* No se ha migrado aún a React/Vite.

## 12. Ruta recomendada

Los próximos pasos recomendados son:

1. Documentar ADR de sesión opaca.
2. Documentar ADR de auditoría básica.
3. Validar Git y subir cambios.
4. Mejorar control de errores visuales.
5. Definir roles o niveles de acceso.
6. Migrar frontend a React/Vite.
7. Mover sesiones a Redis o base de datos.
8. Evolucionar hacia Backend API App Registration con Bearer Token real.
