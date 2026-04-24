.PHONY: dev install build run stop test clean

# ── Local development (no Docker) ─────────────────────────────
install:
	cd api && pip install -r requirements.txt

dev:
	cd api && uvicorn main:app --reload --port 8000

# ── Docker ────────────────────────────────────────────────────
build:
	docker build -t trademark-engine .

run:
	docker compose up

stop:
	docker compose down

# ── Testing ───────────────────────────────────────────────────
test:
	cd api && python -m pytest tests/ -v 2>/dev/null || echo "No tests yet — add tests/test_similarity.py"

smoke:
	@echo "Running smoke tests against http://localhost:8000 ..."
	@curl -sf http://localhost:8000/api/v1/health | python3 -m json.tool
	@curl -sf -X POST http://localhost:8000/api/v1/similarity \
	     -H "Content-Type: application/json" \
	     -d '{"mark1":"APPLE","mark2":"APPEL"}' | python3 -m json.tool

# ── Deploy shortcuts ─────────────────────────────────────────
deploy-render:
	@echo "Push to GitHub, then connect the repo at render.com"
	@echo "Build command:  pip install -r api/requirements.txt"
	@echo "Start command:  uvicorn api.main:app --host 0.0.0.0 --port \$$PORT"

deploy-fly:
	fly deploy --dockerfile Dockerfile

# ── Housekeeping ─────────────────────────────────────────────
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; true
	find . -name "*.pyc" -delete 2>/dev/null; true
