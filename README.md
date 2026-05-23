# DATA315_FinalProject
Alex, Arnav, Karsten, Gabriel DATA 315 Data Interaction Spring 2026 Final Project

# DEPLOYMENT INSTRUCTIONS

The data should all be integrated within the Github. No additional steps are needed.

## Environment Set up
To initialize the Python environment, run the following from the project root. All Python libraries are already included in pyproject.toml.

```bash
uv sync
source .venv/bin/activate
```

To install the frontend dependencies, run:

```bash
npm install
```

## Backend Start

Run the backend from the project root. This starts the FastAPI server on http://localhost:8000.

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

If you prefer not to activate the virtual environment manually, you can run the same server with:

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend Start

Run the frontend development server from the project root:

```bash
npm run dev
```

This starts the Vite app, usually at http://localhost:5173. The frontend proxies `/api` requests to the backend at http://localhost:8000.

## Frontend Build

To create a production frontend build, run:

```bash
npm run build
```

The production files will be written to the `dist/` directory.

To preview the production build locally, run:

```bash
npm run preview
```

## Backend Build Notes

The backend does not use `npm run build`. It is a FastAPI application that runs directly with `uvicorn`.

For local development, use:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

For a production-style backend launch without auto-reload, use:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Recommended Local Workflow

Use two terminals from the project root:

Terminal 1:

```bash
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2:

```bash
npm run dev
```
