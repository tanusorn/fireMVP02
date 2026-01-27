import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.fire_api import router as fire_router
from api.zone_api import router as zone_router
from api.math_api import router as math_router

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


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)