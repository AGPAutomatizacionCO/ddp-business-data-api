# Revisión pendiente — Data Catalog / DDP Data Explorer

## Objetivo

Registrar los puntos que requieren validación humana antes de considerar estable el catálogo técnico y antes de habilitar agentes de IA para documentación automática.

## Puntos por revisar

### 1. Conexiones

Validar que cada conexión del `.env` tenga:

* ID interno correcto.
* Label funcional claro.
* Nombre real de base correcto.
* Servidor correcto.
* Ambiente correcto.
* Owner o responsable si existe.

### 2. Diferencia entre label y base real

Confirmar casos donde el negocio usa un nombre diferente al nombre técnico de la base.

Ejemplo:

```text
Label: DataFactory
Base real: Comercial
```

### 3. Clasificación de objetos

Validar que los siguientes tipos estén correctamente clasificados:

* USER_TABLE → Tabla.
* VIEW → Vista.
* SQL_STORED_PROCEDURE → Procedimiento.
* SQL_SCALAR_FUNCTION → Función.
* SQL_TRIGGER → Trigger.
* PRIMARY_KEY_CONSTRAINT → Restricción.
* DEFAULT_CONSTRAINT → Restricción.
* CHECK_CONSTRAINT → Restricción.
* FOREIGN_KEY_CONSTRAINT → Restricción.

### 4. Definiciones SQL no disponibles

Validar cómo debe mostrarse un objeto cuando:

* Es consultable.
* Existe en el catálogo.
* Pero no expone definición SQL.

Mensaje sugerido:

```text
La definición SQL no está disponible para este usuario o este objeto no expone texto mediante SQL Server.
```

### 5. Vista previa de datos

Confirmar que la vista previa debe permanecer disponible solo para usuarios autorizados y nunca para agentes IA documentales.

### 6. Documentación semántica

Definir los campos mínimos para documentar un objeto:

* Descripción funcional.
* Área dueña.
* Área consumidora.
* Proceso relacionado.
* Nivel de sensibilidad.
* Criticidad.
* Owner.
* Estado de validación.
* Notas de negocio.

### 7. Estados de documentación

Validar si se adoptan los siguientes estados:

* DISCOVERED.
* AI_SUGGESTED.
* HUMAN_REVIEWED.
* APPROVED.
* DEPRECATED.
* UNKNOWN.

## Conclusión

La herramienta ya tiene una base técnica funcional. Antes de agentes IA, se debe cerrar la revisión del modelo documental y validar manualmente los criterios de clasificación, conexión y exposición segura de metadata.

