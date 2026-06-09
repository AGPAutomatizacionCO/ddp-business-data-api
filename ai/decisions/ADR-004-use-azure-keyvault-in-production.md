# ADR-004 - Uso de Azure Key Vault para secretos en producción

## Fecha
2026-06-05

## Estado
Aprobado

## Contexto
El proyecto `DDP Data Explorer` requiere conectarse a servicios internos y bases de datos empresariales. Para ello se manejan valores sensibles como credenciales, cadenas de conexión, claves, secretos de cliente, tokens o configuraciones protegidas.

Durante la PoC local, estos valores se manejan mediante archivo `.env`, excluido del repositorio. Sin embargo, este mecanismo no es adecuado para producción ni para ambientes empresariales controlados.

## Decisión
Se decide que en ambientes productivos o corporativos los secretos deberán gestionarse mediante **Azure Key Vault** o un gestor de secretos aprobado por IT.

## Justificación
Azure Key Vault permite:
- Centralizar la administración de secretos.
- Evitar credenciales en código fuente.
- Evitar credenciales en archivos versionados.
- Controlar acceso mediante identidades y permisos.
- Auditar accesos a secretos.
- Facilitar rotación de claves y credenciales.
- Integrarse con servicios de Azure y Microsoft Entra ID.

## Alcance
Deben gestionarse como secretos:
- Contraseñas de base de datos.
- Connection strings.
- API keys.
- Client secrets.
- Tokens.
- Certificados.
- Credenciales SAP.
- Credenciales de servicios externos.
- License keys de herramientas como New Relic, si aplica.

No se consideran secretos, aunque sí configuración interna:
- Tenant ID.
- Client ID.
- Redirect URI.
- Nombre del ambiente.
- URL base de servicios internos.

## Implementación local actual
Durante la PoC, se permite el uso de `.env` local:

```text
backend/.env