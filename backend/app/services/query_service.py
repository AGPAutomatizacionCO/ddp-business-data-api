import time

import pyodbc

from app.core.database_catalog import get_database_connection
from app.schemas.query_schema import SimpleQueryRequest
from app.services.database_service import (
    build_connection_string_from_config,
    is_sensitive_column,
    safe_sql_identifier,
)

# Threshold below which IN/OR clause is used; above it a temp table is used.
# 1500 keeps total parameters safely under SQL Server's 2100-parameter limit
# even with 3 index columns (3 × 500 = 1500).
_TEMP_TABLE_THRESHOLD = 1500


def get_queryable_columns(
    database_id: str,
    schema_name: str,
    table_name: str,
) -> list[dict]:
    db_config = get_database_connection(database_id)
    conn_str = build_connection_string_from_config(db_config)

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

    with pyodbc.connect(conn_str, timeout=10) as conn:
        cursor = conn.cursor()
        cursor.execute(query, schema_name, table_name)
        rows = cursor.fetchall()

    if not rows:
        raise ValueError(
            f"Table '{schema_name}.{table_name}' not found or has no columns."
        )

    return [
        {
            "name": row.COLUMN_NAME,
            "type": row.DATA_TYPE,
            "is_nullable": row.IS_NULLABLE == "YES",
            "max_length": row.CHARACTER_MAXIMUM_LENGTH,
            "is_sensitive": is_sensitive_column(row.COLUMN_NAME),
        }
        for row in rows
    ]


def _validate_table_exists(conn_str: str, schema_name: str, table_name: str) -> bool:
    query = """
        SELECT COUNT(*) AS total
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
          AND TABLE_TYPE IN ('BASE TABLE', 'VIEW')
    """
    with pyodbc.connect(conn_str, timeout=10) as conn:
        cursor = conn.cursor()
        cursor.execute(query, schema_name, table_name)
        row = cursor.fetchone()
        return row[0] > 0 if row else False


def _get_existing_columns(conn_str: str, schema_name: str, table_name: str) -> set[str]:
    query = """
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
    """
    with pyodbc.connect(conn_str, timeout=10) as conn:
        cursor = conn.cursor()
        cursor.execute(query, schema_name, table_name)
        return {row.COLUMN_NAME for row in cursor.fetchall()}


def _dedup_tuples(tuples: list[list[str]]) -> tuple[list[list[str]], int]:
    """Returns (unique_tuples, duplicates_removed_count) preserving insertion order."""
    seen: set[tuple] = set()
    unique: list[list[str]] = []
    for tup in tuples:
        key = tuple(tup)
        if key not in seen:
            seen.add(key)
            unique.append(tup)
    return unique, len(tuples) - len(unique)


def _build_where_clause(
    index_columns: list[str],
    index_tuples: list[list[str]],
) -> tuple[str, list]:
    """
    Returns (where_clause_sql, flat_params_list).

    Single index  → WHERE [col] IN (?, ?, ?)
    Composite     → WHERE ([c1]=? AND [c2]=?) OR ([c1]=? AND [c2]=?) ...
    """
    if len(index_columns) == 1:
        safe_col = safe_sql_identifier(index_columns[0])
        placeholders = ", ".join("?" for _ in index_tuples)
        sql = f"WHERE [{safe_col}] IN ({placeholders})"
        params = [tup[0] for tup in index_tuples]
    else:
        conditions = []
        params = []
        for tup in index_tuples:
            parts = " AND ".join(
                f"[{safe_sql_identifier(col)}] = ?" for col in index_columns
            )
            conditions.append(f"({parts})")
            params.extend(tup)
        sql = "WHERE " + " OR ".join(conditions)

    return sql, params


