import io
import os
import time
import sqlite3
from typing import List, Tuple

from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image
import numpy as np

from model import (
    predict_topk,
    compute_heatmap_overlay,
    get_embedding,
    pca2d,
    pil_to_base64_datauri,
    make_thumb,
    new_prediction_id,
    class_names,
    MODEL_NAME,
)


DB_PATH = os.environ.get('DB_PATH', 'data.db')
EMBED_WINDOW = int(os.environ.get('EMBED_WINDOW', '200'))


def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS predictions (
            id TEXT PRIMARY KEY,
            predicted_label TEXT,
            predicted_prob REAL,
            timestamp REAL,
            user TEXT,
            true_label TEXT,
            embedding TEXT,
            emb2d_x REAL,
            emb2d_y REAL,
            thumb_b64 TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def insert_prediction(
    pid: str,
    label: str,
    prob: float,
    embedding: np.ndarray,
    emb2d: Tuple[float, float] | None,
    thumb_b64: str,
    user: str | None = None,
):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO predictions (id, predicted_label, predicted_prob, timestamp, user, true_label, embedding, emb2d_x, emb2d_y, thumb_b64) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (
            pid,
            label,
            float(prob),
            time.time(),
            user or 'demo',
            None,
            ','.join(map(str, embedding.tolist())),
            float(emb2d[0]) if emb2d else None,
            float(emb2d[1]) if emb2d else None,
            thumb_b64,
        ),
    )
    conn.commit()
    conn.close()


def update_emb2d(ids: List[str], coords: np.ndarray):
    conn = get_db()
    cur = conn.cursor()
    for pid, (x, y) in zip(ids, coords):
        cur.execute("UPDATE predictions SET emb2d_x=?, emb2d_y=? WHERE id=?", (float(x), float(y), pid))
    conn.commit()
    conn.close()


def update_feedback(pid: str, true_label: str):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE predictions SET true_label=? WHERE id=?", (true_label, pid))
    conn.commit()
    conn.close()


def last_n_predictions(n: int) -> List[sqlite3.Row]:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM predictions ORDER BY timestamp DESC LIMIT ?", (n,))
    rows = cur.fetchall()
    conn.close()
    return list(reversed(rows))  # chronological order


def _parse_embedding_str(s: str) -> np.ndarray:
    return np.array(list(map(float, s.split(','))), dtype=float)


def _emb_len(row: sqlite3.Row) -> int:
    try:
        return len(row['embedding'].split(',')) if row['embedding'] else 0
    except Exception:
        return 0


def build_neighbors(pid: str, k: int = 5):
    rows = last_n_predictions(EMBED_WINDOW)
    row_map = {r['id']: r for r in rows}
    me = row_map.get(pid)
    if me is None:
        return []

    target_dim = _emb_len(me)
    rows_dim = [r for r in rows if _emb_len(r) == target_dim]
    if len(rows_dim) == 0:
        return []

    # If any missing coords among this dimension subset, recompute PCA just for them
    if any(r['emb2d_x'] is None or r['emb2d_y'] is None for r in rows_dim):
        vecs = [_parse_embedding_str(r['embedding']) for r in rows_dim]
        Z = pca2d(vecs)
        update_emb2d([r['id'] for r in rows_dim], Z)
        rows = last_n_predictions(EMBED_WINDOW)
        row_map = {r['id']: r for r in rows}
        rows_dim = [row_map[r['id']] for r in rows_dim if r['id'] in row_map]

    # Build neighbor list within same-dimension subset
    idx_map = {r['id']: i for i, r in enumerate(rows_dim)}
    i = idx_map.get(pid)
    if i is None:
        return []
    xs = np.array([r['emb2d_x'] for r in rows_dim], dtype=float)
    ys = np.array([r['emb2d_y'] for r in rows_dim], dtype=float)
    dx = xs - xs[i]
    dy = ys - ys[i]
    dist = np.sqrt(dx * dx + dy * dy)
    order = np.argsort(dist)
    out = []
    for j in order:
        if rows_dim[j]['id'] == pid:
            continue
        out.append({
            'x': float(xs[j]),
            'y': float(ys[j]),
            'thumb': rows_dim[j]['thumb_b64'],
            'label': rows_dim[j]['predicted_label'],
        })
        if len(out) >= k:
            break
    return out


