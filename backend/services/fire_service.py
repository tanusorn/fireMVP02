from fire_simulator import IntegratedRothermelFireSimulator, FIREBREAK
from services.wind_service import fetch_wind_from_api_for_date, fuzzy_wind


from fire_simulator import (
    IntegratedRothermelFireSimulator,
    FIREBREAK,
)

UNBURNED = 0
BURNING = 1
BURNED = 2


def run_fire_model(cfg: dict) -> dict:
    # 🌬 ดึงลมจาก API ตามวันที่
    wind_min, wind_max, wind_dir = fetch_wind_from_api_for_date(
        lat=cfg["lat"],
        lon=cfg["lon"],
        year=cfg["year"],
        month=cfg["month"],
        day=cfg["day"],
    )

    wind_speed = fuzzy_wind(wind_min, wind_max)

    sim = IntegratedRothermelFireSimulator(
        lat=cfg["lat"],
        lon=cfg["lon"],
        month=cfg["month"],
        wind_speed=wind_speed,
        wind_dir=wind_dir,
        grid_x=cfg["grid_x"],
        grid_y=cfg["grid_y"],
        cell_size=cfg["cell_size"],
        sim_minutes=cfg["sim_minutes"],
    )

    sim.run_simulation(show_progress=False)
    sim.mark_firebreak(width_m=8.0)

    # =========================
    # 🔢 Count cells by state
    # =========================
    unburned_cells = int((sim.state == UNBURNED).sum())
    burning_cells = int((sim.state == BURNING).sum())
    burned_cells = int((sim.state == BURNED).sum())
    firebreak_cells = int((sim.state == FIREBREAK).sum())

    # =========================
    # 📐 Area calculation (m²)
    # =========================
    cell_area = sim.cell_size**2

    summary = {
        "unburned": {
            #"cells": unburned_cells,
            "area_m2": unburned_cells * cell_area,
        },
        "burning": {
            #"cells": burning_cells,
            "area_m2": burning_cells * cell_area,
        },
        "burned": {
            #"cells": burned_cells,
            "area_m2": burned_cells * cell_area,
        },
        "firebreak": {
            #"cells": firebreak_cells,
            "area_m2": firebreak_cells * cell_area,
        },
    }

    return {
        "wind_speed": round(wind_speed, 3),
        "wind_direction": round(wind_dir, 1),
        #"cell_size_m": sim.cell_size,
        #"cell_area_m2": cell_area,
        "summary": summary,
    }
