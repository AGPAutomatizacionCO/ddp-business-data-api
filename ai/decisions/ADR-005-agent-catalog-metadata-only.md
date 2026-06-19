# ADR-005 — API de catálogo para agentes IA con alcance metadata_only

## Estado

Validado inicialmente

## Contexto

DDP Data Explorer ya cuenta con capacidad para descubrir bases, schemas y objetos internos de SQL Server. El siguiente paso es permitir que agentes de IA puedan usar esta información para generar documentación técnica y funcional.

Sin embargo, un agente IA no debe tener acceso directo a datos reales, consultas libres ni operaciones sobre bases productivas.

## Decisión

Se crea una API específica para agentes bajo el prefijo:

```text
/api/agent/catalog
```

Esta API expone únicamente metadata estructural documentable.

## Endpoints iniciales

```text
GET /api/agent/catalog/databases
GET /api/agent/catalog/databases/{database_id}/objects
GET /api/agent/catalog/databases/{database_id}/summary
GET /api/agent/catalog/snapshot
```

## Restricciones

La API debe declarar y cumplir la siguiente política:

```text
scope: metadata_only
data_preview_allowed: false
sql_execution_allowed: false
write_operations_allowed: false
human_validation_required: true
```

## Permitido

Los agentes pueden consultar:

* Bases configuradas.
* Nombre funcional de la fuente.
* Nombre real de base.
* Ambiente.
* Área de negocio configurada.
* Owner configurado.
* Objetos técnicos.
* Tipos de objeto.
* Schemas.
* Fechas de creación y modificación.
* Información de clasificación técnica.
* Estado documental inicial.

## No permitido

Los agentes no pueden:

* Consultar registros reales.
* Hacer preview de datos.
* Ejecutar SQL libre.
* Ejecutar procedimientos.
* Crear, modificar o eliminar objetos.
* Cambiar permisos.
* Aprobar documentación.
* Exponer credenciales.
* Tomar decisiones críticas sin validación humana.

## Resultado validado

La API respondió correctamente con 7 bases configuradas y 2125 objetos documentables.

## Consecuencia

Esta API queda como punto seguro de integración para un futuro agente documentador. La documentación generada por IA deberá almacenarse como sugerencia hasta revisión humana.

## Próximo paso

Definir la ficha documental mínima por objeto y el flujo de persistencia de documentación sugerida por IA.
