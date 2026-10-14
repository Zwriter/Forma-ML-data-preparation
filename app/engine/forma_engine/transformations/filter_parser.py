import ast
import io
import tokenize
import polars as pl
from forma_engine.domain.errors import InvalidTransformationError

def _normalize(expression: str) -> str:
    result, index, quote, escaped = [], 0, None, False
    while index < len(expression):
        char = expression[index]
        if quote:
            result.append(char)
            if escaped: escaped = False
            elif char == "\\": escaped = True
            elif char == quote: quote = None
        elif char in {"'", '"'}:
            quote = char; result.append(char)
        elif char == "`":
            end = expression.find("`", index + 1)
            if end < 0: raise InvalidTransformationError("Close quoted column names with a backtick.")
            name = expression[index + 1:end]
            if not name: raise InvalidTransformationError("Quoted column names cannot be empty.")
            result.append(f"__column__({name!r})"); index = end
        else: result.append(char)
        index += 1
    try: tokens = list(tokenize.generate_tokens(io.StringIO("".join(result)).readline))
    except (tokenize.TokenError, IndentationError) as exc: raise InvalidTransformationError("The filter expression is malformed.") from exc
    normalized = []
    for token in tokens:
        if token.type == tokenize.NAME and token.string.upper() in {"AND", "OR", "IS", "NOT"}:
            token = token._replace(string=token.string.lower())
        elif token.type == tokenize.NAME and token.string.upper() == "NULL": token = token._replace(string="None")
        normalized.append(token)
    return tokenize.untokenize(normalized)

def parse_filter(expression: str, columns: list[str]) -> pl.Expr:
    if not isinstance(expression, str) or not expression.strip(): raise InvalidTransformationError("Enter a row filter expression.")
    try: tree = ast.parse(_normalize(expression), mode="eval").body
    except (SyntaxError, ValueError) as exc: raise InvalidTransformationError("The filter expression is malformed.") from exc
    def visit(node):
        if isinstance(node, ast.Name):
            if node.id not in columns: raise InvalidTransformationError(f"Unknown column: {node.id}")
            return pl.col(node.id)
        if isinstance(node, ast.Constant): return pl.lit(node.value)
        if isinstance(node, ast.BoolOp) and isinstance(node.op, (ast.And, ast.Or)):
            values = [visit(value) for value in node.values]; result = values[0]
            for value in values[1:]: result = result & value if isinstance(node.op, ast.And) else result | value
            return result
        if isinstance(node, ast.Compare) and len(node.ops) == 1:
            left = visit(node.left); right = visit(node.comparators[0]); operator = node.ops[0]
            if isinstance(operator, ast.Is) and isinstance(node.comparators[0], ast.Constant) and node.comparators[0].value is None: return left.is_null()
            if isinstance(operator, ast.IsNot) and isinstance(node.comparators[0], ast.Constant) and node.comparators[0].value is None: return left.is_not_null()
            if isinstance(node.comparators[0], ast.Constant) and node.comparators[0].value is None: raise InvalidTransformationError("Use IS NULL or IS NOT NULL for missing values.")
            functions = {ast.Eq: lambda: left == right, ast.NotEq: lambda: left != right, ast.Lt: lambda: left < right,
                         ast.LtE: lambda: left <= right, ast.Gt: lambda: left > right, ast.GtE: lambda: left >= right}
            if type(operator) not in functions: raise InvalidTransformationError("Unsupported filter operator.")
            return functions[type(operator)]()
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "__column__" and len(node.args) == 1 and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
            if node.args[0].value not in columns: raise InvalidTransformationError(f"Unknown column: {node.args[0].value}")
            return pl.col(node.args[0].value)
        raise InvalidTransformationError("Filters allow only columns, literals, comparisons, null checks, parentheses, AND, and OR.")
    try: return visit(tree)
    except RecursionError as exc: raise InvalidTransformationError("Filter expression is too deeply nested.") from exc
