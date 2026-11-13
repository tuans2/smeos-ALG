"""Tăng nét HẬU CẢNH cho `upscale=2x` (Đợt 3 nâng cấp chất lượng ảnh, 25/09/2026).

Chỉ hậu cảnh — KHÔNG BAO GIỜ bó hoa. Bó hoa là điểm ảnh của Master; siêu phân
giải bằng mạng GAN (Real-ESRGAN) là "vẽ thêm chi tiết" lên sản phẩm, trái cam
kết "AI không vẽ lại bó hoa". Bó hoa chỉ được co giãn nội suy (LANCZOS) ở bước
đóng khung cuối, như trước.

Real-ESRGAN thật cần `realesrgan` + `torch` + trọng số `RealESRGAN_x4plus.pth`
(`REALESRGAN_MODEL_PATH`). Worker hiện KHÔNG cài (đã kiểm `workers/.venv`
25/09/2026) → lùi về LANCZOS + unsharp, và nói thật tên cách đã dùng để asset
ghi lại (`upscale.background_engine`).
"""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageFilter

ENGINE_REALESRGAN = "realesrgan-x4plus"
ENGINE_DU_PHONG = "lanczos-unsharp"

_mo_hinh = None
_da_thu = False


def _nap_realesrgan():
    global _mo_hinh, _da_thu
    if _da_thu:
        return _mo_hinh
    _da_thu = True
    try:
        from basicsr.archs.rrdbnet_arch import RRDBNet  # type: ignore[import-not-found]
        from realesrgan import RealESRGANer  # type: ignore[import-not-found]

        duong = os.environ.get("REALESRGAN_MODEL_PATH") or str(
            Path(__file__).resolve().parents[2] / "models" / "RealESRGAN_x4plus.pth"
        )
        if not os.path.exists(duong):
            return None
        _mo_hinh = RealESRGANer(
            scale=4, model_path=duong,
            model=RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, scale=4),
            tile=256, tile_pad=10, pre_pad=0, half=False,
        )
    except Exception:  # noqa: BLE001 — thiếu gói/trọng số là lùi, không phải lỗi job
        _mo_hinh = None
    return _mo_hinh


def tang_net_nen(anh: Image.Image, he_so: int = 2) -> tuple[Image.Image, str]:
    """Phóng `he_so` lần. Trả (ảnh, tên cách đã dùng)."""
    rgb = anh.convert("RGB")
    dich = (rgb.width * he_so, rgb.height * he_so)
    mo_hinh = _nap_realesrgan()
    if mo_hinh is not None:
        try:
            import numpy as np

            bgr = np.asarray(rgb)[:, :, ::-1]
            ra, _ = mo_hinh.enhance(bgr, outscale=he_so)
            return Image.fromarray(ra[:, :, ::-1]).resize(dich, Image.LANCZOS), ENGINE_REALESRGAN
        except Exception:  # noqa: BLE001
            pass
    phong = rgb.resize(dich, Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=2))
    return phong, ENGINE_DU_PHONG
