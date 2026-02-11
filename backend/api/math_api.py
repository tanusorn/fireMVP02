from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict
from services.math_service import optimize_from_frontend

router = APIRouter(prefix="/math", tags=["Math Optimization"])


class OptimizeRequest(BaseModel):
    zones: Dict[str, float]  # {"A": 2400, "B": 1800}
    centers: list = None 


@router.post("/optimize")
def optimize_firebreak(payload: OptimizeRequest):
    """
    รับ zones จาก frontend โดยตรง
    """
    try:
        result = optimize_from_frontend(payload.zones, payload.centers)
        return {
            "status": "success",
            "result": result,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {e}")
