class FormaError(Exception):
    """Expected, safe-to-display application error."""

    code = "INTERNAL_ERROR"

    def __init__(self, message: str, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class RequestError(FormaError):
    code = "INVALID_REQUEST"


class FileAccessError(FormaError):
    code = "FILE_ACCESS_ERROR"


class UnsupportedFormatError(FormaError):
    code = "UNSUPPORTED_FORMAT"


class InvalidDatasetError(FormaError):
    code = "INVALID_DATASET"


class DatasetNotFoundError(FormaError):
    code = "DATASET_NOT_FOUND"


class InvalidTransformationError(FormaError):
    code = "INVALID_TRANSFORMATION"


class JobNotFoundError(FormaError):
    code = "JOB_NOT_FOUND"


class ExportError(FormaError):
    code = "EXPORT_FAILED"


class HistoryBoundaryError(FormaError):
    code = "HISTORY_BOUNDARY"


class SaveRequiredError(FormaError):
    code = "SAVE_REQUIRED"


class SaveError(FormaError):
    code = "SAVE_FAILED"


class CancelledError(FormaError):
    code = "CANCELLED"
