import io
import os
import uuid
from typing import List, Tuple, Dict, Any

import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torchvision as tv
from huggingface_hub import hf_hub_download


# -----------------------------------------------------------------------------
# Model loader (env-configurable)
# -----------------------------------------------------------------------------

MODEL_NAME = os.environ.get("MODEL_NAME", "mobilenet_v3_small").lower()

# Limit torch intra-op threads on small instances unless overridden
try:
    torch.set_num_threads(int(os.environ.get("TORCH_THREADS", "1")))
except Exception:
    pass

# Optional: Hugging Face repo to pull weights from
HF_REPO_DEFAULT = os.environ.get("HUGGINGFACE_REPO_ID", "shiloh4/mlexplainer_weights").strip()

DEFAULT_HF_FILENAMES: Dict[str, str] = {
    "mobilenet_v3_small": "mobilenet_v3_small-047dcff4.pth",
    "mobilenet_v3_large": "mobilenet_v3_large-5c1a4163.pth",
    "resnet50": "resnet50-11ad3fa6.pth",
    "efficientnet_b0": "efficientnet_b0_rwightman-7f5810bc.pth",
    "efficientnet_b3": "efficientnet_b3_rwightman-b3899882.pth",
    "convnext_tiny": "convnext_tiny-983f1562.pth",
}


def _load_from_hf(model_key: str) -> Dict[str, Any] | None:
    """Attempt to download a state_dict from Hugging Face for the given model key.
    Returns a dict (state_dict) or None if unavailable.
    You can override repo/filename per model via env vars like:
      HF_REPO_ID_RESNET50, HF_FILENAME_RESNET50, etc.
    Keys: mobilenet_v3_small, mobilenet_v3_large, resnet50, efficientnet_b0, efficientnet_b3, convnext_tiny
    """
    repo_env_key = f"HF_REPO_ID_{model_key.upper()}"
    file_env_key = f"HF_FILENAME_{model_key.upper()}"
    repo_id = os.environ.get(repo_env_key, HF_REPO_DEFAULT)
    filename = os.environ.get(file_env_key, DEFAULT_HF_FILENAMES.get(model_key, "")).strip()
    if not repo_id or not filename:
        return None
    try:
        local_path = hf_hub_download(repo_id=repo_id, filename=filename)
        state = torch.load(local_path, map_location="cpu")
        # Some checkpoints saved as dict with 'state_dict'
        if isinstance(state, dict) and "state_dict" in state:
            state = state["state_dict"]
        return state
    except Exception:
        return None


def _build_model(name: str):
    name = name.lower()
    if name in {"mobilenet_v3_small", "mnet_v3_small", "mnet_small", "mobilenet_small"}:
        tvw = tv.models.MobileNet_V3_Small_Weights.DEFAULT
        state = _load_from_hf("mobilenet_v3_small")
        if state is not None:
            m = tv.models.mobilenet_v3_small(weights=None)
            m.load_state_dict(state)
        else:
            m = tv.models.mobilenet_v3_small(weights=tvw)
        preproc = tvw.transforms()
        classes = tvw.meta["categories"]
        target_layer = m.features[-1]
        emb_module = m.classifier[-1]
    elif name in {"mobilenet_v3_large", "mnet_v3_large", "mobilenet_large", "mnet_large"}:
        tvw = tv.models.MobileNet_V3_Large_Weights.DEFAULT
        state = _load_from_hf("mobilenet_v3_large")
        if state is not None:
            m = tv.models.mobilenet_v3_large(weights=None)
            m.load_state_dict(state)
        else:
            m = tv.models.mobilenet_v3_large(weights=tvw)
        preproc = tvw.transforms()
        classes = tvw.meta["categories"]
        target_layer = m.features[-1]
        emb_module = m.classifier[-1]
    elif name in {"resnet50", "resnet"}:
        tvw = tv.models.ResNet50_Weights.DEFAULT
        state = _load_from_hf("resnet50")
        if state is not None:
            m = tv.models.resnet50(weights=None)
            m.load_state_dict(state)
        else:
            m = tv.models.resnet50(weights=tvw)
        preproc = tvw.transforms()
        classes = tvw.meta["categories"]
        target_layer = m.layer4[-1]
        emb_module = m.fc
    elif name in {"efficientnet_b0", "effb0", "efficientnet0"}:
        tvw = tv.models.EfficientNet_B0_Weights.DEFAULT
        state = _load_from_hf("efficientnet_b0")
        if state is not None:
            m = tv.models.efficientnet_b0(weights=None)
            m.load_state_dict(state)
        else:
            m = tv.models.efficientnet_b0(weights=tvw)
        preproc = tvw.transforms()
        classes = tvw.meta["categories"]
        target_layer = m.features[-1]
        emb_module = m.classifier[-1]
    elif name in {"efficientnet_b3", "effb3", "efficientnet3"}:
        tvw = tv.models.EfficientNet_B3_Weights.DEFAULT
        state = _load_from_hf("efficientnet_b3")
        if state is not None:
            m = tv.models.efficientnet_b3(weights=None)
            m.load_state_dict(state)
        else:
            m = tv.models.efficientnet_b3(weights=tvw)
        preproc = tvw.transforms()
        classes = tvw.meta["categories"]
        target_layer = m.features[-1]
        emb_module = m.classifier[-1]
    elif name in {"convnext_tiny", "convnext"}:
        tvw = tv.models.ConvNeXt_Tiny_Weights.DEFAULT
        state = _load_from_hf("convnext_tiny")
        if state is not None:
            m = tv.models.convnext_tiny(weights=None)
            m.load_state_dict(state)
        else:
            m = tv.models.convnext_tiny(weights=tvw)
        preproc = tvw.transforms()
        classes = tvw.meta["categories"]
        # Last stage output is fine for CAM-like visualization
        target_layer = m.features[-1]
        emb_module = m.classifier[-1]  # Linear
    else:
        raise ValueError(f"Unsupported MODEL_NAME '{name}'")

    m.eval()
    return m, preproc, classes, target_layer, emb_module


