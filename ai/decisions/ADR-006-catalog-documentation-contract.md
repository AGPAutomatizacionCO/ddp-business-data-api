# ADR-006 — Contrato documental mínimo para objetos de catálogo

## Estado

Propuesto

## Contexto

DDP Data Explorer ya puede descubrir objetos técnicos de múltiples bases de datos y exponerlos mediante una API segura de metadata.

El siguiente paso es permitir que un agente de IA genere documentación estructurada a partir de esos objetos.

Para evitar documentación inconsistente, ambigua o difícil de revisar, se requiere un contrato mínimo común para toda ficha documental.

## Decisión

Se define un contrato documental mínimo llamado:

```text
Catalog Object Spec
```

Este contrato será usado para representar cada objeto técnico descubierto por la herramienta.

## Objetivo del contrato

El contrato debe permitir:

* Documentar objetos técnicos.
* Separar metadata técnica de interpretación funcional.
* Marcar claramente qué fue sugerido por IA.
* Registrar nivel de confianza.
* Exigir revisión humana.
* Preparar la documentación para ser consumida por otros agentes.
* Evitar que la IA apruebe o invente información oficial.

## Estructura general

Cada ficha documental debe contener:

```text
object_ref
technical_metadata
ai_documentation
governance
usage_guidance
```

## Estados documentales

Se adoptan los siguientes estados:

```text
DISCOVERED
AI_SUGGESTED
HUMAN_REVIEWED
APPROVED
DEPRECATED
UNKNOWN
```

## Regla de aprobación

La IA nunca puede establecer un objeto como `APPROVED`.

Solo una persona autorizada podrá aprobar documentación.

## Uso por agentes

Un agente documentador podrá generar fichas en estado `AI_SUGGESTED`.

Un agente consultor podrá usar fichas `APPROVED` como referencia principal.

Cuando use fichas `AI_SUGGESTED`, deberá informar que la clasificación no ha sido validada oficialmente.

## Consecuencias

Será necesario crear persistencia para almacenar fichas documentales.

Será necesario construir una vista de revisión humana.

Será necesario definir permisos por rol para aprobar, corregir o marcar objetos como obsoletos.

## Próximo paso técnico

Crear el modelo de persistencia para fichas documentales y el endpoint inicial para guardar sugerencias IA.
