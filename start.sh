grep_kill -f "uvicorn app"
kill -9 "$(lsof -i :8011 | tail -1 | awk '{ print $2 }')"
uv run uvicorn app.main:app --reload --port 8011 &
