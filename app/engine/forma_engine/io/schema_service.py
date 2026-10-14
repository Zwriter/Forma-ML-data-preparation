from forma_engine.io.readers import row_count, schema_for


class SchemaService:
    """Extract schema and available row counts from a lazy dataframe."""

    def inspect(self, frame, source_path: str) -> dict:
        return {"schema": schema_for(frame), "rows": row_count(frame, source_path)}
