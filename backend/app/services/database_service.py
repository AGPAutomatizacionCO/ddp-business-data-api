from app.db.connection import get_db_connection
from typing import Any
from app.core.database_catalog import DatabaseConnectionConfig, get_database_connection
import pyodbc

SENSITIVE_KEYWORDS = [
    "password",
    "pass",
    "pwd",
    "token",
    "secret",
    "key",
    "api_key",
    "apikey",
    "credential",
    "auth",
    "authorization",
    "email",
    "correo",
    "mail",
    "phone",
    "telefono",
    "celular",
    "mobile",
    "document",
    "documento",
    "cedula",
    "identification",
    "nit",
    "address",
    "direccion"
]

def get_current_database():
    query = "SELECT DB_NAME() AS current_database;"

    with get_db_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query)
        row = cursor.fetchone()

        return {
            "current_database": row.current_database if row else None
        }


def get_tables():
    tables_query = """
        SELECT 
            DB_NAME() AS database_name,
            s.name AS schema_name,
            t.name AS table_name
        FROM sys.tables t
        INNER JOIN sys.schemas s 
            ON t.schema_id = s.schema_id
        ORDER BY 
            s.name,
            t.name;
    """

    columns_query = """
        SELECT 
            TABLE_SCHEMA AS schema_name,
            TABLE_NAME AS table_name,
            COLUMN_NAME AS column_name
        FROM INFORMATION_SCHEMA.COLUMNS;
    """

    tables = []

    with get_db_connection() as connection:
        cursor = connection.cursor()

        cursor.execute(tables_query)

        for row in cursor.fetchall():
            tables.append({
                "database_name": row.database_name,
                "schema_name": row.schema_name,
                "table_name": row.table_name,
                "has_sensitive_data": False,
                "sensitive_columns_count": 0,
                "sensitive_columns": []
            })

        table_index = {
            f"{table['schema_name']}.{table['table_name']}": table
            for table in tables
        }

        cursor.execute(columns_query)

        for row in cursor.fetchall():
            key = f"{row.schema_name}.{row.table_name}"

            if key not in table_index:
                continue

            column_name = row.column_name

            if is_sensitive_column(column_name):
                table_index[key]["has_sensitive_data"] = True
                table_index[key]["sensitive_columns_count"] += 1
                table_index[key]["sensitive_columns"].append(column_name)

    return tables


def get_columns():
    query = """
        SELECT 
            DB_NAME() AS database_name,
            TABLE_SCHEMA AS schema_name,
            TABLE_NAME AS table_name,
            COLUMN_NAME AS column_name,
            DATA_TYPE AS data_type,
            IS_NULLABLE AS is_nullable
        FROM INFORMATION_SCHEMA.COLUMNS
        ORDER BY 
            TABLE_SCHEMA,
            TABLE_NAME,
            ORDINAL_POSITION;
    """

    columns = []

    with get_db_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query)

        for row in cursor.fetchall():
            columns.append({
                "database_name": row.database_name,
                "schema_name": row.schema_name,
                "table_name": row.table_name,
                "column_name": row.column_name,
                "data_type": row.data_type,
                "is_nullable": row.is_nullable
            })

    return columns
def is_sensitive_column(column_name: str) -> bool:
    normalized = column_name.lower()
    return any(keyword in normalized for keyword in SENSITIVE_KEYWORDS)

def mask_sensitive_value(column_name: str, value):
    if is_sensitive_column(column_name):
        return "***"

    return value

def safe_sql_identifier(identifier: str) -> str:
    """
    Protects SQL identifiers such as schema and table names.
    This does not replace validation. Validation must happen before using it.
    """
    return identifier.replace("]", "]]")


def table_exists(schema_name: str, table_name: str) -> bool:
    query = """
        SELECT COUNT(*) AS total
        FROM sys.tables t
        INNER JOIN sys.schemas s
            ON t.schema_id = s.schema_id
        WHERE s.name = ?
          AND t.name = ?;
    """

    with get_db_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query, schema_name, table_name)
        row = cursor.fetchone()

        return row.total > 0 if row else False


def get_table_columns(schema_name: str, table_name: str) -> list[dict[str, Any]]:
    query = """
        SELECT
            COLUMN_NAME AS column_name,
            DATA_TYPE AS data_type,
            IS_NULLABLE AS is_nullable
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION;
    """

    columns = []

    with get_db_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query, schema_name, table_name)

        for row in cursor.fetchall():
            column_name = row.column_name

            columns.append({
                "name": column_name,
                "data_type": row.data_type,
                "is_nullable": row.is_nullable,
                "is_sensitive": is_sensitive_column(column_name)
            })

    return columns


def get_table_total_records(schema_name: str, table_name: str) -> int:
    if not table_exists(schema_name, table_name):
        raise ValueError("Table does not exist or is not accessible.")

    safe_schema = safe_sql_identifier(schema_name)
    safe_table = safe_sql_identifier(table_name)

    query = f"""
        SELECT COUNT(*) AS total_records
        FROM [{safe_schema}].[{safe_table}];
    """

    with get_db_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query)
        row = cursor.fetchone()

        return int(row.total_records) if row else 0


