# proc2

Personal task/project workbook. Successor to `~/content/proc/{proc,overviews}`.
Local web app: FastAPI + HTMX + Postgres.

## Status (at ToW)

MVP in progress. Currently: FastAPI app with async Postgres connection
(lifespan-managed), first migration (tasks) created, no templates yet.

## Stack

- **Backend**: FastAPI (Python 3.12), managed with `uv`
- **DB**: Postgres 16 in Docker (`docker-compose.yml`), port **5433**
- **Migrations**: `dbmate` (migrations live in `./db/migrations/`)
- **Frontend**: server-rendered Jinja2 + HTMX (not wired up yet)

## Layout

```
proc2/
├── docker-compose.yml    # postgres (bind mount: ./pgdata)
├── pyproject.toml        # uv-managed deps
├── start.sh              # kill + restart uvicorn on :8011
├── .env                  # DATABASE_URL (gitignored)
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI app, async pg conn via lifespan
│   └── templates/        # (not yet created)
└── db/
    └── migrations/       # dbmate
        └── 20260415014419_create_tasks.sql
```

## Dev loop

```sh
# start postgres
sudo docker compose up -d

# run the app
uv run uvicorn app.main:app --reload --port 8011   # or ./start.sh
# → http://localhost:8011
```

`DATABASE_URL` in `.env`:
`postgres://proc2:proc2@localhost:5433/proc2?sslmode=disable`


## open a file in the editor
`cursor <file>`
- do this when you reference a file that the user needs to edit


## Context for next session

- Built from scratch — **not** reusing annal or any wizardry code.
- Design intentionally deferred. Current approach: get the thinnest possible
  frontend → backend → DB slice working, *then* design the data model.
- Source brief + glossary: `~/responses/proc2-index.md`
- User notes: top block of `~/content/proc/proc`
- Operator prefers walking through changes one step at a time
- Install dependencies yourself


# Appendended notes