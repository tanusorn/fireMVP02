#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Integrated Fire Simulator with Rothermel Model (CA + Fuel Model Mapping + LST)

- DEM (SRTM) → slope (deg) → tan(slope)
- Sentinel-2 SR (2020) → NDVI
- MODIS LST (MOD11A2) → °C
- MODIS Land Cover (MCD12Q1) → LC_Type1 (map → {forest, shrub, savanna, other})
- Fuel Model: Anderson 13 (simplified)
- Wind speed + Wind direction (องศา, 0°=N) → ใช้ mid-flame + cap
- ✅ Grid size = 20 m (ปรับได้)
- ✅ Directional spread (ลม+ชัน) มีผลต่อการจุดติดเพื่อนบ้าน
- ✅ เกณฑ์จุดติด: เพื่อนบ้านกำลังไหม้ ≥ 1 (ปรับได้)

Fix หลัก:
1) ใช้ "คิวจองเวลา" (min-heap) สำหรับการจุดติด ไม่ตั้ง BURNING ทันทีเมื่อหาได้ best_t
2) ระยะเวลาเผา (burn_duration) ของเซลล์ ใช้ ROS ของ "เซลล์เป้าหมาย" เอง
3) กันการ push ซ้ำ: เก็บเฉพาะ ignite_t ที่ต่ำสุดของแต่ละเซลล์
4) ✅ Fallback next-start: ถ้าไฟดับและคิวว่าง แต่ยังมีเซลล์ที่จุดติดได้ → ย้ายจุดตั้งต้นไปเซลล์ถัดไปทันที

