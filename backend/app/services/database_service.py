from app.db.connection import get_db_connection
from typing import Any

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