import json, logging, sys

class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({"level": record.levelname, "logger": record.name, "message": record.getMessage()})

def configure_logging():
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger("forma")
    root.handlers.clear(); root.addHandler(handler); root.setLevel(logging.INFO)
    return root
