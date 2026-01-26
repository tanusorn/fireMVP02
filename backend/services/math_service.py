from store.zone_store import get_zones
from math_model import run_math_model


def optimize_from_store():
    zones = get_zones()

    if not zones:
        raise ValueError("No zones available for optimization")

    # zones example:
    # { "A": 2400.0, "B": 1800.0 }

    return run_math_model(zones)
