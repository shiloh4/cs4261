VisionTags EDU — Mobile Explainable AI Demo

Overview
- Mobile app (Expo React Native) that classifies a photo and shows simple explanations: top‑k class bars, Grad‑CAM heatmap overlay, and a 2D embedding dot with nearby neighbors. Optional feedback feeds a mini confusion matrix.
- Backend (Flask + PyTorch, MobileNetV3 Small) provides inference and explainability artifacts. Predictions are stored in SQLite for simple metrics.

Repo Structure
- `backend/`: Flask app, PyTorch model, SQLite persistence
- `ml-explainer/`: Expo React Native client

Quick Start
- Backend
  - Python 3.10+ recommended.
  - Install deps: `python -m venv .venv && source .venv/bin/activate && pip install -r backend/requirements.txt`
  - Run: `python backend/app.py` (defaults to `PORT=5050`)
  - Health check: `curl http://localhost:5050/health` → `{ "ok": true }`
- Mobile app
  - Node 18+ and npm.
  - `cd ml-explainer && npm install`
  - Tell the app where your backend runs:
    - Easiest: `EXPO_PUBLIC_API_URL="http://localhost:5050" npm run start`
    - Physical device: use your computer’s LAN IP, e.g. `EXPO_PUBLIC_API_URL="http://192.168.1.20:5050" npm run start`
    - Or edit `ml-explainer/app.json` → `expo.extra.apiUrl`
  - Open in iOS/Android simulator or Expo Go and try: pick/take a photo → Analyze → see Results.

Backend Details
- Model
  - TorchVision MobileNetV3 Small (pretrained). Deterministic CPU inference.
- Explainability
  - Top‑k: softmax over 1,000 ImageNet classes.
  - Grad‑CAM: last conv block, resized and returned as a PNG data URI.
  - Embedding: penultimate layer vector, reduced via PCA to 2D for recent window (default last 200).
- Storage
  - SQLite database at `backend/data.db` (configurable via `DB_PATH`). Each prediction row stores id, predicted label/prob, timestamp, optional user id, true label (if provided), raw embedding, 2D coords, and a tiny thumbnail (base64) for neighbor previews.
- Environment variables
  - `PORT` (default `5050`): Flask server port
  - `DB_PATH` (default `data.db`): SQLite file path
  - `EMBED_WINDOW` (default `200`): number of most recent predictions used to compute PCA window

API Reference
1) Analyze
- Method/Path: `POST /analyze`
- Content-Type: `multipart/form-data`
- Body: `image` (file)
- Response (200):
  {
    "topk": [{ "label": "Labrador retriever", "p": 0.62 }, ...],
    "heatmap_png_b64": "data:image/png;base64,...",
    "embedding": { "x": 0.12, "y": -0.44 },
    "neighbors": [
      { "x": 0.10, "y": -0.46, "thumb": "data:image/jpeg;base64,...", "label": "golden retriever" }
    ],
    "id": "pred_abc123",
    "model": "mobilenet_v3_small@torchvision"
  }
- Example:
  curl -F "image=@/path/to/photo.jpg" http://localhost:5050/analyze

2) Feedback
- Method/Path: `POST /feedback`
- Content-Type: `application/json`
- Body: { "predictionId": "pred_abc123", "trueLabel": "golden retriever" }
- Response (200): { "ok": true }

3) Metrics Summary
- Method/Path: `GET /metrics/summary`
- Response (200):
  {
    "counts": { "dog": 12, "cat": 5, ... },
    "confusion": [[...],[...]],
    "classes": ["cat", "dog", ...]
  }

4) Health
- Method/Path: `GET /health`
- Response (200): { "ok": true }

Mobile App (Expo) Features
- Screen A (Home):
  - Pick from gallery or take a photo (expo-image-picker)
  - Uploads to `/analyze`, then navigates to Results
- Screen B (Results):
  - Top‑k class bar chart
  - Grad‑CAM overlay with toggle and opacity slider
  - Embedding mini‑scatter (your point highlighted, neighbors shown)
  - “Was this correct?” prompt → sends `/feedback`
- Tab: Metrics
  - Shows prediction counts and a small confusion matrix from `/metrics/summary`

Configuration
- `ml-explainer/lib/api.ts`: Reads API URL from `EXPO_PUBLIC_API_URL` or `app.json` → `expo.extra.apiUrl` (default `http://localhost:5050`).
- If using a real device, ensure the backend is reachable from the device over LAN and use the computer’s IP (not `localhost`).

Troubleshooting
- 400 from `/analyze`:
  - Ensure request is `multipart/form-data` with key `image`. The mobile client handles this automatically; on web we convert the picked asset to a `File` before appending.
  - Test with curl: `curl -F "image=@/path/to/photo.jpg" http://<host>:5050/analyze`
- Timeouts or blank heatmap:
  - First request loads the model; allow a few seconds on cold start.
- Neighbors/embedding empty:
  - Need at least 2+ predictions in the DB; PCA recomputes over the last `EMBED_WINDOW` rows.

Development Notes
- CORS is enabled in the backend for development.
- Database is created automatically at startup; schema is in `backend/app.py`.
- Model and Grad‑CAM utilities are in `backend/model.py`.

License
- Educational demo. No warranty; pretrained weights from TorchVision subject to their licenses.

