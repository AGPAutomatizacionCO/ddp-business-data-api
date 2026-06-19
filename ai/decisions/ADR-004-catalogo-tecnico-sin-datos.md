# ADR-004 — Catálogo técnico sin acceso a datos reales

## Estado

Propuesto / En implementación

## Contexto

DDP Data Explorer permite consultar estructuras de bases de datos empresariales. Durante el desarrollo se identificó la necesidad de que futuros agentes de IA puedan usar la herramienta para generar documentación técnica y funcional sobre fuentes de datos.

Sin embargo, permitir que un agente consulte datos reales representa riesgos de seguridad, privacidad, exposición de información sensible y pérdida de control sobre el uso de las bases.

## Decisión

Los agentes de IA no deberán conectarse directamente a SQL Server ni ejecutar consultas libres.

Los agentes solo podrán consumir una capa controlada de catálogo técnico que exponga metadata estructural, no contenido de negocio.

## Permitido para agentes

* Listar bases configuradas.
* Listar esquemas.
* Listar tablas.
* Listar vistas.
* Listar procedimientos.
* Listar funciones.
* Listar triggers.
* Listar restricciones.
* Consultar columnas y tipos de dato.
* Consultar fechas de creación/modificación.
* Consultar clasificación técnica.
* Generar documentación sugerida.
* Marcar nivel de confianza de una clasificación.

## No permitido para agentes

* Ejecutar SQL libre.
* Hacer `SELECT *`.
* Consultar registros reales.
* Ejecutar procedimientos.
* Modificar datos.
* Crear, alterar o eliminar objetos.
* Aprobar documentación.
* Conceder permisos.
* Exponer credenciales.
* Tomar decisiones críticas sin validación humana.

## Consecuencias

La herramienta debe separar claramente los endpoints de usuario y los endpoints para agentes.

La documentación generada por IA debe quedar en estado sugerido hasta revisión humana.

## Estados documentales sugeridos

* `DISCOVERED`: objeto detectado automáticamente.
* `AI_SUGGESTED`: documentación sugerida por IA.
* `HUMAN_REVIEWED`: revisado por humano.
* `APPROVED`: aprobado como documentación oficial.
* `DEPRECATED`: objeto obsoleto o no recomendado.
* `UNKNOWN`: sin información suficiente.

## Resultado esperado

La IA podrá ayudar a documentar estructuras internas sin consultar datos reales ni comprometer la seguridad de la información.