def compute_confusion_and_counts(n: int = 200):
    rows = last_n_predictions(n)
    counts = {}
    for r in rows:
        counts[r['predicted_label']] = counts.get(r['predicted_label'], 0) + 1
    # Build class list from most common up to 5
    classes = [lbl for lbl, _ in sorted(counts.items(), key=lambda x: -x[1])[:5]]
    # Add any true labels present but not in top preds, up to 5
    for r in rows:
        tl = r['true_label']
        if tl and tl not in classes and len(classes) < 5:
            classes.append(tl)
    m = len(classes)
    idx = {c: i for i, c in enumerate(classes)}
    conf = [[0 for _ in range(m)] for _ in range(m)]
    for r in rows:
        if r['true_label']:
            tr = r['true_label']
            pr = r['predicted_label']
            if tr in idx and pr in idx:
                conf[idx[tr]][idx[pr]] += 1
    return counts, conf, classes


app = Flask(__name__)
CORS(app)
init_db()


@app.route("/")
def index():
    return "VisionTags EDU backend is running."


@app.get('/health')
def health():
    return jsonify({'ok': True})


@app.post('/analyze')
def analyze():
    if 'image' not in request.files:
        return jsonify({'error': 'image file missing'}), 400
    file = request.files['image']
    pil = Image.open(file.stream).convert('RGB')

    # Top-k
    topk = predict_topk(pil, k=5)

    # Heatmap (transparent overlay)
    heat = compute_heatmap_overlay(pil, overlay_alpha=0.9)
    heat_b64 = pil_to_base64_datauri(heat, fmt='PNG')

    # Embedding
    emb = get_embedding(pil)

    # Update PCA on window
    pid = new_prediction_id()
    thumb = make_thumb(pil)
    thumb_b64 = pil_to_base64_datauri(thumb, fmt='JPEG')

    # Insert first to ensure it's available for window PCA
    insert_prediction(
        pid=pid,
        label=topk[0][0],
        prob=topk[0][1],
        embedding=emb,
        emb2d=None,
        thumb_b64=thumb_b64,
        user=request.headers.get('X-User') or None,
    )

    # Recompute PCA for last window (including this one), but only for rows with same embedding dim
    rows = last_n_predictions(EMBED_WINDOW)
    target_dim = len(emb)
    rows_dim = [r for r in rows if _emb_len(r) == target_dim]
    if len(rows_dim) >= 1:
        vecs = [_parse_embedding_str(r['embedding']) for r in rows_dim]
        Z = pca2d(vecs)
        update_emb2d([r['id'] for r in rows_dim], Z)
    # Fetch updated row for self
    rows = last_n_predictions(EMBED_WINDOW)
    row_map = {r['id']: r for r in rows}
    me = row_map[pid]
    neighbors = build_neighbors(pid, k=5)

    resp = {
        'topk': [{'label': l, 'p': p} for l, p in topk],
        'heatmap_png_b64': heat_b64,
        'embedding': {'x': float(me['emb2d_x']), 'y': float(me['emb2d_y'])},
        'neighbors': neighbors,
        'id': pid,
        'model': f'{MODEL_NAME}@torchvision',
    }
    return jsonify(resp)


@app.post('/feedback')
def feedback():
    data = request.get_json(force=True)
    pid = data.get('predictionId')
    true_label = data.get('trueLabel')
    if not pid or not true_label:
        return jsonify({'error': 'predictionId and trueLabel required'}), 400
    update_feedback(pid, true_label)
    return jsonify({'ok': True})


@app.get('/metrics/summary')
def metrics_summary():
    counts, conf, classes = compute_confusion_and_counts(EMBED_WINDOW)
    return jsonify({
        'counts': counts,
        'confusion': conf,
        'classes': classes,
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', '5050')))
