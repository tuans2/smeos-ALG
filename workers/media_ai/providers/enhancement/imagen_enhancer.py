"""Google Gemini Image — enhancer nhà cung cấp cho M04a (25/09/2026, PO chọn thêm).

Một lượt sửa ảnh làm các bước Gemini làm được: phông studio + chỉnh sáng +
làm nét theo mô tả, giữ nguyên bó hoa (Guard của ALG đo lại). Xoá
watermark / chèn chữ không đưa vào mô tả → `bo_qua`. Lỗi → theo cờ
`lui_cuc_bo`: lùi `StudioEnhancer` (mặc định) hoặc ném `NhaCungCapLoi` để
chuỗi nhà cung cấp thử bên kế tiếp.
"""

from __future__ import annotations

from io import BytesIO
from typing import Any

from PIL import Image

from media_ai.providers.base import KetQuaTangCuong
from media_ai.providers.enhancement._cloud_common import NhaCungCapLoi, chon_nang_luc, lui_ve_cuc_bo
from media_ai.providers.google.gemini_image import MODEL, GeminiImageClient, GeminiImageError

GHI_CHU = {
    "remove_background": "Gemini đã dựng phông studio sạch, bóng đổ tự nhiên",
    "enhance_lighting": "Gemini đã chỉnh sáng studio mềm cho bó hoa",
    "upscale_clarity": "Gemini đã làm nét chi tiết cánh hoa",
    "smart_reframe": "Đã tạo 4 tỷ lệ chuẩn (1:1, 4:5, 9:16, 16:9) bảo toàn 100% bó hoa",
}
KHONG_HO_TRO = ("remove_watermark", "add_marketing_text")


def mo_ta(caps: list[str]) -> str:
    phan = ["Professional e-commerce product photo of this exact flower bouquet."]
    if "remove_background" in caps:
        phan.append("Replace the background with a clean seamless bright studio backdrop and a soft natural floor shadow.")
    if "enhance_lighting" in caps:
        phan.append("Apply soft even studio softbox lighting.")
    if "upscale_clarity" in caps:
        phan.append("Make petal details crisp and sharp.")
    phan.append("Do NOT add, remove, recolor or reshape any flower, leaf, wrapping or ribbon. Keep the bouquet identical and in the same position.")
    return " ".join(phan)


class ImagenEnhancer:
    name = "imagen"
    model_version = MODEL

    def __init__(self, client: GeminiImageClient | None = None, lui_cuc_bo: bool = True) -> None:
        self._g = client or GeminiImageClient()
        self._lui_cuc_bo = lui_cuc_bo

    def _loi(self, image: bytes, config: dict[str, Any], ly_do: str) -> KetQuaTangCuong:
        if not self._lui_cuc_bo:
            raise NhaCungCapLoi(self.name, ly_do)
        return lui_ve_cuc_bo(image, config, self.name, ly_do)

    def enhance(self, image: bytes, config: dict[str, Any]) -> KetQuaTangCuong:
        mode, caps = chon_nang_luc(config)
        if not self._g.co_khoa():
            return self._loi(image, config, "Thiếu GEMINI_API_KEY")
        goc = Image.open(BytesIO(image)).convert("RGB")
        prompt = mo_ta(caps)
        try:
            anh = self._g.sua_anh(goc, prompt).convert("RGB")
        except GeminiImageError as exc:
            return self._loi(image, config, f"Gemini Image lỗi: {exc}")
        if anh.size != goc.size:
            anh = anh.resize(goc.size, Image.LANCZOS)
        out = BytesIO()
        anh.save(out, format="JPEG", quality=92)
        return {
            "image": out.getvalue(),
            "generated_flags": {"generative_fill_used": True, "requires_reshoot_warning": False},
            "parameters": {
                "provider": self.name,
                "model": MODEL,
                "mode": mode,
                "selected_capabilities": caps,
                "applied_changes": [GHI_CHU[c] for c in caps if c in GHI_CHU],
                "bo_qua": [c for c in caps if c in KHONG_HO_TRO],
                "prompt_used": prompt,
                "fallback": False,
            },
        }