model, preproc, class_names, _target_layer, _emb_module = _build_model(MODEL_NAME)


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


# Hook the selected target layer for Grad-CAM
grad_cam = GradCAM(model, _target_layer)

# -----------------------------------------------------------------------------
# Multi-model cache and helpers (for per-request model selection)
# -----------------------------------------------------------------------------
_MODEL_CACHE: Dict[str, Dict[str, Any]] = {}


def get_stack(name: str) -> Dict[str, Any]:
    key = (name or MODEL_NAME).lower()
    if key not in _MODEL_CACHE:
        m, pp, classes, tgt, emb = _build_model(key)
        _MODEL_CACHE[key] = {
            'name': key,
            'model': m,
            'preproc': pp,
            'class_names': classes,
            'grad_cam': GradCAM(m, tgt),
            'emb_module': emb,
        }
    return _MODEL_CACHE[key]


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


def compute_heatmap_overlay_stack(stack: Dict[str, Any], pil_img: Image.Image, overlay_alpha: float = 0.8) -> Image.Image:
    pp = stack['preproc']
    m: nn.Module = stack['model']
    gc: GradCAM = stack['grad_cam']
    x = pp(pil_img).unsqueeze(0)
    with torch.enable_grad():
        x.requires_grad_(True)
        logits = m(x)
        class_idx = int(logits.argmax(dim=1))
        cam = gc.generate(x, class_idx)
    heat_rgba = make_heatmap_rgba(cam, alpha=overlay_alpha).resize(pil_img.size, resample=Image.BILINEAR)
    return heat_rgba


def get_embedding(pil_img: Image.Image) -> np.ndarray:
    # Capture input to final classifier layer as embedding (works across supported models)
    feats: Dict[str, Any] = {}

    def hook(module, input, output):
        feats['emb'] = input[0].detach().cpu().numpy()  # [N, D]

    h = _emb_module.register_forward_hook(hook)
    with torch.no_grad():
        x = preproc(pil_img).unsqueeze(0)
        _ = model(x)
    h.remove()
    emb = feats['emb'].squeeze(0)
    return emb  # shape [D]


def get_embedding_stack(stack: Dict[str, Any], pil_img: Image.Image) -> np.ndarray:
    feats: Dict[str, Any] = {}

    def hook(module, input, output):
        feats['emb'] = input[0].detach().cpu().numpy()

    emb_module: nn.Module = stack['emb_module']
    m: nn.Module = stack['model']
    pp = stack['preproc']
    h = emb_module.register_forward_hook(hook)
    with torch.no_grad():
        x = pp(pil_img).unsqueeze(0)
        _ = m(x)
    h.remove()
    emb = feats['emb'].squeeze(0)
    return emb


def pca2d(vectors: List[np.ndarray]) -> np.ndarray:
    # Simple PCA to 2D
    X = np.stack(vectors, axis=0)  # [N, D]
    X = X - X.mean(axis=0, keepdims=True)
    # Covariance via SVD: X = U S Vt; top-2 PCs are first two rows of Vt
    U, S, Vt = np.linalg.svd(X, full_matrices=False)
    ncomp = 2 if Vt.shape[0] >= 2 else 1
    V2 = Vt[:ncomp].T  # [D,ncomp]
    Z = X @ V2     # [N,ncomp]
    if Z.ndim == 1:
        Z = Z[:, None]
    if Z.shape[1] == 1:
        Z = np.concatenate([Z, np.zeros((Z.shape[0], 1), dtype=Z.dtype)], axis=1)
    # Normalize roughly to [-1,1]
    Z = Z / (np.max(np.abs(Z), axis=0, keepdims=True) + 1e-8)
    return Z


@torch.no_grad()
def predict_topk_stack(stack: Dict[str, Any], pil_img: Image.Image, k: int = 5) -> List[Tuple[str, float]]:
    pp = stack['preproc']
    m: nn.Module = stack['model']
    class_names_: List[str] = stack['class_names']
    x = pp(pil_img).unsqueeze(0)
    logits = m(x)
    probs = torch.softmax(logits, dim=1)[0]
    vals, idxs = probs.topk(k)
    return [(class_names_[int(i)], float(v)) for v, i in zip(vals, idxs)]


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
