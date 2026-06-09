## Ejecutar proyecto con Docker

### Requisitos

- Docker Desktop instalado.
- Archivo `backend/.env` configurado.
- Acceso autorizado a la base de datos.
- Actualmente Docker no esta implementado en el proyecto por bloqueos en el equipo para Docker Desktop

### Pasos

1. Clonar el repositorio.

2. Crear el archivo:

'''text
backend/.env

# ddp-business-data-api
API interna para consultas controladas a bases de datos empresariales, manejo seguro de secretos mediante Azure Key Vault y desarrollo gobernado con apoyo de IA.

# DDP Business Data API

API interna para consultas controladas a bases de datos empresariales.

## Propósito

Este proyecto tiene como objetivo centralizar el acceso seguro a información empresarial mediante una API controlada, evitando conexiones directas desde aplicaciones cliente a bases de datos productivas.

## Principios

- No almacenar credenciales en el código.
- Usar Azure Key Vault para secretos.
- Usar DTOs para controlar respuestas.
- No permitir SQL libre desde el frontend.
- Documentar arquitectura, base de datos, seguridad y despliegue.
- Registrar el uso de IA en la carpeta `/ai`.

## Tecnología

Infraestructura / Hosting: Azure
API: Python
Frontend: JavaScript
Base de datos: Azure SQL / SQL Server
Secretos: Azure Key Vault
Repositorio: GitHub




