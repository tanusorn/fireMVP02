from math_model import run_math_model


def optimize_from_frontend(zones: dict, centers: list = None):
    """
    zones = { "A": 2400, "B": 1800 }
    """
    if not zones or not isinstance(zones, dict):
        raise ValueError("Zones data is invalid or empty")

    return run_math_model(zones, centers)