def get_table_preview(
    schema_name: str,
    table_name: str,
    start_record: int = 1,
    end_record: int = 20
) -> dict[str, Any]:
    if start_record < 1:
        raise ValueError("start_record must be greater than or equal to 1.")

    if end_record < start_record:
        raise ValueError("end_record must be greater than or equal to start_record.")

    requested_records = end_record - start_record + 1

    max_records = 100

    if requested_records > max_records:
        raise ValueError(f"Maximum allowed records per request is {max_records}.")

    if not table_exists(schema_name, table_name):
        raise ValueError("Table does not exist or is not accessible.")

    columns = get_table_columns(schema_name, table_name)
    total_records = get_table_total_records(schema_name, table_name)

    safe_schema = safe_sql_identifier(schema_name)
    safe_table = safe_sql_identifier(table_name)

    offset = start_record - 1
    fetch = requested_records

    query = f"""
        SELECT *
        FROM [{safe_schema}].[{safe_table}]
        ORDER BY (SELECT NULL)
        OFFSET ? ROWS
        FETCH NEXT ? ROWS ONLY;
    """

    data = []

    with get_db_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query, offset, fetch)

        column_names = [column[0] for column in cursor.description]

        for row in cursor.fetchall():
            item = {}

            for index, column_name in enumerate(column_names):
                value = row[index]

                item[column_name] = mask_sensitive_value(column_name, value)

            data.append(item)

    sensitive_columns = [
        column["name"]
        for column in columns
        if column["is_sensitive"]
    ]

    return {
        "schema": schema_name,
        "table": table_name,
        "total_records": total_records,
        "start_record": start_record,
        "end_record": end_record,
        "returned_records": len(data),
        "max_records_per_request": max_records,
        "sensitive_columns": sensitive_columns,
        "columns": columns,
        "data": data
    }
def check_database_connection():
    query = "SELECT DB_NAME() AS current_database;"

    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute(query)
            row = cursor.fetchone()

            return {
                "status": "ok",
                "database_connection": "available",
                "database_name": row.current_database if row else None
            }
    except Exception as error:
        return {
            "status": "error",
            "database_connection": "unavailable",
            "database_name": None,
            "detail": str(error)
        }


def get_database_summary():
    query = """
        SELECT 
            COUNT(DISTINCT s.name) AS total_schemas,
            COUNT(t.name) AS total_tables
        FROM sys.tables t
        INNER JOIN sys.schemas s 
            ON t.schema_id = s.schema_id;
    """

    with get_db_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query)
        row = cursor.fetchone()

        return {
            "total_schemas": int(row.total_schemas) if row else 0,
            "total_tables": int(row.total_tables) if row else 0
        }
def build_connection_string_from_config(config: DatabaseConnectionConfig) -> str:
    return (
        f"DRIVER={{{config.driver}}};"
        f"SERVER={config.server},{config.port};"
        f"DATABASE={config.database};"
        f"UID={config.user};"
        f"PWD={config.password};"
        f"Encrypt={config.encrypt};"
        f"TrustServerCertificate={config.trust_certificate};"
    )


def check_database_connection_by_id(database_id: str) -> dict:
    database_config = get_database_connection(database_id)
    connection_string = build_connection_string_from_config(database_config)

    try:
        with pyodbc.connect(connection_string, timeout=10) as connection:
            cursor = connection.cursor()
            cursor.execute("SELECT DB_NAME()")
            row = cursor.fetchone()
            if row is None:
                return {
                    "status": "error",
                    "database_id": database_config.id,
                    "database": database_config.database,
                    "label": database_config.label,
                    "message": "No database name was returned by SQL Server.",
                }

            current_database = row[0]

        return {
            "status": "ok",
            "database_id": database_config.id,
            "database": current_database,
            "label": database_config.label,
        }

    except Exception as error:
        return {
            "status": "error",
            "database_id": database_config.id,
            "database": database_config.database,
            "label": database_config.label,
            "message": str(error),
        }


def get_database_summary_by_id(database_id: str) -> dict:
    database_config = get_database_connection(database_id)
    connection_string = build_connection_string_from_config(database_config)

    query = """
        SELECT
            COUNT(DISTINCT TABLE_SCHEMA) AS total_schemas,
            COUNT(*) AS total_tables
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
    """

    with pyodbc.connect(connection_string) as connection:
        cursor = connection.cursor()
        cursor.execute(query)
        row = cursor.fetchone()

        if row is None:
            return {
                "database_id": database_config.id,
                "database": database_config.database,
                "label": database_config.label,
                "total_schemas": 0,
                "total_tables": 0,
            }

    return {
        "database_id": database_config.id,
        "database": database_config.database,
        "label": database_config.label,
        "total_schemas": row[0],
        "total_tables": row[1],
    }

