from fastapi import APIRouter
from pydantic import BaseModel
from services.fire_service import run_fire_model

# app = FastAPI(title="Fire Simulation API")

router = APIRouter(prefix="/fire", tags=["Fire Simulation"])


class FireRequest(BaseModel):
    lat: float
    lon: float
    year: int
    month: int
    day: int
    grid_x: int = 100
    grid_y: int = 100
    cell_size: int = 20
    sim_minutes: int = 15


@router.post("/fire/simulate")
def simulate(req: FireRequest):
    return run_fire_model(req.dict())
