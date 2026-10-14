import pytest
from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.validators import validate

def test_rejects_unknown_filter_column():
    with pytest.raises(InvalidTransformationError): validate({"type":"filter_rows","parameters":{"expression":"missing > 2"}}, ["known"])

@pytest.mark.parametrize("operation", [
    {"type":"drop_duplicates","parameters":{}},
    {"type":"drop_null_rows","parameters":{}},
    {"type":"fill_null","parameters":{"column":"x","strategy":"constant","value":0}},
    {"type":"rename_columns","parameters":{"mapping":{"x":"renamed"}}},
    {"type":"drop_columns","parameters":{"columns":["y"]}},
    {"type":"convert_type","parameters":{"column":"x","to":"float"}},
    {"type":"filter_rows","parameters":{"expression":"x >= 2 AND y IS NOT NULL"}},
])
def test_accepts_seven_declared_operations(operation):
    validate(operation, ["x", "y"])

@pytest.mark.parametrize("expression", ["x >", "x > 1 OR __import__('os').system('whoami')", "x + 2 > 3", "unknown == 1"])
def test_filter_rejects_malformed_or_executable_expressions(expression):
    with pytest.raises(InvalidTransformationError): validate({"type":"filter_rows","parameters":{"expression":expression}}, ["x"])

def test_constant_fill_requires_value():
    with pytest.raises(InvalidTransformationError): validate({"type":"fill_null","parameters":{"column":"x","strategy":"constant"}}, ["x"])

def test_rename_rejects_collision_with_unrenamed_column():
    with pytest.raises(InvalidTransformationError): validate({"type":"rename_columns","parameters":{"mapping":{"x":"y"}}}, ["x","y"])

def test_conversion_requires_supported_target_type():
    with pytest.raises(InvalidTransformationError): validate({"type":"convert_type","parameters":{"column":"x","to":"python"}}, ["x"])

def test_filter_supports_quoted_column_names_and_preserves_literal_text():
    from forma_engine.transformations.filter_parser import parse_filter
    expression = '`full name` == "Alice AND Bob" AND x IS NOT NULL'
    parsed = parse_filter(expression, ["full name", "x"])
    assert parsed is not None
