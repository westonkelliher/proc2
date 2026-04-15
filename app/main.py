import os
from contextlib import asynccontextmanager

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set")

# lifespan context manager that connects on enter and closes on exit
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.conn = await psycopg.AsyncConnection.connect(DATABASE_URL)
    yield
    await app.state.conn.close()

app = FastAPI(lifespan=lifespan)

@app.get("/")
async def index():
    async with app.state.conn.cursor() as cur:
        await cur.execute("select now()")
        result = await cur.fetchone()
        return {"db_time": result[0]}
