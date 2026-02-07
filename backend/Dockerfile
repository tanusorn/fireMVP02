FROM python:3.10-slim

# system deps
RUN apt-get update && apt-get install -y \
    wget \
    build-essential \
    ca-certificates \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# copy service account
COPY credentials/earthengine-sa.json /secrets/earthengine-sa.json

# set env for google auth
ENV GOOGLE_APPLICATION_CREDENTIALS=/secrets/earthengine-sa.json
ENV GCP_PROJECT=dulcet-opus-464616-k1



# gurobi
WORKDIR /opt
RUN wget https://packages.gurobi.com/12.0/gurobi12.0.3_linux64.tar.gz \
    && tar -xvf gurobi12.0.3_linux64.tar.gz \
    && mv gurobi1203 gurobi

ENV GUROBI_HOME=/opt/gurobi/linux64
ENV PATH=$GUROBI_HOME/bin:$PATH
ENV LD_LIBRARY_PATH=$GUROBI_HOME/lib

# app
WORKDIR /app
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir --default-timeout=300 -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
