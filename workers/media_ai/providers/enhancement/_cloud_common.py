"""Phần dùng chung của enhancer NHÀ CUNG CẤP cho M04a (Photoroom, fal).

Luật PO 25/09/2026 (AGENTS.md "Phân luồng NHÀ CUNG CẤP / CỤC BỘ"): nhà cung cấp
lỗi → lùi luồng cục bộ và GHI RÕ lý do. Luồng cục bộ của M04a là
`StudioEnhancer` (mặc định của `router.py`), không phải PIL trần — lùi về cùng
chất lượng người dùng nhận được khi chọn "Local Studio".

Không nhà cung cấp nào trả phép đo "giữ nguyên sản phẩm": ảnh ra vẫn qua
`IdentityVerifier` của worker như mọi bộ máy khác.
"""

from __future__ import annotations

from typing import Any

from media_ai.providers.base import KetQuaTangCuong

DEFAULT_AUTO_CAPABILITIES = [
    "upscale_clarity",
    "enhance_lighting",
    "remove_watermark",
    "remove_background",
    "smart_reframe",
]


class NhaCungCapLoi(RuntimeError):
    """Nhà cung cấp không làm được lượt này — chuỗi (`chain.py`) thử bên kế tiếp."""

    def __init__(self, provider: str, ly_do: str) -> None:
        super().__init__(f"{provider}: {ly_do}")
        self.provider = provider
        self.ly_do = ly_do


def chon_nang_luc(config: dict[str, Any]) -> tuple[str, list[str]]:
    """Chế độ + danh sách năng lực người dùng chọn — cùng luật với `StudioEnhancer`."""
    mode = config.get("mode", "auto")
    if mode == "custom":
        return mode, list(config.get("selected_capabilities") or ["upscale_clarity"])
    return mode, list(config.get("selected_capabilities") or DEFAULT_AUTO_CAPABILITIES)


def lui_ve_cuc_bo(image: bytes, config: dict[str, Any], provider: str, ly_do: str) -> KetQuaTangCuong:
    """Chạy luồng cục bộ và ghi rõ vì sao nhà cung cấp không làm được. Nạp
    `StudioEnhancer` muộn: nó nạp rembg (~nặng) — chỉ trả giá khi thật sự lùi."""
    from media_ai.providers.enhancement.studio_enhancer import StudioEnhancer

    res = StudioEnhancer().enhance(image, config)
    params = res.setdefault("parameters", {})
    params["fallback"] = True
    params["fallback_reason"] = ly_do
    params["requested_provider"] = provider
    return res
