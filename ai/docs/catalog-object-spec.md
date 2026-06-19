# Catalog Object Spec — DDP Data Explorer

## Propósito

Este documento define la ficha documental mínima que debe existir para cada objeto técnico descubierto por DDP Data Explorer.

La ficha permite convertir metadata técnica de bases de datos en documentación estructurada, revisable y utilizable por agentes de IA sin exponer datos reales.

## Alcance

Aplica para objetos detectados en bases de datos configuradas, incluyendo:

* Tablas.
* Vistas.
* Procedimientos almacenados.
* Funciones.
* Triggers.
* Restricciones.
* Sinónimos.
* Secuencias.
* Otros objetos técnicos.

## Principio rector

La documentación generada por IA no se considera oficial hasta ser revisada y aprobada por una persona autorizada.

La IA puede sugerir, clasificar y resumir, pero no aprobar.

---

## Modelo mínimo de ficha documental

Cada objeto documentable debe tener una ficha con la siguiente estructura:

```json
{
  "catalog_spec_version": "1.0",
  "object_ref": {
    "database_id": "",
    "database_label": "",
    "database_name": "",
    "environment": "",
    "schema": "",
    "object_name": "",
    "full_name": "",
    "object_type": "",
    "object_type_label": ""
  },
  "technical_metadata": {
    "sql_type": "",
    "sql_type_description": "",
    "family": "",
    "family_label": "",
    "created_at": "",
    "modified_at": "",
    "has_sql_definition": false,
    "has_sensitive_data": false,
    "sensitive_columns_count": 0
  },
  "ai_documentation": {
    "suggested_title": "",
    "suggested_description": "",
    "suggested_business_domain": "",
    "suggested_business_area": "",
    "suggested_process": "",
    "suggested_keywords": [],
    "suggested_owner_team": "",
    "confidence": "low | medium | high",
    "reasoning_summary": "",
    "requires_human_review": true
  },
  "governance": {
    "documentation_status": "DISCOVERED",
    "approved_by": null,
    "approved_at": null,
    "review_notes": null
  },
  "usage_guidance": {
    "can_be_used_for_reporting": null,
    "can_be_used_for_operations": null,
    "known_consumers": [],
    "known_limitations": []
  }
}
```

---

## Campos obligatorios

Los siguientes campos deben existir siempre:

```text
catalog_spec_version
object_ref.database_id
object_ref.database_label
object_ref.database_name
object_ref.schema
object_ref.object_name
object_ref.full_name
object_ref.object_type
technical_metadata.sql_type
technical_metadata.sql_type_description
governance.documentation_status
```

---

## Estados documentales

| Estado         | Descripción                                       |
| -------------- | ------------------------------------------------- |
| DISCOVERED     | Objeto detectado automáticamente.                 |
| AI_SUGGESTED   | La IA generó una propuesta documental.            |
| HUMAN_REVIEWED | Una persona revisó la documentación.              |
| APPROVED       | Documentación aprobada como referencia oficial.   |
| DEPRECATED     | Objeto marcado como obsoleto o no recomendado.    |
| UNKNOWN        | No existe información suficiente para clasificar. |

---

## Niveles de confianza IA

| Nivel  | Uso                                                                                 |
| ------ | ----------------------------------------------------------------------------------- |
| high   | El nombre del objeto, columnas y contexto técnico permiten una clasificación clara. |
| medium | Hay señales suficientes, pero requiere revisión.                                    |
| low    | La IA solo puede inferir de forma débil o ambigua.                                  |

---

## Reglas para documentación generada por IA

La IA debe:

* Usar únicamente metadata técnica permitida.
* No inventar owners, áreas o procesos.
* Marcar inferencias como sugeridas.
* Indicar nivel de confianza.
* Solicitar revisión humana cuando la clasificación no sea evidente.
* No consultar registros reales.
* No ejecutar SQL.
* No aprobar documentación.

La IA no debe:

* Afirmar como oficial una clasificación no validada.
* Usar datos reales de tablas.
* Inferir contenido sensible a partir de nombres ambiguos.
* Recomendar uso productivo de un objeto sin validación.
* Modificar permisos, bases, objetos o documentación aprobada.

---

## Ejemplo

```json
{
  "catalog_spec_version": "1.0",
  "object_ref": {
    "database_id": "comercial",
    "database_label": "DataFactory",
    "database_name": "Comercial",
    "environment": "production",
    "schema": "dbo",
    "object_name": "VW_CAMBIOESTADO",
    "full_name": "dbo.VW_CAMBIOESTADO",
    "object_type": "VIEW",
    "object_type_label": "Vista"
  },
  "technical_metadata": {
    "sql_type": "V",
    "sql_type_description": "VIEW",
    "family": "DATA",
    "family_label": "Datos",
    "created_at": "2022-11-30T16:25:14",
    "modified_at": "2025-08-08T11:08:16",
    "has_sql_definition": false,
    "has_sensitive_data": false,
    "sensitive_columns_count": 0
  },
  "ai_documentation": {
    "suggested_title": "Vista de cambios de estado",
    "suggested_description": "Objeto probablemente relacionado con el seguimiento de cambios de estado en procesos comerciales u operativos.",
    "suggested_business_domain": "Comercial / Operaciones",
    "suggested_business_area": "DataFactory",
    "suggested_process": "Seguimiento de estados",
    "suggested_keywords": [
      "cambio",
      "estado",
      "seguimiento",
      "operación"
    ],
    "suggested_owner_team": null,
    "confidence": "medium",
    "reasoning_summary": "La inferencia se basa únicamente en el nombre técnico del objeto y su clasificación como vista.",
    "requires_human_review": true
  },
  "governance": {
    "documentation_status": "AI_SUGGESTED",
    "approved_by": null,
    "approved_at": null,
    "review_notes": null
  },
  "usage_guidance": {
    "can_be_used_for_reporting": null,
    "can_be_used_for_operations": null,
    "known_consumers": [],
    "known_limitations": [
      "La definición SQL no está disponible para el usuario actual."
    ]
  }
}
```