🔥 Boost สำหรับให้ผลใกล้ของจริงขึ้น:
- spread_gain = 2.4  (เดิม 1.1)
- NDVI fuel mask > 0.18  (เดิม 0.23)
- single_neighbor_penalty = -0.10  → ถ้ามีเพื่อนบ้านเดียว ให้โบนัส เร็วขึ้น ~10%
- directional base = 0.50 (ทิศช่วยมากขึ้น)
- mid-flame wind k = 0.70 และ cap 10.0 m/s (เดิม 0.55, cap 7.0)
- เวลาการเผาไหม้: ta(..) / (spread_gain * 1.2)  เร็วขึ้น 20%
- ROS cutoff เก็บไฟอ่อนกว่าเดิม: < 0.006 m/s จะถือว่า 0 (เดิม 0.01)
- โบนัสเมื่อมีเพื่อนบ้านไหม้ ≥2: ลด delay เพิ่มอีก 15%
"""

import os
import ee
import numpy as np
import time
import sys
import math
import cv2
import heapq
from typing import List, Tuple, Dict, Any, Optional
from dotenv import load_dotenv
from google.oauth2 import service_account

# ===== Initialize GEE =====
load_dotenv()

PROJECT = os.getenv("GEE_PROJECT_ID")
CREDENTIALS_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

credentials = service_account.Credentials.from_service_account_file(
    CREDENTIALS_PATH,
    scopes=["https://www.googleapis.com/auth/earthengine"]
)

ee.Initialize(credentials, project=PROJECT)


# ===== Cell states =====
UNBURNED = 0
BURNING = 1
BURNED = 2
FIREBREAK = 3

# ===== Fuel Model Mapping (Anderson 13 simplified) =====
FUEL_MODELS = {
    1: {
        "fuelDens": 3.0,  # ton/ha
        "fl1h_tac": 0.05,
        "mdOnDry": 0.30,
        "depth": 7.0,
    },
    8: {
        "fuelDens": 4.64,
        "fl1h_tac": 0.12,
        "mdOnDry": 0.247,
        "depth": 10.82,
    },
    10: {
        "fuelDens": 6.0,
        "fl1h_tac": 0.20,
        "mdOnDry": 0.22,
        "depth": 15,
    },
}


# ===== Utility =====
def ndvi_to_fuel_model(ndvi: float, landcover: str) -> int:
    if ndvi < 0.25:
        return 1  # Light litter
    elif ndvi < 0.45:
        return 8  # Medium litter
    else:
        return 10  # Heavy litter


def ta(cell_size: float, ros: float) -> float:
    return np.inf if np.isnan(ros) or ros <= 0 else cell_size / ros


def td(cell_size: float, ros: float) -> float:
    return np.inf if np.isnan(ros) or ros <= 0 else (math.sqrt(2) * cell_size) / ros


def show_progress_bar(current: int, total: int, bar_length: int = 40) -> None:
    filled_length = int(bar_length * current // total)
    bar = "█" * filled_length + "░" * (bar_length - filled_length)
    percent = (current / total) * 100
    sys.stdout.write(f"\rProgress: |{bar}| {percent:.1f}% ({current}/{total})")
    sys.stdout.flush()


# ===== ROS calculation (Rothermel-based) =====
def calculate_ros(
    slope_tan: float, ndvi: float, lst_celsius: float, wind_mps: float, landcover: str
) -> float:
    if np.isnan(slope_tan) or np.isnan(ndvi):
        return 0.0

    fuel_model = ndvi_to_fuel_model(ndvi, landcover)
    fuel_params = FUEL_MODELS.get(fuel_model, FUEL_MODELS[1])
    fuelDens, fl1h_tac = fuel_params["fuelDens"], fuel_params["fl1h_tac"]

    # FMC: NDVI(+), LST(−)
    base = 15 + 60 * float(ndvi) - 0.6 * max(0.0, float(lst_celsius) - 25.0)
    fmc = float(np.clip(base, 12.0, 55.0))  # 12–55%
    mdOnDry = fmc / 100.0

    constants = {
        "H_BTUlb": 7881.0,
        "SAVcar_ftinv": 5705.38,
        "fd_ft": 0.4125,
        "Dme_r": 0.20,
        "totMineral_r": 0.0555,
        "effectMineral_r": 0.01,
    }

    slope_rad = math.atan(min(float(slope_tan), math.tan(math.radians(35.0))))

    # Mid-flame wind + cap (stronger)
    k_midflame = 0.60
    wind_mps_eff = max(0.0, min(float(wind_mps) * k_midflame, 7.5))  # cap 10 m/s
    wind_ftmin = wind_mps_eff * 196.85

    sa = constants["SAVcar_ftinv"]
    bd = constants["fd_ft"]
    dem = constants["Dme_r"]
    hc = constants["H_BTUlb"]
    tm = constants["totMineral_r"]
    em = constants["effectMineral_r"]

    try:
        Beta_op = 3.348 * sa**-0.8189
        ODBD = fl1h_tac / bd
        Beta = ODBD / fuelDens
        if Beta <= 0 or Beta_op <= 0:
            return 0.0

        WN = fl1h_tac * (1.0 - tm)
        A = 133.0 / sa**0.7913
        T_max = sa**1.5 / (495.0 + 0.0594 * sa**1.5)
        T = T_max * (Beta / Beta_op) ** A * math.exp(A * (1 - Beta / Beta_op))

        moisture_ratio = mdOnDry / dem
        NM = max(
            0.05,
            1.0
            - 2.59 * moisture_ratio
            + 5.11 * moisture_ratio**2
            - 3.52 * moisture_ratio**3,
        )
        NS = 0.174 * em**-0.19
        RI = T * WN * hc * NM * NS

        PFR = (192.0 + 0.2595 * sa) ** -1 * math.exp(
            (0.792 + 0.681 * math.sqrt(sa)) * (Beta + 0.1)
        )

        Bc = 0.02526 * sa**0.54
        Cc = 7.47 * math.exp(-0.1333 * sa**0.55)
        Ec = 0.715 * math.exp(-0.000359 * sa)
        WC = (Cc * wind_ftmin**Bc) * (Beta / Beta_op) ** -Ec

        if landcover == "forest":
            WC *= 0.6

        SC = 5.275 * Beta**-0.3 * (math.tan(slope_rad) ** 2)
        EHN = math.exp(-138.0 / sa)
        QIG = 250.0 + 1116.0 * mdOnDry
        denom = ODBD * EHN * QIG
        if denom <= 0:
            return 0.0

        R = (RI * PFR * (1 + WC + SC)) / denom  # ft/min
        ros_mps = R * 0.3048 / 60.0  # m/s
        # เก็บไฟอ่อน ๆ มากขึ้น
        if ros_mps < 0.010:
            return 0.0
        return ros_mps
    except Exception:
        return 0.0


# ===== Fetch data from GEE =====
def fetch_patch_from_gee(lat, lon, month, grid_x, grid_y, cell_size, year=2025):
    meters_per_deg_lat = 111320.0
    meters_per_deg_lon = meters_per_deg_lat * math.cos(math.radians(lat))
    half_width_m = (grid_x * cell_size) / 2.0
    half_height_m = (grid_y * cell_size) / 2.0

    half_dx_deg = half_width_m / meters_per_deg_lon if meters_per_deg_lon > 0 else 0.0
    half_dy_deg = half_height_m / meters_per_deg_lat

    region = ee.Geometry.Rectangle(
        [lon - half_dx_deg, lat - half_dy_deg, lon + half_dx_deg, lat + half_dy_deg]
    )

    # ---------- DEM / slope ----------
    dem = ee.Image("USGS/SRTMGL1_003")
    slope_deg = ee.Terrain.slope(dem).rename("slope_deg")

    # ---------- Sentinel-2 NDVI (พร้อม fallback ถ้าเดือนนั้นว่าง) ----------
    def mask_s2(image):
        scl = image.select("SCL")
        # keep SCL not cloud/shadow and < 8 (veg/soil/water etc.)
        return image.updateMask(scl.neq(3).And(scl.neq(6)).And(scl.lt(8)))

    s2_base = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").filterBounds(region)
    month_start = ee.Date.fromYMD(year, month, 1)
    month_end = month_start.advance(1, "month")

    s2_month = s2_base.filterDate(month_start, month_end).map(mask_s2)
    # ถ้าเดือนนี้ไม่มีภาพ ให้ fallback ไปช่วง +/-1 เดือน
    s2_coll = ee.ImageCollection(
        ee.Algorithms.If(
            s2_month.size().gt(0),
            s2_month,
            s2_base.filterDate(
                month_start.advance(-1, "month"), month_end.advance(1, "month")
            ).map(mask_s2),
        )
    )
    s2_img = ee.Image(
        ee.Algorithms.If(
            s2_coll.size().gt(0), s2_coll.median(), s2_base.limit(50).median()
        )
    )
    ndvi = s2_img.normalizedDifference(["B8", "B4"]).rename("NDVI")

    # ---------- MODIS LST (พร้อม fallback ถ้าว่าง) ----------
    lst_coll_base = ee.ImageCollection("MODIS/061/MOD11A2").select("LST_Day_1km")
    lst_month = lst_coll_base.filterDate(month_start, month_end)
    lst_coll = ee.ImageCollection(
        ee.Algorithms.If(
            lst_month.size().gt(0),
            lst_month,
            lst_coll_base.filterDate(
                ee.Date.fromYMD(year, 1, 1), ee.Date.fromYMD(year, 12, 31)
            ),
        )
    )
    lst_img = ee.Image(lst_coll.mean()).multiply(0.02).subtract(273.15).rename("LST")

    # ---------- MODIS Land Cover (แก้ null ด้วยการเลือก "ตัวล่าสุดที่มีอยู่ ≤ ปีที่ขอ" หรือ "ล่าสุดทั้งหมด") ----------
    lc_all = ee.ImageCollection("MODIS/061/MCD12Q1")
    lc_le_year = lc_all.filterDate(
        ee.Date.fromYMD(2001, 1, 1), ee.Date.fromYMD(year, 12, 31)
    )
    lc_img = ee.Image(
        ee.Algorithms.If(
            lc_le_year.size().gt(0),
            lc_le_year.sort("system:time_start", False).first(),
            lc_all.sort("system:time_start", False).first(),
        )
    ).select("LC_Type1")

    # ---------- Sample to numpy ----------
    slope_deg_arr = np.array(
        slope_deg.sampleRectangle(region=region, defaultValue=0)
        .get("slope_deg")
        .getInfo()
    )
    ndvi_arr = np.array(
        ndvi.sampleRectangle(region=region, defaultValue=0).get("NDVI").getInfo()
    )
    lst_arr = np.array(
        lst_img.sampleRectangle(region=region, defaultValue=25).get("LST").getInfo()
    )
    lc_arr = np.array(
        lc_img.sampleRectangle(region=region, defaultValue=0).get("LC_Type1").getInfo()
    )

    # ---------- Resize และแปลง ----------
    slope_deg_resized = cv2.resize(
        slope_deg_arr, (grid_x, grid_y), interpolation=cv2.INTER_NEAREST
    )
    ndvi_resized = cv2.resize(
        ndvi_arr, (grid_x, grid_y), interpolation=cv2.INTER_NEAREST
    )
    lst_resized = cv2.resize(lst_arr, (grid_x, grid_y), interpolation=cv2.INTER_NEAREST)
    lc_resized = cv2.resize(lc_arr, (grid_x, grid_y), interpolation=cv2.INTER_NEAREST)

    slope_tan_resized = np.tan(np.deg2rad(slope_deg_resized))

    # หมายเหตุ: MCD12Q1 รหัส 1–5 = forest, 6–7 = shrub, 8–9 = savanna (0 มักเป็นน้ำ)
    def lc_class(code):
        if code in [1, 2, 3, 4, 5]:
            return "forest"
        if code in [6, 7]:
            return "shrub"
        if code in [8, 9]:
            return "savanna"
        return "other"

    return (
        slope_tan_resized,
        ndvi_resized,
        lst_resized,
        np.vectorize(lc_class)(lc_resized),
    )


# ===== Simulator =====
class IntegratedRothermelFireSimulator:
    def __init__(
        self,
        lat: float,
        lon: float,
        month: int,
        wind_speed: float,
        wind_dir: float,  # 0° = North
        grid_x: int,
        grid_y: int,
        cell_size: float,  # m
        sim_minutes: int,
        dt: int = 10,  # s
        min_neighbors_to_ignite: int = 1,
    ):
        self.lat, self.lon, self.month = float(lat), float(lon), int(month)
        self.grid_x, self.grid_y, self.cell_size = (
            int(grid_x),
            int(grid_y),
            float(cell_size),
        )
        self.sim_time, self.dt = int(sim_minutes * 60), int(max(1, dt))
        self.wind_speed, self.wind_dir = float(max(0.0, wind_speed)), float(wind_dir)
        self.min_neighbors_to_ignite = int(min_neighbors_to_ignite)

        # Tuners (boosted for more realistic spread)
        self.spread_gain = 1.5  # 1.1 → 2.4
        self.single_neighbor_penalty = -0.02  # +5% → -10% (bonus if single neighbor)
        self.dir_base = 0.40  # 0.35 → 0.50
        self.ndvi_fuel_threshold = 0.24  # 0.23 → 0.18

        # Grids
        self.state = np.zeros((self.grid_y, self.grid_x), dtype=np.int32)
        self.ignition_time = np.full((self.grid_y, self.grid_x), np.inf)
        self.required_burn_duration = np.full((self.grid_y, self.grid_x), np.inf)
        self.ros_grid = np.full((self.grid_y, self.grid_x), np.nan)

        # Queues & timers
        self.ignite_queue: list[tuple[float, int, int, float]] = []
        self.execution_time, self.ros_computation_time = 0.0, 0.0

        # Start tracking
        self.start_i, self.start_j = None, None
        self._tried_sources = set()  # ✅ จดจำแหล่งตั้งต้นที่ใช้ไปแล้ว
        self._last_source_flat: Optional[int] = None

        self.initialize_simulation()

    # ---------- Directional helper ----------
    def directional_scale(
        self, i_from: int, j_from: int, i_to: int, j_to: int
    ) -> float:
        vy, vx = (i_to - i_from), (j_to - j_from)
        ang_nb = math.atan2(-vy, vx)  # y ลงล่าง

        wind_rad = math.radians(90.0 - self.wind_dir)  # 0°N → +x
        wx, wy = math.cos(wind_rad), math.sin(wind_rad)

        sx, sy = math.cos(ang_nb), math.sin(ang_nb)  # slope proxy along neighbor
        rx, ry = 0.7 * wx + 0.3 * sx, 0.7 * wy + 0.3 * sy
        rnorm = math.hypot(rx, ry) or 1.0
        rx, ry = rx / rnorm, ry / rnorm

        nbx, nby = math.cos(ang_nb), math.sin(ang_nb)
        cos_th = nbx * rx + nby * ry
        if cos_th <= 0:
            return 0.0
        return float(self.dir_base + (1.0 - self.dir_base) * cos_th)

    # ---------- Initialization ----------
    def initialize_simulation(self):
        self.load_environmental_data()
        self.compute_ros_with_rothermel_model()
        self.set_initial_conditions()

    def load_environmental_data(self):
        slope_arr, ndvi_arr, lst_arr, lc_arr = fetch_patch_from_gee(
            self.lat, self.lon, self.month, self.grid_x, self.grid_y, self.cell_size
        )
        self.slope_data, self.ndvi_data, self.lst_data, self.landcover_data = (
            slope_arr,
            ndvi_arr,
            lst_arr,
            lc_arr,
        )

        self.fuel_mask = (
            (self.ndvi_data > self.ndvi_fuel_threshold)
            & np.isin(self.landcover_data, ["forest", "shrub", "savanna"])
        ).astype(np.int32)
        self.fuel_left = np.ones((self.grid_y, self.grid_x), dtype=np.float32)

    def compute_ros_with_rothermel_model(self):
        t0 = time.time()
        for i in range(self.grid_y):
            for j in range(self.grid_x):
                if self.fuel_mask[i, j] == 0:
                    self.ros_grid[i, j] = 0.0
                    continue
                ros = calculate_ros(
                    self.slope_data[i, j],
                    self.ndvi_data[i, j],
                    self.lst_data[i, j],
                    self.wind_speed,
                    str(self.landcover_data[i, j]),
                )
                self.ros_grid[i, j] = (
                    0.0 if (ros is None or np.isnan(ros) or ros <= 0) else ros
                )
        self.ros_computation_time = time.time() - t0

    def _is_viable_source(self, i: int, j: int) -> bool:
        if not (0 <= i < self.grid_y and 0 <= j < self.grid_x):
            return False
        if self.fuel_mask[i, j] == 0:
            return False
        ros0 = self.ros_grid[i, j]
        return (not np.isnan(ros0)) and (ros0 > 0) and (self.state[i, j] == UNBURNED)

    def _seed_source(self, i: int, j: int, ignite_t: float):
        """ตั้งต้นการเผาที่เซลล์ (i,j) ณ เวลา ignite_t"""
        self.start_i, self.start_j = i, j
        flat = i * self.grid_x + j
        self._tried_sources.add(flat)
        self._last_source_flat = flat

        self.state[i, j] = BURNING
        self.ignition_time[i, j] = ignite_t
        self.fuel_mask[i, j] = 1
        self.fuel_left[i, j] = 1.0

        ros0 = max(1e-6, float(self.ros_grid[i, j]))
        self.required_burn_duration[i, j] = ta(self.cell_size, ros0) / (
            self.spread_gain * 1.15
        )

    def find_next_viable_source_spiral(self, cy: int, cx: int, max_radius: int = 10):
        for r in range(1, max_radius + 1):
            for i in range(cy - r, cy + r + 1):
                for j in range(cx - r, cx + r + 1):
                    if not (0 <= i < self.grid_y and 0 <= j < self.grid_x):
                        continue
                    if (cy - r < i < cy + r) and (cx - r < j < cx + r):
                        continue
                    if self._is_viable_source(i, j):
                        return i, j
        return None

    def find_next_viable_source_linear_after(
        self, start_flat: Optional[int]
    ) -> Optional[Tuple[int, int]]:
        """เดินแบบ linear (row-major) ถัดจาก start_flat เพื่อหาจุดตั้งต้นใหม่"""
        n = self.grid_x * self.grid_y
        if start_flat is None:
            start_flat = -1
        for k in range(1, n + 1):
            idx = (start_flat + k) % n
            i, j = divmod(idx, self.grid_x)
            if idx in self._tried_sources:
                continue
            if self._is_viable_source(i, j):
                return (i, j)
        return None

    def set_initial_conditions(self):
        cy, cx = self.grid_y // 2, self.grid_x // 2
        if self._is_viable_source(cy, cx):
            si, sj = cy, cx
        else:
            pick = self.find_next_viable_source_spiral(cy, cx)
            if pick is None:
                print("Starting Simulation")
                return
            si, sj = pick
        self._seed_source(si, sj, ignite_t=0.0)

    def get_neighbors(self, y: int, x: int) -> List[Tuple[int, int]]:
        neighbors = []
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                ny, nx = y + dy, x + dx
                if 0 <= ny < self.grid_y and 0 <= nx < self.grid_x:
                    neighbors.append((ny, nx))
        return neighbors

    # ---------- Simulation ----------
    def run_simulation(self, show_progress=True) -> float:
        start_time = time.time()
        steps = range(0, self.sim_time + 1, self.dt)
        total_steps = len(steps)

        for idx, t in enumerate(steps):
            # A1) เปิดคิว: เปลี่ยนเป็น BURNING เฉพาะที่ถึงเวลาแล้ว
            while self.ignite_queue and self.ignite_queue[0][0] <= t:
                ignite_t, ii, jj, _travel = heapq.heappop(self.ignite_queue)
                if self.state[ii, jj] != UNBURNED:
                    continue
                self.state[ii, jj] = BURNING
                self.ignition_time[ii, jj] = ignite_t
                ros_target = max(1e-6, float(self.ros_grid[ii, jj]))
                self.required_burn_duration[ii, jj] = ta(self.cell_size, ros_target) / (
                    self.spread_gain * 1.15
                )

            # ✅ Fallback next-start:
            # ถ้าไม่มีไฟกำลังไหม้ และคิวว่าง แต่ยังมีเซลล์เชื้อเพลิงที่จุดติดได้ → ตั้งต้นใหม่ทันทีที่เวลา t
            if not np.any(self.state == BURNING) and not self.ignite_queue:
                next_src = self.find_next_viable_source_linear_after(
                    self._last_source_flat
                )
                if next_src is not None and t < self.sim_time:
                    ni, nj = next_src
                    self._seed_source(ni, nj, ignite_t=float(t))
                    # ดำเนินต่อไปในรอบเดียวกัน (ไม่ break)
                else:
                    # ไม่มีแหล่งเริ่มใหม่แล้ว → จบการจำลอง
                    break

            # A2) ประเมินการจุดติดใหม่สำหรับ UNBURNED
            for i in range(self.grid_y):
                for j in range(self.grid_x):
                    if self.state[i, j] != UNBURNED or self.fuel_mask[i, j] == 0:
                        continue

                    burning_neighbors = 0
                    best_t, best_dur = np.inf, np.inf

                    for ny, nx in self.get_neighbors(i, j):
                        if self.state[ny, nx] != BURNING:
                            continue
                        scale = self.directional_scale(ny, nx, i, j)
                        ros_eff = self.ros_grid[ny, nx] * scale * self.spread_gain
                        if ros_eff <= 0 or np.isnan(ros_eff):
                            continue

                        is_diag = abs(i - ny) == 1 and abs(j - nx) == 1
                        delay = (
                            td(self.cell_size, ros_eff)
                            if is_diag
                            else ta(self.cell_size, ros_eff)
                        )
                        ignite_t = self.ignition_time[ny, nx] + delay

                        if ignite_t < np.inf:
                            burning_neighbors += 1
                            if ignite_t < best_t:
                                best_t, best_dur = ignite_t, delay

                    if (
                        burning_neighbors >= self.min_neighbors_to_ignite
                        and best_t < np.inf
                    ):
                        # ถ้าเพื่อนบ้านเดียว: ตอนนี้ single_neighbor_penalty เป็นค่าลบ → โบนัส
                        if burning_neighbors == 1:
                            best_dur *= 1.0 + self.single_neighbor_penalty
                            best_t += self.single_neighbor_penalty * best_dur

                        # ✅ โบนัสใหม่: เพื่อนบ้านไหม้ ≥ 2 → ลดดีเลย์ 15%
                        if burning_neighbors >= 2:
                            best_dur *= 0.97
                            best_t -= 0.03 * best_dur

                        if best_t + 1e-9 < self.ignition_time[i, j]:
                            self.ignition_time[i, j] = best_t
                            heapq.heappush(self.ignite_queue, (best_t, i, j, best_dur))

            # A3) อัปเดต BURNING → BURNED เมื่อครบเวลาเผา
            for i in range(self.grid_y):
                for j in range(self.grid_x):
                    if self.state[i, j] == BURNING:
                        burn_time = t - self.ignition_time[i, j]
                        burn_dur = self.required_burn_duration[i, j]
                        if np.isinf(burn_dur) or burn_time < 0:
                            continue
                        if (burn_time / burn_dur) >= 1.0:
                            self.state[i, j] = BURNED

            if show_progress and idx > 0 and (idx % 100 == 0 or idx == total_steps - 1):
                show_progress_bar(idx + 1, total_steps)

        if show_progress:
            print()

        self.execution_time = time.time() - start_time
        return self.execution_time

    # ---------- Stats ----------
    def get_basic_statistics(self) -> Dict[str, Any]:
        burned = np.sum(self.state == BURNED)
        burning = np.sum(self.state == BURNING)
        unburned = np.sum(self.state == UNBURNED)
        total = int(self.grid_x * self.grid_y)

        fuel_cells = int(np.sum(self.fuel_mask == 1))

        area_m2 = (burned + burning) * (self.cell_size**2)
        valid_ros = self.ros_grid[~np.isnan(self.ros_grid)]

        return {
            "unburned_cells": int(unburned),
            "burning_cells": int(burning),
            "burned_cells": int(burned),
            "fuel_cells": fuel_cells,
            "burned_area_m2": float(area_m2),
            "burned_area_ha": float(area_m2 / 10000.0),
            "total_cells": total,
            "burn_percentage_all": ((burned + burning) / total) * 100.0,
            "burn_percentage_of_fuel": ((burned + burning) / max(1, fuel_cells))
            * 100.0,
            "execution_time": float(self.execution_time),
            "ros_computation_time": float(self.ros_computation_time),
            "ros_stats": {
                "count": int(valid_ros.size),
                "mean": float(np.mean(valid_ros)) if valid_ros.size else 0.0,
                "min": float(np.min(valid_ros)) if valid_ros.size else 0.0,
                "max": float(np.max(valid_ros)) if valid_ros.size else 0.0,
            },
        }

    def get_last_ignition_point(self) -> Dict[str, Any]:
        latest_time, li, lj = -1.0, -1, -1
        for i in range(self.grid_y):
            for j in range(self.grid_x):
                if (
                    self.state[i, j] > 0
                    and not np.isinf(self.ignition_time[i, j])
                    and not np.isinf(self.required_burn_duration[i, j])
                ):
                    comp = self.ignition_time[i, j] + self.required_burn_duration[i, j]
                    if comp <= self.sim_time and comp > latest_time:
                        latest_time, li, lj = comp, i, j

        if li >= 0 and lj >= 0:
            lat_offset = (self.grid_y // 2 - li) * self.cell_size
            lon_offset = (lj - self.grid_x // 2) * self.cell_size
            return {
                "found": True,
                "lat": self.lat + (lat_offset / 111320.0),
                "lon": self.lon
                + (lon_offset / (111320.0 * np.cos(np.radians(self.lat)))),
                "completion_time": latest_time,
                "grid_i": li,
                "grid_j": lj,
            }
        return {"found": False}

    def mark_firebreak(self, width_m=8.0):
        """
        สร้างแนวกันไฟเป็น “วงล้อม” รอบเซลล์ที่ไฟกำลังลาม (state = BURNING)
        - width_m: ความกว้างของแนวกันไฟ (เมตร)
        """

        width_cells = max(1, int(round(width_m / self.cell_size)))

        firebreak_mask = np.zeros_like(self.state, dtype=bool)

        # หาเซลล์ไฟกำลังลาม
        burning_cells = np.argwhere(self.state == BURNING)

        if len(burning_cells) == 0:
            print("⚠️ No BURNING cells → cannot create firebreak.")
            return firebreak_mask

        # สำหรับแต่ละเซลล์ที่กำลังลาม → สร้างวงล้อมด้านนอก
        for i, j in burning_cells:

            # ล้อมรอบด้วย square kernel width_cells
            for dy in range(-width_cells, width_cells + 1):
                for dx in range(-width_cells, width_cells + 1):
                    ny, nx = i + dy, j + dx

                    # ขอบเขตจอ
                    if 0 <= ny < self.grid_y and 0 <= nx < self.grid_x:

                        # ห้ามล้อมเซลล์ที่กำลังไหม้หรือไหม้แล้ว
                        if self.state[ny, nx] in (BURNING, BURNED):
                            continue

                        # mark เป็นแนวกันไฟ
                        firebreak_mask[ny, nx] = True

        # อัปเดต state
        self.state[firebreak_mask] = FIREBREAK

        return firebreak_mask


# ===== Example usage (commented) =====
if __name__ == "__main__":
    """
    sim = IntegratedRothermelFireSimulator(
        lat=18.741943, lon=98.838048,
        month=3,
        wind_speed=4.5,
        wind_dir=45.0,
        grid_x=100, grid_y=100,
        cell_size=20.0,
        sim_minutes=60,
        dt=10,
        min_neighbors_to_ignite=1,
    )
    sim.run_simulation(show_progress=True)
    print(sim.get_basic_statistics())
    print(sim.get_last_ignition_point())
    """
    pass