def get_table_columns_by_database_id(
    database_id: str,
    schema_name: str,
    table_name: str,
) -> list[dict]:
    database_config = get_database_connection(database_id)
    connection_string = build_connection_string_from_config(database_config)

    query = """
        SELECT
            COLUMN_NAME,
            DATA_TYPE,
            IS_NULLABLE,
            CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
    """

    with pyodbc.connect(connection_string) as connection:
        cursor = connection.cursor()
        cursor.execute(query, schema_name, table_name)

        columns = []

        for row in cursor.fetchall():
            column_name = row.COLUMN_NAME

            columns.append(
                {
                    "name": column_name,
                    "type": row.DATA_TYPE,
                    "is_nullable": row.IS_NULLABLE == "YES",
                    "max_length": row.CHARACTER_MAXIMUM_LENGTH,
                    "is_sensitive": is_sensitive_column(column_name),
                }
            )

    return columns


def get_tables_by_database_id(database_id: str) -> list[dict]:
    database_config = get_database_connection(database_id)
    connection_string = build_connection_string_from_config(database_config)

    tables_query = """
        SELECT
            TABLE_SCHEMA,
            TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_SCHEMA, TABLE_NAME
    """

    columns_query = """
        SELECT
            TABLE_SCHEMA,
            TABLE_NAME,
            COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    """

    with pyodbc.connect(connection_string, timeout=15) as connection:
        cursor = connection.cursor()

        cursor.execute(tables_query)

        tables = []

        for row in cursor.fetchall():
            schema_name = row.TABLE_SCHEMA
            table_name = row.TABLE_NAME

            tables.append(
                {
                    "schema": schema_name,
                    "name": table_name,
                    "full_name": f"{schema_name}.{table_name}",
                    "has_sensitive_data": False,
                    "sensitive_columns_count": 0,
                    "sensitive_columns": [],
                }
            )

        cursor.execute(columns_query)

        columns_by_table = {}

        for row in cursor.fetchall():
            schema_name = row.TABLE_SCHEMA
            table_name = row.TABLE_NAME
            column_name = row.COLUMN_NAME

            table_key = f"{schema_name}.{table_name}"

            if table_key not in columns_by_table:
                columns_by_table[table_key] = []

            columns_by_table[table_key].append(column_name)

    for table in tables:
        table_key = f"{table['schema']}.{table['name']}"
        column_names = columns_by_table.get(table_key, [])

        sensitive_columns = [
            column_name
            for column_name in column_names
            if is_sensitive_column(column_name)
        ]

        table["has_sensitive_data"] = len(sensitive_columns) > 0
        table["sensitive_columns_count"] = len(sensitive_columns)
        table["sensitive_columns"] = sensitive_columns

    return tables
def get_table_preview_by_database_id(
    database_id: str,
    schema_name: str,
    table_name: str,
    start_record: int = 1,
    end_record: int = 20,
) -> dict:
    database_config = get_database_connection(database_id)
    connection_string = build_connection_string_from_config(database_config)

    max_records = 100

    if start_record < 1:
        raise ValueError("start_record must be greater than or equal to 1.")

    if end_record < start_record:
        raise ValueError("end_record must be greater than or equal to start_record.")

    requested_records = end_record - start_record + 1

    if requested_records > max_records:
        raise ValueError(f"Maximum records per request is {max_records}.")

    columns = get_table_columns_by_database_id(
        database_id=database_id,
        schema_name=schema_name,
        table_name=table_name,
    )

    column_names = [column["name"] for column in columns]

    if not column_names:
        raise ValueError("Table not found or table has no columns.")

    sensitive_columns = [
        column["name"]
        for column in columns
        if column.get("is_sensitive")
    ]

    safe_columns = ", ".join(
        f"[{column_name}]"
        for column_name in column_names
    )

    count_query = f"""
        SELECT COUNT(*) AS total_records
        FROM [{schema_name}].[{table_name}]
    """

    preview_query = f"""
        SELECT {safe_columns}
        FROM [{schema_name}].[{table_name}]
        ORDER BY (SELECT NULL)
        OFFSET ? ROWS
        FETCH NEXT ? ROWS ONLY
    """

    offset = start_record - 1
    limit = requested_records

    with pyodbc.connect(connection_string, timeout=20) as connection:
        cursor = connection.cursor()

        cursor.execute(count_query)
        count_row = cursor.fetchone()
        total_records = count_row[0] if count_row else 0

        cursor.execute(preview_query, offset, limit)

        rows = cursor.fetchall()

    data = []

    for row in rows:
        record = {}

        for index, column_name in enumerate(column_names):
            value = row[index]

            if column_name in sensitive_columns:
                record[column_name] = "***"
            else:
                record[column_name] = value

        data.append(record)

    return {
        "database_id": database_config.id,
        "database": database_config.database,
        "label": database_config.label,
        "schema": schema_name,
        "table": table_name,
        "total_records": total_records,
        "start_record": start_record,
        "end_record": end_record,
        "returned_records": len(data),
        "max_records_per_request": max_records,
        "sensitive_columns": sensitive_columns,
        "columns": column_names,
        "data": data,
    }