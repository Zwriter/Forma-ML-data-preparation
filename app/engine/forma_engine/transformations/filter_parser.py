import ast
import io
import secrets
import tokenize
import polars as pl
from datetime import date, datetime
from forma_engine.domain.errors import InvalidTransformationError


def compile_rules(rules: list[dict], mode: str, schema: pl.Schema) -> pl.Expr:
    if not rules:
        raise InvalidTransformationError("Add at least one filter condition.")
    if mode not in {"all", "any"}:
        raise InvalidTransformationError("Choose match all or match any conditions.")
    expressions = []
    for rule in rules:
        name, operator = rule["column"], rule["operator"]
        if name not in schema:
            raise InvalidTransformationError(f"Unknown column: {name}")
        dtype = schema[name]
        column = pl.col(name)
        if operator in {"is_empty", "is_not_empty"}:
            expression = column.is_null()
            if dtype == pl.String:
                expression = expression | (column == "")
            if operator == "is_not_empty":
                expression = ~expression
        else:
            if (
                operator in {"contains", "begins_with", "ends_with"}
                and dtype != pl.String
            ):
                raise InvalidTransformationError(
                    "Text matching requires a text column."
                )
            ordered = {"greater_than", "less_than", "at_least", "at_most"}
            comparable = (
                dtype.is_numeric() or dtype == pl.Date or isinstance(dtype, pl.Datetime)
            )
            if operator in ordered and not comparable:
                raise InvalidTransformationError(
                    "Ordered comparisons require a number or date column."
                )
            value = _typed_value(rule.get("value"), dtype)
            literal = pl.lit(value)
            if dtype == pl.String and not rule.get("case_sensitive", False):
                column, literal = column.str.to_lowercase(), literal.str.to_lowercase()
            expression = _comparison(column, literal, operator)
        expressions.append(expression.fill_null(False))
    result = expressions[0]
    for expression in expressions[1:]:
        result = result & expression if mode == "all" else result | expression
    return result


def _typed_value(value, dtype):
    try:
        if dtype == pl.String:
            return str(value)
        if dtype.is_integer():
            if isinstance(value, bool):
                raise ValueError
            return int(value)
        if dtype.is_float():
            if isinstance(value, bool):
                raise ValueError
            return float(value)
        if dtype == pl.Boolean:
            if isinstance(value, bool):
                return value
            normalized = str(value).lower()
            if normalized not in {"true", "false"}:
                raise ValueError
            return normalized == "true"
        if dtype == pl.Date:
            return value if isinstance(value, date) else date.fromisoformat(str(value))
        if isinstance(dtype, pl.Datetime):
            return (
                value
                if isinstance(value, datetime)
                else datetime.fromisoformat(str(value))
            )
    except (TypeError, ValueError, OverflowError) as exc:
        raise InvalidTransformationError(
            "Enter a value compatible with the selected column."
        ) from exc
    raise InvalidTransformationError(
        "This column type does not support filter comparisons."
    )


def _comparison(column, literal, operator):
    if operator == "equals":
        return column == literal
    if operator == "not_equals":
        return column != literal
    if operator == "contains":
        return column.str.contains(literal, literal=True)
    if operator == "begins_with":
        return column.str.starts_with(literal)
    if operator == "ends_with":
        return column.str.ends_with(literal)
    functions = {
        "greater_than": lambda: column > literal,
        "less_than": lambda: column < literal,
        "at_least": lambda: column >= literal,
        "at_most": lambda: column <= literal,
    }
    if operator not in functions:
        raise InvalidTransformationError("Choose a supported filter condition.")
    return functions[operator]()


def _normalize(expression: str) -> tuple[str, dict[str, str]]:
    result, index, quote, escaped = [], 0, None, False
    quoted_columns = {}
    while index < len(expression):
        char = expression[index]
        if quote:
            result.append(char)
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif char in {"'", '"'}:
            quote = char
            result.append(char)
        elif char == "`":
            end = expression.find("`", index + 1)
            if end < 0:
                raise InvalidTransformationError(
                    "Close quoted column names with a backtick."
                )
            name = expression[index + 1 : end]
            if not name:
                raise InvalidTransformationError("Quoted column names cannot be empty.")
            marker = f"__forma_quoted_column_{secrets.token_hex(12)}"
            quoted_columns[marker] = name
            result.append(marker)
            index = end
        else:
            result.append(char)
        index += 1
    try:
        tokens = list(tokenize.generate_tokens(io.StringIO("".join(result)).readline))
    except (tokenize.TokenError, IndentationError) as exc:
        raise InvalidTransformationError("The filter expression is malformed.") from exc
    normalized = []
    for token in tokens:
        if token.type == tokenize.NAME and token.string.upper() in {
            "AND",
            "OR",
            "IS",
            "NOT",
        }:
            token = token._replace(string=token.string.lower())
        elif token.type == tokenize.NAME and token.string.upper() == "NULL":
            token = token._replace(string="None")
        normalized.append(token)
    return tokenize.untokenize(normalized), quoted_columns


def parse_filter(expression: str, columns: list[str]) -> pl.Expr:
    if not isinstance(expression, str) or not expression.strip():
        raise InvalidTransformationError("Enter a row filter expression.")
    try:
        normalized, quoted_columns = _normalize(expression)
        tree = ast.parse(normalized, mode="eval").body
    except (SyntaxError, ValueError) as exc:
        raise InvalidTransformationError("The filter expression is malformed.") from exc

    def visit(node):
        if isinstance(node, ast.Name):
            column = quoted_columns.get(node.id, node.id)
            if column not in columns:
                raise InvalidTransformationError(f"Unknown column: {column}")
            return pl.col(column)
        if isinstance(node, ast.Constant):
            return pl.lit(node.value)
        if isinstance(node, ast.BoolOp) and isinstance(node.op, (ast.And, ast.Or)):
            values = [visit(value) for value in node.values]
            result = values[0]
            for value in values[1:]:
                result = (
                    result & value if isinstance(node.op, ast.And) else result | value
                )
            return result
        if isinstance(node, ast.Compare) and len(node.ops) == 1:
            left = visit(node.left)
            right = visit(node.comparators[0])
            operator = node.ops[0]
            if (
                isinstance(operator, ast.Is)
                and isinstance(node.comparators[0], ast.Constant)
                and node.comparators[0].value is None
            ):
                return left.is_null()
            if (
                isinstance(operator, ast.IsNot)
                and isinstance(node.comparators[0], ast.Constant)
                and node.comparators[0].value is None
            ):
                return left.is_not_null()
            if (
                isinstance(node.comparators[0], ast.Constant)
                and node.comparators[0].value is None
            ):
                raise InvalidTransformationError(
                    "Use IS NULL or IS NOT NULL for missing values."
                )
            functions = {
                ast.Eq: lambda: left == right,
                ast.NotEq: lambda: left != right,
                ast.Lt: lambda: left < right,
                ast.LtE: lambda: left <= right,
                ast.Gt: lambda: left > right,
                ast.GtE: lambda: left >= right,
            }
            if type(operator) not in functions:
                raise InvalidTransformationError("Unsupported filter operator.")
            return functions[type(operator)]()
        raise InvalidTransformationError(
            "Filters allow only columns, literals, comparisons, null checks, "
            "parentheses, AND, and OR."
        )

    try:
        return visit(tree)
    except RecursionError as exc:
        raise InvalidTransformationError(
            "Filter expression is too deeply nested."
        ) from exc
