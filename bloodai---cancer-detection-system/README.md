<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Blood Cancer Detection — Desktop/Local Demo

This repository contains a small demo application that classifies blood cell images using a Keras model served by a Flask backend and a TypeScript/Vite React frontend.

Quick overview:
- Backend: Flask app that loads `backend/keras_model.h5` and exposes a `/predict` endpoint.
- Frontend: React + Vite app in `src/` that uploads images and shows predictions.

Repository structure (important files):
- `backend/app.py` — Flask server and prediction logic
- `backend/keras_model.h5` — pretrained Keras model (required)
- `backend/labels.txt` — label mapping used by the backend
- `backend/requirements.txt` — Python dependencies for the backend
- `src/` — frontend source (React + TypeScript)
- `package.json` — frontend npm scripts and deps

## Prerequisites
- macOS / Linux / Windows
- Python 3.9+ (3.10 or 3.11 recommended)
- Node.js 18+ and npm
- Optional: a virtual environment tool (`venv`, `virtualenv`) and a GPU-enabled TensorFlow setup if you want GPU accel

## Run the backend (local)
1. Create and activate a Python virtual environment (recommended):

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Install Python dependencies:

```bash
pip install -r backend/requirements.txt
```

3. Ensure the model and labels exist:

```bash
ls backend/keras_model.h5 backend/labels.txt
```

4. Start the Flask backend (defaults: host 0.0.0.0, port 5000):

```bash
export FLASK_DEBUG=1
python backend/app.py
```

5. Health-check the backend in a new terminal:

```bash
curl http://127.0.0.1:5000/health
```

6. Test prediction (replace `image.jpg` with your image):

```bash
curl -X POST -F "file=@image.jpg" http://127.0.0.1:5000/predict
```

Notes:
- The backend expects images in RGB and will resize to the model input size (224x224).
- If the model file is large, ensure you have enough disk space and memory when loading it.

## Run the frontend (local)
1. Install frontend dependencies:

```bash
npm install
```

2. Start the Vite dev server:

```bash
npm run dev
```

3. Open the URL printed by Vite (typically `http://localhost:5173`) and use the UI to upload an image and get a prediction. The frontend is configured to call the backend; if backend runs on a different host/port, update the API URL in the frontend code.

## Notes on deployment
- For simple local testing the instructions above are sufficient.
- For production you may want to:
  - Serve the Flask app behind a production WSGI server (Gunicorn/uvicorn) and a reverse proxy (nginx).
  - Build the frontend (`npm run build`) and serve static assets from a CDN or via your backend.
  - Use a GPU-enabled TensorFlow build for faster inference if needed.

## Troubleshooting
- If TensorFlow fails to install on your platform, ensure your Python version and system packages match TensorFlow's requirements.
- If the backend fails to find the model, verify `backend/keras_model.h5` is present and readable.

If you'd like, I can add a Dockerfile and a simple `docker-compose.yml` to run backend+frontend together.

---
Updated: Backend improvements were added and pushed to branch `update-project` (see repo history).
