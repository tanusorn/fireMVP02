from fastapi import APIRouter, HTTPException
from services.math_service import optimize_from_store

router = APIRouter(prefix="/math", tags=["Math Optimization"])


@router.post("/optimize")
def optimize_firebreak():
    """
    เรียก optimization โดยใช้ zones ที่ถูกบันทึกจาก UI (dropdown)
    - ใช้ Z1, Z2, Weighted Sum เหมือนใน math_model
    """
    try:
        result = optimize_from_store()
        return {
            "status": "success",
            "result": result,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {e}")
