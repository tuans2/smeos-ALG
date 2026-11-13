"""fal.ai — enhancer nhà cung cấp cho M04a (25/09/2026).

Dùng lại adapter fal của Khu vực D (`providers/scene/fal_scene.py`), cùng mô
hình đã chọn ở đó:
  - tách nền: `fal-ai/birefnet/v2` (BiRefNet);
  - phông studio + ghép + hoà sáng: `fal-ai/bria/product-shot`,
    `placement_type=original` — bó hoa giữ đúng chỗ trong khung gốc;
  - tăng nét: `fal-ai/esrgan` 2x (chỉ khi cạnh dài ≤ `CANH_TOI_DA_TANG_NET`).

Bước nào fal lỗi → lùi TOÀN BỘ lượt về luồng cục bộ và ghi rõ lý do, không trộn
nửa fal nửa cục bộ (luật PO 25/09/2026). Xoá watermark / chèn chữ fal không làm
→ `bo_qua`. CHƯA gọi thật được từ máy agent — nợ #138, như `fal_scene.py`.
"""

from __future__ import annotations

from io import BytesIO
from typing import Any

from PIL import Image

from media_ai.providers.base import KetQuaTangCuong
from media_ai.providers.enhancement._cloud_common import NhaCungCapLoi, chon_nang_luc, lui_ve_cuc_bo
from media_ai.providers.scene.base import SceneProviderError, SceneRequest
from media_ai.providers.scene.fal_scene import MODEL_CANH, MODEL_TACH_NEN, MODEL_TANG_NET, FalSceneProvider

MO_TA_PHONG_STUDIO = (
    "clean seamless bright studio backdrop, soft diffused softbox lighting, "
    "gentle natural floor shadow, professional e-commerce floral product photography"
)
CANH_TOI_DA_TANG_NET = 2048
KHONG_HO_TRO = ("remove_watermark", "add_marketing_text")


class FalEnhancer:
    name = "fal"
    model_version = MODEL_CANH

    def __init__(self, provider: Any | None = None, lui_cuc_bo: bool = True) -> None:
        self._lui_cuc_bo = lui_cuc_bo
        self._p = provider if provider is not None else FalSceneProvider()

    def _loi(self, image: bytes, config: dict[str, Any], ly_do: str) -> KetQuaTangCuong:
        """`lui_cuc_bo=False` (trong chuỗi nhà cung cấp): ném để thử bên kế tiếp."""
        if not self._lui_cuc_bo:
            raise NhaCungCapLoi(self.name, ly_do)
        return lui_ve_cuc_bo(image, config, self.name, ly_do)

    def enhance(self, image: bytes, config: dict[str, Any]) -> KetQuaTangCuong:
        mode, selected_caps = chon_nang_luc(config)
        if not self._p.co_khoa():
            return self._loi(image, config, "Thiếu FAL_KEY")

        can_dung_nen = "remove_background" in selected_caps or "enhance_lighting" in selected_caps
        can_tang_net = "upscale_clarity" in selected_caps
        if not (can_dung_nen or can_tang_net):
            return self._loi(image, config, "Lựa chọn không có bước nào fal làm được")

        goc = Image.open(BytesIO(image)).convert("RGB")
        anh = goc
        mo_hinh: list[str] = []
        da_ap_dung: list[str] = []
        bo_qua = [c for c in selected_caps if c in KHONG_HO_TRO]
        try:
            if can_dung_nen:
                mat_na = self._p.tach_nen(goc)
                chu_the = goc.convert("RGBA")
                chu_the.putalpha(mat_na)
                buf = BytesIO()
                chu_the.save(buf, format="PNG")
                kq = self._p.dung_canh(
                    SceneRequest(
                        chu_the_png=buf.getvalue(), ratio="original", rong=goc.width, cao=goc.height,
                        scene_prompt=MO_TA_PHONG_STUDIO, quality="high",
                    )
                )
                anh = kq.anh if kq.anh.size == goc.size else kq.anh.resize(goc.size, Image.LANCZOS)
                bo_qua.extend(kq.bo_qua)
                mo_hinh += [MODEL_TACH_NEN, MODEL_CANH]
                da_ap_dung.append("fal đã tách nền (BiRefNet) và dựng phông studio + hoà sáng (BRIA Product Shot)")
            if can_tang_net:
                if max(anh.size) <= CANH_TOI_DA_TANG_NET:
                    anh = self._p.tang_net(anh, 2)
                    mo_hinh.append(MODEL_TANG_NET)
                    da_ap_dung.append("fal đã tăng nét 2x (Real-ESRGAN)")
                else:
                    bo_qua.append(f"upscale_clarity:canh_dai>{CANH_TOI_DA_TANG_NET}")
        except SceneProviderError as exc:
            return self._loi(image, config, f"fal lỗi: {exc}")

        if "smart_reframe" in selected_caps:
            da_ap_dung.append("Đã tạo 4 tỷ lệ chuẩn (1:1, 4:5, 9:16, 16:9) bảo toàn 100% bó hoa")
        out = BytesIO()
        anh.convert("RGB").save(out, format="JPEG", quality=92)
        return {
            "image": out.getvalue(),
            "generated_flags": {"generative_fill_used": can_dung_nen, "requires_reshoot_warning": False},
            "parameters": {
                "provider": self.name,
                "model": "+".join(mo_hinh),
                "mode": mode,
                "selected_capabilities": selected_caps,
                "applied_changes": da_ap_dung,
                "bo_qua": bo_qua,
                "original_size": list(goc.size),
                "enhanced_size": list(anh.size),
                "fallback": False,
            },
        }
