from pydantic import BaseModel
from typing import Dict


class OptimizeRequest(BaseModel):
    zones: Dict[str, float]
