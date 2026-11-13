"""Enhancer Router & Registry — Quản lý và định tuyến đa Provider cho M04a.

Cho phép lựa chọn linh hoạt giữa:
  - 'openai': OpenAI Images API (Mặc định)
  - 'gemini': Google Gemini / Imagen API
  - 'replicate': Replicate Super-Resolution Cloud
  - 'photoroom': Photoroom Image Editing API v2 (25/09/2026)
  - 'fal' / 'fal_flux': fal.ai BiRefNet + BRIA Product Shot + ESRGAN (25/09/2026)
  - 'local' / 'realesrgan': Real-ESRGAN / PIL cục bộ
  - 'pil': Thuần PIL Lanczos 2x (không cần model hay API key)
  - 'passthrough': Giữ nguyên ảnh gốc (đối chứng)
"""

from __future__ import annotations

import os
from typing import Any

from media_ai.providers.base import ImageEnhancer
from media_ai.providers.enhancement.fal_enhancer import FalEnhancer
from media_ai.providers.enhancement.gemini_enhancer import GeminiEnhancer
from media_ai.providers.enhancement.imagen_enhancer import ImagenEnhancer
from media_ai.providers.enhancement.openai_enhancer import OpenAIEnhancer
from media_ai.providers.enhancement.passthrough import PassthroughEnhancer
from media_ai.providers.enhancement.photoroom_enhancer import PhotoroomEnhancer
from media_ai.providers.enhancement.realesrgan import PILEnhancer, RealESRGANEnhancer
from media_ai.providers.enhancement.replicate_enhancer import ReplicateEnhancer
from media_ai.providers.enhancement.studio_enhancer import StudioEnhancer


ENHANCER_REGISTRY: dict[str, type] = {
    "studio": StudioEnhancer,
    "openai": OpenAIEnhancer,
    "gemini": GeminiEnhancer,
    "replicate": ReplicateEnhancer,
    "photoroom": PhotoroomEnhancer,
    "fal": FalEnhancer,
    # Mã giao diện Creative Studio gửi (`ENHANCER_PROVIDERS`) — cùng adapter.
    "fal_flux": FalEnhancer,
    # Google Gemini Image (25/09/2026) — "gemini" cũ vẫn là stub, giữ nguyên để không đổi hành vi job cũ.
    "imagen": ImagenEnhancer,
    "realesrgan": RealESRGANEnhancer,
    "local": RealESRGANEnhancer,
    "pil": PILEnhancer,
    "passthrough": PassthroughEnhancer,
}

# Mặc định theo kiến trúc chuẩn M04a: dùng Studio Micro-Pipeline
DEFAULT_PROVIDER = "studio"


def resolve_enhancer(config: dict[str, Any] | None = None) -> ImageEnhancer:
    """Trả về instance ImageEnhancer dựa trên config của job hoặc biến môi trường.

    Có `provider_order` (core gửi từ 25/09/2026, PO: nhà cung cấp trước) →
    chuỗi nhà cung cấp theo đúng thứ tự, lùi Studio cục bộ khi mọi bên lỗi.
    """
    cfg = config or {}
    order = cfg.get("provider_order")
    if isinstance(order, list) and order:
        from media_ai.providers.enhancement.chain import ProviderChainEnhancer

        return ProviderChainEnhancer([str(k) for k in order])
    provider_key = (
        cfg.get("enhancer_provider")
        or os.environ.get("DEFAULT_ENHANCER_PROVIDER")
        or DEFAULT_PROVIDER
    )
    provider_key = str(provider_key).strip().lower()

    enhancer_cls = ENHANCER_REGISTRY.get(provider_key, StudioEnhancer)
    return enhancer_cls()
