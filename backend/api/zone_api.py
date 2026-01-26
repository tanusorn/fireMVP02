from fastapi import APIRouter
from pydantic import BaseModel
from store.zone_store import save_zone, get_zones, clear_zones

router = APIRouter(prefix="/zone", tags=["Zone"])


class ZoneRequest(BaseModel):
    zone: str
    area: float


@router.post("/zone/save")
def save(req: ZoneRequest):
    save_zone(req.zone, req.area)
    return {"message": f"Zone {req.zone} saved", "zones": get_zones()}


@router.post("/zone/clear")
def clear():
    clear_zones()
    return {"message": "All zones cleared"}
