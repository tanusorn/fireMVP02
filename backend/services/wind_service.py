import requests


def fetch_wind_from_api_for_date(
    lat: float,
    lon: float,
    year: int,
    month: int,
    day: int,
    hour: int = 13,
):
    date_str = f"{year:04d}-{month:02d}-{day:02d}"

    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": date_str,
        "end_date": date_str,
        "hourly": "wind_speed_10m,wind_direction_10m",
        "timezone": "Asia/Bangkok",
        "wind_speed_unit": "ms",
    }

    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    target_time = f"{date_str}T{hour:02d}:00"
    times = data["hourly"]["time"]

    if target_time not in times:
        raise RuntimeError(f"Wind data not found at {target_time}")

    idx = times.index(target_time)

    speed = data["hourly"]["wind_speed_10m"][idx]
    direction = data["hourly"]["wind_direction_10m"][idx]

    delta = 1.0
    wind_min = max(speed - delta, 0.0)
    wind_max = speed + delta

    return wind_min, wind_max, direction


def fuzzy_wind(min_w: float, max_w: float) -> float:
    mid = (min_w + max_w) / 2.0
    return (min_w + 2 * mid + max_w) / 4.0
