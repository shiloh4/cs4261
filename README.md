# VisionTags EDU — Mobile Explainable AI Demo

## Overview

- Mobile app (Expo React Native) that classifies a photo and shows simple explanations: top‑k class bars, Grad‑CAM heatmap overlay, and a 2D embedding dot with nearby neighbors. Optional feedback feeds a mini confusion matrix.
- Backend (Flask + PyTorch, MobileNetV3 Small) provides inference and explainability artifacts. Predictions are stored in SQLite for simple metrics.

## Repo Structure

- `backend/` — Flask app, PyTorch model, SQLite persistence
- `ml-explainer/` — Expo React Native client

## Quick Start

### Backend

1) Python 3.10+ recommended.

2) Install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

3) Run the server (defaults to `PORT=5050`):

```bash
python backend/app.py
```

4) Health check:

```bash
curl http://localhost:5050/health
# → { "ok": true }
```

### Mobile App (Expo)

1) Node 18+ and npm.

2) Install dependencies:

```bash
cd ml-explainer
npm install
```

3) Point the app at your backend and start Expo:

```bash
# Simulator or web
EXPO_PUBLIC_API_URL="http://localhost:5050" npm run start

# Physical device (use your computer's LAN IP)
EXPO_PUBLIC_API_URL="http://192.168.1.20:5050" npm run start
```

Alternatively, edit `ml-explainer/app.json` and set `expo.extra.apiUrl`.

4) In the Expo UI, open in an iOS/Android simulator or Expo Go. Then pick/take a photo → Analyze → view Results.

## Backend Details

### Model

- TorchVision MobileNetV3 Small (pretrained). Deterministic CPU inference.

### Explainability

- Top‑k: softmax over 1,000 ImageNet classes.
- Grad‑CAM: hooks last conv block, resizes to input, returned as a PNG data URI.
- Embedding: penultimate layer vector, reduced via PCA to 2D for a sliding window (default last 200 predictions).

### Storage

- SQLite database at `backend/data.db` (configurable via `DB_PATH`). Each prediction stores:
  - `id`, predicted `label` and `prob`, `timestamp`, optional `user`
  - `true_label` (after feedback), raw `embedding`, 2D coords (`emb2d_x`,`emb2d_y`)
  - tiny thumbnail `thumb_b64` (base64) for neighbor previews

### Environment Variables

- `PORT` (default `5050`): Flask server port
- `DB_PATH` (default `data.db`): SQLite file path
- `EMBED_WINDOW` (default `200`): size of the recent window used for PCA
- `MODEL_NAME` (default `resnet50`): backbone to use. Supported: `resnet50`, `mobilenet_v3_large`, `mobilenet_v3_small`, `efficientnet_b0`, `efficientnet_b3`, `convnext_tiny`.

Example:

```bash
MODEL_NAME=resnet50 python backend/app.py
```

## API Reference

### POST /analyze

- Content-Type: `multipart/form-data`
- Body:
  - `image`: file (jpg/png)
- Response 200:

```json
{
  "topk": [{ "label": "Labrador retriever", "p": 0.62 }],
  "heatmap_png_b64": "data:image/png;base64,...",
  "embedding": { "x": 0.12, "y": -0.44 },
  "neighbors": [
    { "x": 0.10, "y": -0.46, "thumb": "data:image/jpeg;base64,...", "label": "golden retriever" }
  ],
  "id": "pred_abc123",
  "model": "mobilenet_v3_small@torchvision"
}
```

- Example:

```bash
curl -F "image=@/path/to/photo.jpg" http://localhost:5050/analyze
```

### POST /feedback

- Content-Type: `application/json`
- Body:

```json
{ "predictionId": "pred_abc123", "trueLabel": "golden retriever" }
```

- Response 200:

```json
{ "ok": true }
```

### GET /metrics/summary

- Response 200:

```json
{
  "counts": { "dog": 12, "cat": 5 },
  "confusion": [[0, 2], [1, 4]],
  "classes": ["cat", "dog"]
}
```

### GET /health

- Response 200:

```json
{ "ok": true }
```

## Mobile App Features

### Screen A — Home

- Pick from gallery or take a photo (expo-image-picker)
- Uploads to `/analyze`, then navigates to Results

### Screen B — Results

- Top‑k class bar chart
- Grad‑CAM overlay with toggle and opacity slider
- Embedding mini‑scatter (your point highlighted, neighbors shown)
- “Was this correct?” prompt → sends `/feedback`

### Tab — Metrics

- Shows prediction counts and a small confusion matrix from `/metrics/summary`

## Configuration

- `ml-explainer/lib/api.ts` reads the API URL from `EXPO_PUBLIC_API_URL` or from `app.json` (`expo.extra.apiUrl`). Default is `http://localhost:5050`.
- On a real device, ensure the backend is reachable over LAN and use the computer’s IP, not `localhost`.

## Troubleshooting

- 400 from `/analyze`:
  - Must be `multipart/form-data` with key `image`. The mobile client handles this automatically; on web the client converts the picked asset to a `File` before appending.
  - Test with curl:
    ```bash
    curl -F "image=@/path/to/photo.jpg" http://<host>:5050/analyze
    ```
- Slow first request or blank heatmap:
  - First request loads the model; allow a few seconds on cold start.
- Empty neighbors/embedding:
  - Need at least 2+ predictions in the DB; PCA recomputes over the last `EMBED_WINDOW` rows.

## Development Notes

- CORS is enabled in the backend for development.
- Database is created automatically at startup; schema is in `backend/app.py`.
- Model and Grad‑CAM utilities are in `backend/model.py`.

## License

- Educational demo. No warranty; pretrained weights from TorchVision subject to their licenses.
