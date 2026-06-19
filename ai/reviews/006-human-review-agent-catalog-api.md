# Revisión humana pendiente — Agent Catalog API

## Objetivo

Validar si la API de catálogo para agentes IA cumple las restricciones de seguridad y gobierno antes de permitir que un agente documental la utilice de forma recurrente.

## Elementos validados técnicamente

* El endpoint `/api/agent/catalog/databases` responde correctamente.
* El endpoint `/api/agent/catalog/databases/{database_id}/objects` responde correctamente.
* El endpoint `/api/agent/catalog/snapshot` responde correctamente.
* La respuesta declara `scope: metadata_only`.
* La respuesta bloquea preview de datos para agentes.
* La respuesta bloquea ejecución SQL.
* La respuesta bloquea operaciones de escritura.
* El catálogo consolidado retorna 2125 objetos documentables.

## Puntos a revisar por humano

### 1. Seguridad

Confirmar que ningún endpoint bajo `/api/agent/catalog` devuelva registros reales de tablas o vistas.

### 2. Clasificación

Confirmar que los tipos de objeto se están clasificando correctamente:

* TABLE
* VIEW
* PROCEDURE
* FUNCTION
* TRIGGER
* CONSTRAINT
* SYNONYM
* SEQUENCE
* OTHER

### 3. Nombres funcionales

Validar que el `label` visible para usuarios y agentes represente correctamente el nombre funcional de negocio.

Ejemplo:

```text
Label: DataFactory
Database real: Comercial
```

### 4. Metadata sensible

Confirmar si se debe exponer o no el nombre de columnas sensibles a agentes documentales.

Estado actual recomendado:

```text
No exponer valores reales.
Exponer solo indicadores o conteos de sensibilidad.
```

### 5. Uso por agentes

Confirmar que los agentes usarán esta API solo para documentación y no para responder con datos operativos.

## Decisión pendiente

Aprobar o ajustar la API como fuente segura para un agente documental de catálogo de datos.

## Estado

Pendiente de revisión humana.
