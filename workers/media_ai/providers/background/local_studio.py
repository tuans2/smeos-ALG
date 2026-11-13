"""Phông Studio cục bộ theo khung adapter chung (Đợt 1, 24/09/2026).

0 credit, không gọi mạng. Dựng phông ĐÚNG kích thước khung làm việc — trước
đây phông có kích thước ảnh Master rồi bị đệm màu trơn cho đủ khung đích.

Bảng năng lực nói thật: phông cục bộ không đọc lời nhắc/phong cách, nên các ý
định đó được ghi vào `bo_qua` thay vì giả vờ làm được. Seed (Đợt 2, 25/09/2026)
có tác dụng thật: đổi vị trí vùng sáng và bố cục bokeh; hướng sáng đổi vùng sáng
của phông cho khớp bóng đổ.
"""

from __future__ import annotations

from media_ai.image.studio_backdrop import StudioBackdropEngine
from media_ai.providers.background.base import BackgroundRequest, BackgroundResult, NangLuc


class LocalStudioBackground:
    name = "local_studio"
    model_version = "studio-backdrop-v1"
    # seed (Đợt 2, 25/09/2026): đổi vùng sáng + bố cục bokeh của phông.
    nang_luc = NangLuc(seed=True, negative_prompt=False, ratios=frozenset({"1:1", "4:5", "9:16", "16:9"}), prompt=False)

    def __init__(self, style: str = "warm_gray") -> None:
        self._style = style
        self._engine = StudioBackdropEngine()

    def generate(self, req: BackgroundRequest) -> BackgroundResult:
        bo_qua: list[str] = []
        if (req.scene_prompt or "").strip() or (req.lighting_mood or "").strip() or req.palette:
            bo_qua.append("prompt")
        if req.style:
            bo_qua.append("style")
        if req.quality != "standard":
            bo_qua.append("quality")
        anh = self._engine.create_backdrop(  # type: ignore[arg-type]
            req.rong, req.cao, style=self._style, with_grain=True,
            light_direction=req.lighting_direction or "left", seed=req.seed,
        )
        return BackgroundResult(anh=anh.convert("RGBA"), prompt=None, seed=req.seed, aspect_ratio=req.ratio, bo_qua=bo_qua)