def _execute_with_temp_table(
    conn: pyodbc.Connection,
    index_columns: list[str],
    unique_tuples: list[list[str]],
    select_clause: str,
    safe_schema: str,
    safe_table: str,
    order_clause: str,
    limit: int,
) -> list:
    """Uses a session-scoped temp table to handle large index sets without
    hitting SQL Server's 2100-parameter limit."""
    n_cols = len(index_columns)
    col_defs = ", ".join(f"c{i} NVARCHAR(255)" for i in range(n_cols))
    # CAST source column to NVARCHAR so the JOIN works for any column type
    # (FLOAT, INT, DECIMAL, etc.) without implicit conversion errors.
    join_cond = " AND ".join(
        f"CAST(src.[{safe_sql_identifier(index_columns[i])}] AS NVARCHAR(100)) = idx.c{i}"
        for i in range(n_cols)
    )
    insert_sql = f"INSERT INTO #oq_idx VALUES ({', '.join('?' for _ in range(n_cols))})"
    query_sql = f"""
        SELECT {select_clause}
        FROM [{safe_schema}].[{safe_table}] src
        JOIN #oq_idx idx ON {join_cond}
        ORDER BY {order_clause}
        OFFSET 0 ROWS
        FETCH NEXT ? ROWS ONLY
    """

    cursor = conn.cursor()
    cursor.execute(f"CREATE TABLE #oq_idx ({col_defs})")
    cursor.fast_executemany = True
    cursor.executemany(insert_sql, unique_tuples)
    cursor.execute(query_sql, limit)
    return cursor.fetchall()


def execute_simple_query(payload: SimpleQueryRequest) -> dict:
    t0 = time.perf_counter()

    db_config = get_database_connection(payload.database_id)
    conn_str = build_connection_string_from_config(db_config)

    if not _validate_table_exists(conn_str, payload.schema_name, payload.table_name):
        raise ValueError(
            f"Table '{payload.schema_name}.{payload.table_name}' not found or not accessible."
        )

    existing_columns = _get_existing_columns(
        conn_str, payload.schema_name, payload.table_name
    )

    all_referenced = list({*payload.index_columns, *payload.output_columns})
    missing = [col for col in all_referenced if col not in existing_columns]
    if missing:
        raise ValueError(f"Columns not found in table: {', '.join(missing)}")

    invalid_order = [col for col in payload.order_by if col not in payload.output_columns]
    if invalid_order:
        raise ValueError(
            f"Order columns must be present in output_columns. Not found: {', '.join(invalid_order)}"
        )

    # Deduplicate before sending to SQL Server
    unique_tuples, duplicates_removed = _dedup_tuples(payload.index_tuples)

    safe_schema = safe_sql_identifier(payload.schema_name)
    safe_table = safe_sql_identifier(payload.table_name)

    select_clause = ", ".join(
        f"src.[{safe_sql_identifier(col)}]" for col in payload.output_columns
    )

    order_clause = (
        ", ".join(f"src.[{safe_sql_identifier(col)}]" for col in payload.order_by)
        if payload.order_by
        else "(SELECT NULL)"
    )

    sensitive_set = {col for col in payload.output_columns if is_sensitive_column(col)}

    use_temp_table = len(unique_tuples) * len(payload.index_columns) > _TEMP_TABLE_THRESHOLD

    with pyodbc.connect(conn_str, timeout=60) as conn:
        if use_temp_table:
            rows = _execute_with_temp_table(
                conn,
                payload.index_columns,
                unique_tuples,
                select_clause,
                safe_schema,
                safe_table,
                order_clause,
                payload.limit,
            )
        else:
            where_clause, where_params = _build_where_clause(
                payload.index_columns, unique_tuples
            )
            sql = f"""
                SELECT {select_clause}
                FROM [{safe_schema}].[{safe_table}] src
                {where_clause}
                ORDER BY {order_clause}
                OFFSET 0 ROWS
                FETCH NEXT ? ROWS ONLY
            """
            cursor = conn.cursor()
            cursor.execute(sql, *where_params, payload.limit)
            rows = cursor.fetchall()

    data = []
    for row in rows:
        record = {}
        for i, col_name in enumerate(payload.output_columns):
            value = row[i]
            record[col_name] = "***" if col_name in sensitive_set else value
        data.append(record)

    execution_ms = round((time.perf_counter() - t0) * 1000)

    return {
        "database_id": db_config.id,
        "database_label": db_config.label,
        "schema": payload.schema_name,
        "table": payload.table_name,
        "index_columns": payload.index_columns,
        "index_tuples_count": len(payload.index_tuples),
        "unique_tuples_count": len(unique_tuples),
        "duplicates_removed": duplicates_removed,
        "output_columns": payload.output_columns,
        "order_by": payload.order_by,
        "rows_returned": len(data),
        "limit": payload.limit,
        "execution_time_ms": execution_ms,
        "data": data,
    }
