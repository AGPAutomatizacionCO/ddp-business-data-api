# ADR-006 - Enmascaramiento de datos sensibles desde backend

## Fecha

2026-06-05

## Estado

Aprobado para implementación

## Contexto

El proyecto `DDP Data Explorer` permite explorar esquemas, tablas y vistas previas de datos de una base empresarial. Durante las pruebas se identificó que algunas tablas pueden contener columnas sensibles, por ejemplo correos electrónicos o hashes de contraseña.

Aunque el frontend puede marcar visualmente estas columnas, esto no protege realmente la información si los valores sensibles ya fueron enviados al navegador.

## Decisión

El enmascaramiento de datos sensibles debe realizarse en el backend antes de enviar la respuesta al frontend.

## Implementación esperada

La función `is_sensitive_column()` será usada para identificar columnas sensibles con base en `SENSITIVE_KEYWORDS`.

En la respuesta de listado de tablas, cada tabla deberá incluir:

```json
{
  "schema_name": "core",
  "table_name": "PROY_USERS",
  "has_sensitive_data": true,
  "sensitive_columns_count": 3,
  "sensitive_columns": ["email", "password_hash", "initials"]
}
```

En la respuesta de vista previa, los valores sensibles deberán ser reemplazados por un valor seguro:

```json
{
  "email": "***",
  "password_hash": "***",
  "full_name": "Nombre visible si no se clasifica como sensible"
}
```

## Consecuencias

### Positivas

* Reduce exposición de datos sensibles.
* Permite seguir usando la herramienta para exploración controlada.
* Mejora cumplimiento de gobierno de datos.
* Evita depender únicamente del frontend para proteger información.

### Consideraciones

* La detección basada en nombres de columnas no es perfecta.
* La lista `SENSITIVE_KEYWORDS` deberá revisarse y ampliarse.
* En fases futuras se deberán incorporar roles, permisos, auditoría y validación de Bearer Token.

## Próximo paso

Modificar `get_tables()` y `get_table_preview()` en `database_service.py` para aplicar la detección y el enmascaramiento de columnas sensibles.
