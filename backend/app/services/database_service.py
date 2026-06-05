from app.db.connection import get_db_connection


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
    query = """
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

    tables = []

    with get_db_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query)

        for row in cursor.fetchall():
            tables.append({
                "database_name": row.database_name,
                "schema_name": row.schema_name,
                "table_name": row.table_name
            })

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