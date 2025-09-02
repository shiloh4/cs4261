import io
import uuid
from typing import List, Tuple, Dict, Any

import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torchvision as tv


# Load pretrained MobileNetV3 Small
_weights = tv.models.MobileNet_V3_Small_Weights.DEFAULT
model = tv.models.mobilenet_v3_small(weights=_weights)
model.eval()

preproc = _weights.transforms()
class_names: List[str] = _weights.meta["categories"]


@torch.no_grad()
def predict_topk(pil_img: Image.Image, k: int = 5) -> List[Tuple[str, float]]:
    x = preproc(pil_img).unsqueeze(0)
    logits = model(x)
    probs = torch.softmax(logits, dim=1)[0]
    vals, idxs = probs.topk(k)
    return [(class_names[int(i)], float(v)) for v, i in zip(vals, idxs)]


class GradCAM:
    def __init__(self, model: nn.Module, target_layer: nn.Module):
        self.model = model
        self.target_layer = target_layer
        self.activations = None
        self.gradients = None
        self._register()

    def _register(self):
        def fwd_hook(_, __, output):
            self.activations = output.detach()

        def bwd_hook(_, grad_in, grad_out):
            self.gradients = grad_out[0].detach()

        self.target_layer.register_forward_hook(fwd_hook)
        self.target_layer.register_full_backward_hook(bwd_hook)

    def generate(self, x: torch.Tensor, class_idx: int | None = None) -> np.ndarray:
        # Forward
        out = self.model(x)
        if class_idx is None:
            class_idx = int(out.argmax(dim=1))
        score = out[:, class_idx].sum()
        # Backward
        self.model.zero_grad()
        score.backward(retain_graph=True)

        A = self.activations  # [1, C, H, W]
        dA = self.gradients   # [1, C, H, W]
        weights = dA.mean(dim=(2, 3), keepdim=True)  # [1, C, 1, 1]
        cam = (weights * A).sum(dim=1, keepdim=True)  # [1, 1, H, W]
        cam = torch.relu(cam)
        cam = nn.functional.interpolate(cam, size=x.shape[2:], mode='bilinear', align_corners=False)
        cam = cam.squeeze().cpu().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        return cam


# Hook the last conv block
_target_layer = model.features[-1]
grad_cam = GradCAM(model, _target_layer)


def make_heatmap_rgba(cam: np.ndarray, alpha: float = 0.8) -> Image.Image:
    # cam: 0..1 -> red colormap with variable alpha
    h, w = cam.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., 0] = (255.0 * cam).astype(np.uint8)        # R
    rgba[..., 1] = np.zeros_like(rgba[..., 0])           # G
    rgba[..., 2] = np.zeros_like(rgba[..., 0])           # B
    rgba[..., 3] = (255.0 * alpha * cam).astype(np.uint8)  # A
    return Image.fromarray(rgba, mode='RGBA')


def compute_heatmap_overlay(pil_img: Image.Image, overlay_alpha: float = 0.8) -> Image.Image:
    x = preproc(pil_img).unsqueeze(0)
    # Run once to populate activations
    with torch.enable_grad():
        x.requires_grad_(True)
        logits = model(x)
        class_idx = int(logits.argmax(dim=1))
        cam = grad_cam.generate(x, class_idx)
    # Heatmap sized as model input; we resize to original image size for overlay
    heat_rgba = make_heatmap_rgba(cam, alpha=overlay_alpha).resize(pil_img.size, resample=Image.BILINEAR)
    return heat_rgba


def get_embedding(pil_img: Image.Image) -> np.ndarray:
    # Capture input to final linear layer as embedding
    feats: Dict[str, Any] = {}

    def hook(module, input, output):
        feats['emb'] = input[0].detach().cpu().numpy()  # [1, D]

    h = model.classifier[-1].register_forward_hook(hook)
    with torch.no_grad():
        x = preproc(pil_img).unsqueeze(0)
        _ = model(x)
    h.remove()
    emb = feats['emb'].squeeze(0)
    return emb  # shape [D]


def pca2d(vectors: List[np.ndarray]) -> np.ndarray:
    # Simple PCA to 2D
    X = np.stack(vectors, axis=0)  # [N, D]
    X = X - X.mean(axis=0, keepdims=True)
    # Covariance via SVD: X = U S Vt; top-2 PCs are first two rows of Vt
    U, S, Vt = np.linalg.svd(X, full_matrices=False)
    V2 = Vt[:2].T  # [D,2]
    Z = X @ V2     # [N,2]
    # Normalize roughly to [-1,1]
    Z = Z / (np.max(np.abs(Z), axis=0, keepdims=True) + 1e-8)
    return Z


def pil_to_base64_datauri(pil_img: Image.Image, fmt: str = 'PNG', quality: int = 85) -> str:
    import base64
    buf = io.BytesIO()
    if fmt.upper() == 'JPEG':
        pil_img.convert('RGB').save(buf, format='JPEG', quality=quality)
        prefix = 'data:image/jpeg;base64,'
    else:
        pil_img.save(buf, format=fmt)
        prefix = 'data:image/png;base64,'
    return prefix + base64.b64encode(buf.getvalue()).decode('ascii')


def make_thumb(pil_img: Image.Image, size=(64, 64)) -> Image.Image:
    img = pil_img.copy()
    img.thumbnail(size)
    return img


def new_prediction_id() -> str:
    return 'pred_' + uuid.uuid4().hex[:12]
