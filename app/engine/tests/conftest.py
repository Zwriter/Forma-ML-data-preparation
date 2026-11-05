from datetime import date, timedelta

import polars as pl
import pytest

BASE_ROWS = 60
# base rows appended again (3 duplicate rows); none holds a null or invalid value
DUPLICATED = (0, 1, 4)


def _base_row(i: int) -> dict:
    amounts = {2: "n/a", 9: "12,5", 20: None}  # 2 invalid values and 1 missing
    return {
        "id": i + 1,
        "price": None if i % 10 == 3 else round(i * 1.5, 2),
        "name": None if i % 8 == 5 else f"name{i % 5}",
        "active": None if i == 7 else i % 2 == 0,
        "joined": None if i == 11 else date(2024, 1, 1) + timedelta(days=i),
        "amount": amounts.get(i, f"{i}.5" if i % 2 else str(i)),
        "reject_reason": "keep",
    }


def build_mixed_frame() -> pl.DataFrame:
    rows = [_base_row(i) for i in range(BASE_ROWS)]
    return pl.DataFrame(rows + [rows[i] for i in DUPLICATED])


@pytest.fixture
def mixed_frame() -> pl.DataFrame:
    """Typed columns with known nulls, 3 duplicate rows, and a mostly numeric text
    column `amount` holding "n/a" and "12,5"; also has a `reject_reason` column."""
    return build_mixed_frame()


@pytest.fixture
def empty_frame(mixed_frame) -> pl.DataFrame:
    return mixed_frame.clear()


@pytest.fixture
def write_csv(tmp_path):
    def write(frame: pl.DataFrame, name: str = "data.csv"):
        path = tmp_path / name
        frame.write_csv(path)
        return path

    return write
