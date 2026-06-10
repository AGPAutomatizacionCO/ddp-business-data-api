# ADR-008 - Auditoría básica de consultas

## Fecha

2026-06-09

## Estado

Aprobado para PoC y desarrollo controlado

## Contexto

`DDP Data Explorer` permite consultar metadatos y vistas previas de datos empresariales. Aunque los datos sensibles se enmascaran desde backend, sigue siendo necesario registrar quién consulta qué información, cuándo y desde dónde.

La trazabilidad es un elemento clave dentro de una estrategia de gobierno de datos, especialmente cuando se usan herramientas internas de exploración de información.

## Decisión

Se implementa una auditoría básica en archivo `.jsonl`.

Cada acción relevante queda registrada como una línea JSON independiente en:

```text
backend/logs/audit.jsonl
```

## Acciones auditadas

Actualmente se auditan consultas sobre:

* Base de datos actual.
* Listado de tablas.
* Listado de columnas.
* Columnas de una tabla específica.
* Vista previa de datos de una tabla.

## Información registrada

Cada evento de auditoría registra:

* Fecha y hora en UTC.
* Usuario autenticado.
* Acción realizada.
* Tipo de recurso.
* Nombre del recurso.
* Ruta consultada.
* Query params.
* IP del cliente.
* User-Agent.
* Detalles propios de la acción.

Para vistas previas de datos, se registra:

* Schema.
* Tabla.
* Rango solicitado.
* Registros retornados.
* Total de registros.
* Columnas sensibles detectadas.

## Consideraciones de seguridad

El archivo de auditoría puede contener información sensible de trazabilidad, como usuarios, rutas, tablas consultadas e IPs. Por esta razón, la carpeta de logs no debe subirse al repositorio.

Debe estar incluida en `.gitignore`:

```gitignore
backend/logs/
```

## Ventajas

* Agrega trazabilidad sin infraestructura adicional.
* Permite validar comportamiento durante la PoC.
* Facilita revisiones posteriores.
* Refuerza la capa de gobierno.
* Permite responder preguntas como quién consultó qué tabla y cuándo.

## Limitaciones

* El log está en archivo local.
* No hay retención controlada.
* No hay rotación automática.
* No hay visor administrativo.
* No hay búsqueda avanzada.
* No hay persistencia centralizada.
* En despliegues distribuidos, cada instancia tendría su propio log.

## Decisión futura

Para producción, la auditoría debe migrar a una solución más robusta, como:

* Base de datos dedicada de auditoría.
* Azure Application Insights.
* Azure Log Analytics.
* SIEM corporativo.
* Storage centralizado con retención definida.

## Estado final

Aprobado como mecanismo básico de trazabilidad para PoC.
