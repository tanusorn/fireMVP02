# store/zone_store.py

ZONE_STORE = {}

def save_zone(zone: str, area: float):
    ZONE_STORE[zone] = area

def get_zones() -> dict:
    return ZONE_STORE

def clear_zones():
    ZONE_STORE.clear()
