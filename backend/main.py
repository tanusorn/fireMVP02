from fastapi import FastAPI

from api.fire_api import router as fire_router
from api.zone_api import router as zone_router
from api.math_api import router as math_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Firebreak Decision Support API")

app.include_router(fire_router)
app.include_router(zone_router)
app.include_router(math_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "API is running"}
