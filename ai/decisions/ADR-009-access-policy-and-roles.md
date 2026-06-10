# ADR-009 - Política de acceso por lista y roles internos

## Fecha

2026-06-10

## Estado

Aprobado para PoC y desarrollo controlado

## Contexto

`DDP Data Explorer` permite consultar metadatos y vistas previas de datos empresariales. Aunque la herramienta ya cuenta con autenticación Microsoft Entra ID, no todos los usuarios autenticados deberían tener automáticamente acceso a la aplicación ni a todas sus funcionalidades.

Para esta fase, no se cuenta todavía con una integración completa de grupos, roles o scopes administrados directamente desde Microsoft Entra ID para el Backend API. Por esta razón, se implementa una política temporal de acceso controlada desde backend mediante listas de correos.

## Decisión

Se implementa una política de acceso basada en listas configurables desde variables de entorno.

La política puede estar activa o inactiva mediante:

```env
DDP_ACCESS_POLICY_ENABLED=true
```

Cuando la política está activa, solo los usuarios incluidos en alguna lista pueden crear sesión backend.

## Roles definidos

Se definen los siguientes roles internos:

```text
ADMIN
ANALYST
VIEWER
UNRESTRICTED
```

### ADMIN

Puede consultar:

* Resumen de base.
* Listado de tablas.
* Columnas.
* Vista previa de datos.
* Endpoints protegidos de exploración.

### ANALYST

Puede consultar:

* Resumen de base.
* Listado de tablas.
* Columnas.
* Vista previa de datos.

### VIEWER

Puede consultar:

* Resumen de base.
* Listado de tablas.

No puede consultar vista previa de datos.

### UNRESTRICTED

Rol usado cuando la política de acceso está desactivada. Permite operar la herramienta sin restricción interna de roles, siempre que el usuario haya autenticado correctamente con Microsoft.

## Variables de entorno

```env
DDP_ACCESS_POLICY_ENABLED=true
DDP_ADMIN_USERS=
DDP_ANALYST_USERS=
DDP_VIEWER_USERS=
```

Cada lista acepta correos separados por coma.

## Flujo

1. El usuario inicia sesión con Microsoft Entra ID.
2. El frontend envía el ID Token al backend.
3. El backend valida el token.
4. El backend extrae el correo del usuario.
5. El backend consulta las listas configuradas.
6. Si el usuario no está autorizado, no se crea sesión.
7. Si el usuario está autorizado, se crea sesión con el rol correspondiente.
8. Los endpoints protegidos validan el rol antes de responder.

## Ventajas

* Evita que cualquier usuario autenticado pueda usar la herramienta.
* Permite control simple por correo durante la PoC.
* No depende todavía de configuración avanzada de Entra ID.
* Permite probar escenarios de permisos.
* Refuerza la capa de gobierno de datos.
* Se puede apagar temporalmente con una variable de entorno.

## Limitaciones

* La gestión de usuarios se realiza manualmente en `.env`.
* No escala bien para muchos usuarios.
* No reemplaza grupos, roles o scopes administrados desde Entra ID.
* Requiere reinicio o recarga del backend al cambiar permisos.
* No tiene interfaz administrativa para administrar accesos.

## Decisión futura

Para producción, se recomienda migrar hacia uno de estos modelos:

```text
Microsoft Entra ID Groups
Microsoft Entra App Roles
Backend API Scopes
RBAC corporativo
```

El backend deberá validar permisos usando claims emitidos por Entra ID o consultando una fuente centralizada de autorización.

## Estado final

Aprobado como control temporal de acceso para PoC y desarrollo controlado.
