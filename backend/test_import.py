import importlib
import traceback

try:
    importlib.import_module("theo_api.services.storage.db")
    print("import succeeded")
except Exception:
    traceback.print_exc()
