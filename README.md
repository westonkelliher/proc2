# proc2

Personal task/project workbook. Successor to `~/content/proc/{proc,overviews}`.
Local web app: FastAPI + HTMX + Postgres.

## Status

MVP in progress. Currently: minimal FastAPI hello-world, Postgres running in
Docker, no schema yet. Building end-to-end skeleton before any real design.

## Stack

- **Backend**: FastAPI (Python 3.12), managed with `uv`
- **DB**: Postgres 16 in Docker (`docker-compose.yml`), port **5433**
- **Migrations**: `dbmate` (migrations will live in `./migrations/`)
- **Frontend**: server-rendered Jinja2 + HTMX (not wired up yet)

## Layout

```
proc2/
├── docker-compose.yml    # postgres service (named volume: proc2-db-data)
├── pyproject.toml        # uv-managed deps
├── .env                  # DATABASE_URL + dbmate paths (gitignored)
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI app
│   └── templates/        # (not yet created)
└── migrations/           # (not yet created — dbmate)
```

## Dev loop

```sh
# start postgres
sudo docker compose up -d

# run the app
uv run uvicorn app.main:app --reload --port 8000
# → http://localhost:8000
```

`DATABASE_URL` in `.env`:
`postgres://proc2:proc2@localhost:5433/proc2?sslmode=disable`

## Context for next session

- Built from scratch — **not** reusing annal or any wizardry code.
- Design intentionally deferred. Current approach: get the thinnest possible
  frontend → backend → DB slice working, *then* design the data model.
- Source brief + glossary: `~/responses/proc2-index.md`
- Origin notes: top block of `~/content/proc/proc`
- Operator prefers walking through changes one step at a time (Rod mode —
  read-only Claude that guides but doesn't write source).
