# DDP Data Explorer — Estado funcional actual

## Propósito

DDP Data Explorer es una herramienta interna para explorar estructuras de bases de datos empresariales de forma controlada, autenticada y trazable.

La herramienta permite identificar bases, esquemas, tablas, vistas, procedimientos, funciones, triggers, restricciones y otros objetos técnicos sin depender inicialmente de documentación manual existente.

## Alcance actual

Actualmente la herramienta permite:

* Autenticación corporativa mediante Microsoft Entra ID.
* Validación de sesión segura entre frontend y backend.
* Conexión a múltiples bases de datos configuradas.
* Exploración de bases, esquemas y objetos.
* Clasificación técnica de objetos SQL Server.
* Búsqueda global sobre objetos cargados.
* Vista previa controlada para tablas y vistas cuando aplica.
* Visualización de contenido o metadata del objeto seleccionado.
* Identificación inicial de objetos sensibles o con columnas marcadas.
* Manejo de errores por sesión, permisos, conexión y backend.

## Tipos de objetos reconocidos

La herramienta reconoce actualmente los siguientes tipos:

| Código SQL Server | Descripción SQL Server           | Clasificación en la herramienta |
| ----------------- | -------------------------------- | ------------------------------- |
| U                 | USER_TABLE                       | Tabla                           |
| V                 | VIEW                             | Vista                           |
| P                 | SQL_STORED_PROCEDURE             | Procedimiento                   |
| FN                | SQL_SCALAR_FUNCTION              | Función                         |
| IF                | SQL_INLINE_TABLE_VALUED_FUNCTION | Función                         |
| TF                | SQL_TABLE_VALUED_FUNCTION        | Función                         |
| TR                | SQL_TRIGGER                      | Trigger                         |
| PK                | PRIMARY_KEY_CONSTRAINT           | Restricción                     |
| D                 | DEFAULT_CONSTRAINT               | Restricción                     |
| C                 | CHECK_CONSTRAINT                 | Restricción                     |
| F                 | FOREIGN_KEY_CONSTRAINT           | Restricción                     |
| SN                | SYNONYM                          | Sinónimo                        |
| SO                | SEQUENCE_OBJECT                  | Secuencia                       |
| Otros             | No clasificado                   | Otro objeto                     |

## Regla importante sobre nombres

La herramienta diferencia entre:

* `label`: nombre funcional visible para el usuario.
* `database`: nombre real de la base en SQL Server.
* `id`: identificador interno usado por la aplicación.

Ejemplo validado:

```text
Label funcional: DataFactory
Base real SQL Server: Comercial
Servidor: 192.168.2.23
Objeto validado: dbo.VW_CAMBIOESTADO
Tipo: VIEW
```

Esto evita confundir nombres de negocio con nombres técnicos reales.

## Limitaciones actuales

* Algunas vistas pueden ser consultables, pero no exponer definición SQL.
* `OBJECT_DEFINITION` puede retornar `NULL` por permisos o configuración del objeto.
* `sp_helptext` puede indicar que no existe texto aunque el objeto sea consultable.
* Las restricciones como PK, FK, DEFAULT y CHECK requieren consultas específicas para documentar su detalle.
* La clasificación semántica por área de negocio aún no existe.
* La documentación funcional por objeto aún no está implementada.
* La API específica para agentes IA está planteada, pero queda pausada.

## Estado antes de agentes IA

Antes de habilitar una API para agentes IA, el sistema debe cerrar:

1. Catálogo técnico estable.
2. Validación de conexiones contra bases reales.
3. Clasificación correcta de objetos SQL Server.
4. Separación clara entre metadata y datos reales.
5. Ficha documental mínima por objeto.
6. Reglas de revisión humana para documentación generada por IA.
