from pydantic import BaseModel, Field, field_validator, model_validator


class SimpleQueryRequest(BaseModel):
    database_id: str = Field(min_length=1, max_length=100)
    schema_name: str = Field(min_length=1, max_length=128)
    table_name: str = Field(min_length=1, max_length=128)
    index_columns: list[str] = Field(min_length=1, max_length=3)
    index_tuples: list[list[str]] = Field(min_length=1, max_length=50_000)
    output_columns: list[str] = Field(min_length=1, max_length=100)
    order_by: list[str] = Field(default_factory=list, max_length=100)
    limit: int = Field(default=5000, ge=1, le=100_000)

    @field_validator("database_id", "schema_name", "table_name")
    @classmethod
    def strip_and_require_nonempty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("This field cannot be empty or whitespace.")
        return stripped

    @field_validator("index_columns", "output_columns", "order_by")
    @classmethod
    def strip_string_list(cls, v: list[str]) -> list[str]:
        cleaned = [item.strip() for item in v]
        if any(not item for item in cleaned):
            raise ValueError("List items cannot be empty strings.")
        return cleaned

    @field_validator("index_tuples")
    @classmethod
    def strip_tuple_values(cls, v: list[list[str]]) -> list[list[str]]:
        result = []
        for tup in v:
            cleaned = [item.strip() for item in tup]
            if any(not item for item in cleaned):
                raise ValueError("Index tuple values cannot be empty strings.")
            result.append(cleaned)
        return result

    @model_validator(mode="after")
    def validate_tuple_lengths(self) -> "SimpleQueryRequest":
        n = len(self.index_columns)
        for i, tup in enumerate(self.index_tuples):
            if len(tup) != n:
                raise ValueError(
                    f"index_tuples[{i}] has {len(tup)} value(s) but {n} index "
                    f"column(s) were specified. Each tuple must have exactly {n} value(s)."
                )
        return self
