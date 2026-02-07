#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fire Statistics Analyzer (Lat/Lon version)
รองรับ IntegratedRothermelFireSimulator (GEE patch + CA + ignite queue)

ปรับให้เข้ากับ get_basic_statistics() เวอร์ชันใหม่ที่มี:
- fuel_cells, burn_percentage_all, burn_percentage_of_fuel
- ros_stats: {count, mean, min, max}
รองรับ FIREBREAK และ last_ignition_point()
"""

import numpy as np
from typing import Dict, Any

# ต้องตรงกับ state ใน simulator
UNBURNED, BURNING, BURNED, FIREBREAK = 0, 1, 2, 3


def _fmt_area_m2(x: float) -> str:
    try:
        return f"{int(round(x)):,} m²"
    except Exception:
        return "N/A"


def _safe_float(x: Any, digits: int = 4, none_text: str = "N/A") -> str:
    try:
        if x is None or (isinstance(x, float) and np.isnan(x)):
            return none_text
        return f"{float(x):.{digits}f}"
    except Exception:
        return none_text


class FireStatistics:
    """คลาสสำหรับวิเคราะห์และแสดงผลสถิติการจำลองไฟป่า"""

    def __init__(self, simulator):
        self.simulator = simulator
        self.stats = simulator.get_basic_statistics()
        self.last_point = simulator.get_last_ignition_point()

    # -------------------- Core Helpers --------------------
    def get_cell_status_breakdown(self) -> Dict[str, Dict[str, int]]:
        """คำนวณจำนวนและพื้นที่ของแต่ละสถานะเซลล์"""
        state = self.simulator.state
        cell_area = float(self.simulator.cell_size) ** 2

        unburned_cells = int(np.sum(state == UNBURNED))
        burning_cells = int(np.sum(state == BURNING))
        burned_cells = int(np.sum(state == BURNED))
        firebreak_cells = int(np.sum(state == FIREBREAK))

        return {
            "unburned": {
                "cells": unburned_cells,
                "area_m2": unburned_cells * cell_area,
            },
            "burning": {"cells": burning_cells, "area_m2": burning_cells * cell_area},
            "burned": {"cells": burned_cells, "area_m2": burned_cells * cell_area},
            "firebreak": {
                "cells": firebreak_cells,
                "area_m2": firebreak_cells * cell_area,
            },
        }

    def _get_start_conditions(self) -> Dict[str, Any]:
        """คืนค่าความชัน / NDVI / ROS จุดเริ่มไฟ"""
        si, sj = getattr(self.simulator, "start_i", None), getattr(
            self.simulator, "start_j", None
        )

        if si is None or sj is None or si < 0 or sj < 0:
            return {
                "slope_tan": None,
                "slope_deg": None,
                "slope_pct": None,
                "ndvi": None,
                "ros": None,
                "grid_pos": (None, None),
            }

        slope_tan = (
            float(self.simulator.slope_data[si, sj])
            if self.simulator.slope_data is not None
            else np.nan
        )
        ndvi = (
            float(self.simulator.ndvi_data[si, sj])
            if self.simulator.ndvi_data is not None
            else np.nan
        )
        ros0 = (
            float(self.simulator.ros_grid[si, sj])
            if self.simulator.ros_grid is not None
            else np.nan
        )

        slope_deg = (
            np.degrees(np.arctan(slope_tan)) if not np.isnan(slope_tan) else None
        )
        slope_pct = slope_tan * 100 if not np.isnan(slope_tan) else None

        return {
            "slope_tan": None if np.isnan(slope_tan) else slope_tan,
            "slope_deg": slope_deg,
            "slope_pct": slope_pct,
            "ndvi": None if np.isnan(ndvi) else ndvi,
            "ros": None if (np.isnan(ros0) or ros0 <= 0) else ros0,
            "grid_pos": (si, sj),
        }

    # -------------------- Printers --------------------
    def show_brief_summary(self) -> None:
        """สรุปผลแบบย่อ"""
        cb = self.get_cell_status_breakdown()
        start = self._get_start_conditions()

        total_cells = int(
            self.stats.get("total_cells", self.simulator.grid_x * self.simulator.grid_y)
        )
        burn_pct_all = float(
            self.stats.get(
                "burn_percentage_all",
                100.0
                * (cb["burned"]["cells"] + cb["burning"]["cells"])
                / max(1, total_cells),
            )
        )
        burned_area_ha = float(
            self.stats.get(
                "burned_area_ha",
                (cb["burned"]["area_m2"] + cb["burning"]["area_m2"]) / 10000.0,
            )
        )

        print("\n" + "=" * 50)
        print("🔥 FIRE SIMULATION RESULTS")
        print("=" * 50)
        print(f"Total cells: {total_cells:,}")

        # START POSITION
        print("\nจุดเริ่มต้นการจำลอง:")
        print(f"Lat/Lon: ({self.simulator.lat:.6f}, {self.simulator.lon:.6f})")
        if start["slope_deg"] is not None:
            print(
                f"ความชัน: {start['slope_pct']:.2f}% = {start['slope_deg']:.2f}° (tan={start['slope_tan']:.4f})"
            )
        else:
            print("ความชัน: N/A")
        print(f"NDVI: {_safe_float(start['ndvi'],4)}")

        # CELL STATUS BREAKDOWN
        print("\nCELL STATUS BREAKDOWN:")
        print(
            f"  ยังไม่ไหม้: {cb['unburned']['cells']:,} เซลล์ ({_fmt_area_m2(cb['unburned']['area_m2'])})"
        )
        print(
            f"  กำลังไหม้: {cb['burning']['cells']:,} เซลล์ ({_fmt_area_m2(cb['burning']['area_m2'])})"
        )
        print(
            f"  ไหม้แล้ว: {cb['burned']['cells']:,} เซลล์ ({_fmt_area_m2(cb['burned']['area_m2'])})"
        )
        print(
            f"  แนวกันไฟ: {cb['firebreak']['cells']:,} เซลล์ ({_fmt_area_m2(cb['firebreak']['area_m2'])})"
        )

        # LAST IGNITION POINT
        if self.last_point.get("found"):
            sim_mins = float(self.simulator.sim_time) / 60.0
            print(f"\nจุดสุดท้ายที่ไฟลามถึงภายในเวลาจำลอง ({sim_mins:.0f} นาที):")
            print(
                f"Lat: {self.last_point['lat']:.6f}  Lon: {self.last_point['lon']:.6f}"
            )
        else:
            print("\nไม่พบการลุกลามของไฟ")

    def show_detailed_summary(self) -> None:
        """สรุปผลแบบละเอียด"""
        self.show_brief_summary()

        ros = self.stats.get("ros_stats", {"count": 0, "mean": 0, "min": 0, "max": 0})
        print("\nROS STATISTICS:")
        print(f"  Valid cells: {ros['count']:,}")
        print(f"  Mean ROS: {ros['mean']:.6f} m/s")
        print(f"  Min ROS:  {ros['min']:.6f} m/s")
        print(f"  Max ROS:  {ros['max']:.6f} m/s")

        start = self._get_start_conditions()
        print("\nSTARTING POINT CONDITIONS:")
        print(f"  Grid position: {start['grid_pos']}")
        print(f"  Coordinates: ({self.simulator.lat:.6f}, {self.simulator.lon:.6f})")

        if start["slope_deg"] is not None:
            print(f"  Slope: {start['slope_pct']:.2f}% ({start['slope_deg']:.2f}°)")
        else:
            print("  Slope: N/A")

        print(f"  NDVI: {_safe_float(start['ndvi'], 4)}")
        print(f"  Initial ROS: {_safe_float(start['ros'], 6)} m/s")

        print("\nSIMULATION PARAMETERS:")
        print(f"  Grid size: {self.simulator.grid_x} x {self.simulator.grid_y}")
        print(f"  Cell size: {self.simulator.cell_size} m")
        print(f"  Wind speed: {self.simulator.wind_speed} m/s")
        print(f"  Wind direction: {self.simulator.wind_dir}°")
        print(f"  Simulation time: {self.simulator.sim_time/60:.1f} min")
        print(f"  Time step (dt): {self.simulator.dt} s")
        print("=" * 50)
