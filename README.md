# VisionTags EDU

A minimal end-to-end demo of explainable image classification:

- Mobile app (Expo React Native + TypeScript): capture/upload an image, show top-k class bars, Grad-CAM heatmap overlay with a custom opacity slider (no expo-slider), and a 2D embedding scatter with neighbors.
- Backend (Flask + PyTorch): runs a pretrained MobileNetV3, returns top-k, a transparent Grad-CAM heatmap PNG (base64), a 2D PCA embedding, and stores predictions for a mini confusion matrix.

## Repo layout

- `mobile/` – Expo app (TypeScript)
- `backend/` – Flask + PyTorch API

## Backend

Prereqs: Python 3.10+, virtualenv recommended.

1. Install deps

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

2. Run the API

```bash
python app.py
# listens on http://localhost:5050
```

Endpoints

- `POST /analyze` (multipart/form-data: `image`):
- Response:

```json
{
  "topk": [{"label": "Labrador retriever", "p": 0.62}, ...],
  "heatmap_png_b64": "data:image/png;base64,...",  // transparent heatmap
  "embedding": { "x": 0.12, "y": -0.44 },
  "neighbors": [ {"x": 0.10, "y": -0.46, "thumb": "data:image/jpeg;base64,...", "label": "golden retriever" } ],
  "id": "pred_abc123",
  "model": "mobilenet_v3_small@torchvision"
}
```

- `POST /feedback` JSON: `{ "predictionId": "pred_abc123", "trueLabel": "golden retriever" }`
- `GET /metrics/summary` → `{ counts: {..}, confusion: [[..]], classes: [..] }`

Notes

- Uses SQLite (`data.db`) to store predictions, embeddings, thumbnails, and optional feedback (`true_label`).
- Embedding 2D coords are computed with a simple PCA over the last N=200 predictions and stored, so neighbors can be returned quickly.
- Grad-CAM is computed over MobileNetV3’s last conv block; the heatmap is returned as a transparent PNG sized to your image.

## Mobile (Expo + TypeScript)

Prereqs: Node 18+, Expo CLI (`npm i -g expo`), iOS/Android tooling as needed.

1. Install deps

```bash
cd mobile
npm install
```

2. Configure backend URL

- The app defaults to `http://localhost:5001`.
- For device testing, set `BACKEND_URL` env at build time or run the backend on your LAN IP and update the URL in `mobile/src/api.ts`.

3. Run

```bash
npm start
# then press i (iOS) or a (Android) or scan QR
```

Features in the app

- Top-k bar chart: simple `View`-based bars with percentages and a hint text.
- Grad-CAM overlay: original image with a transparent heatmap on top. Includes a toggle and a custom-built slider (`AlphaSlider`) — no `expo-slider` used.
- Embedding scatter: 2D plot ([-1,1] range) of your point and 5 neighbors.
- Feedback: "Was this correct?" yes/no. If no, enter a correct class; it is posted to `/feedback`.

## Dev/Partner workflow ideas

- You can change UI text/colors in `mobile/` (e.g., tweak palettes in components).
- Backend logging/metrics adjustments live in `backend/app.py`.
- Add a Learn screen in `mobile/` with short educational copy.

## Notes & Limitations

- First inference will download torchvision weights (network required).
- PCA/Grad-CAM are CPU-friendly; no training is performed.
- If you want a mini confusion matrix visual on mobile, fetch `GET /metrics/summary` and render a 5×5 grid.

## License

No explicit license provided; for course/demo use.

