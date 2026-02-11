FROM python:3.10-slim

# -------------------------
# System dependencies
# -------------------------
RUN apt-get update && apt-get install -y \
    wget \
    build-essential \
    ca-certificates \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# -------------------------
# Google Earth Engine credentials
# (ยังใช้แบบ file-based ได้)
# -------------------------
COPY credentials/earthengine-sa.json /secrets/earthengine-sa.json

# ⚠️ หมายเหตุ: ENV แบบนี้ Docker เตือนถูกต้อง
# production จริงควร inject จาก platform (Cloud Run / Fly.io)
ENV GOOGLE_APPLICATION_CREDENTIALS=/secrets/earthengine-sa.json
ENV GCP_PROJECT=dulcet-opus-464616-k1

# -------------------------
# Application
# -------------------------
WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir --default-timeout=300 -r requirements.txt

COPY . .

# -------------------------
# Runtime
# -------------------------
# สำคัญมาก: ต้อง bind 0.0.0.0
# ใช้ PORT เพื่อรองรับ Cloud Run / Fly.io
EXPOSE 8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
