"""Đo "bó hoa còn giữ nguyên" cho LUỒNG NHÀ CUNG CẤP TRỌN GÓI (25/09/2026).

Vì sao cần một phép đo khác phép đo từng điểm ảnh (`variant_worker._do_lo_chu_the`):
ở luồng nhà cung cấp trọn gói (Stability Replace Background & Relight, BRIA
Product Shot…), nhà cung cấp tự ghép và CHỈNH SÁNG cả bó hoa cho khớp cảnh —
điểm ảnh của bó hoa được phép đổi độ sáng/màu một chút. So trùng từng điểm ảnh
sẽ luôn báo sai. Không nhà cung cấp nào trả điểm "giữ nguyên" (đã soát 25/09:
Stability, BRIA, fal chỉ trả ảnh/seed/prompt) — nên cổng vẫn là của ALG.

Ba số đo, đều trên đúng vị trí bó hoa được đặt trong khung (nhà cung cấp được
yêu cầu giữ vị trí: Stability `preserve_original_subject`, BRIA
`placement_type=original`):

  structure_ssim   độ giống CẤU TRÚC (SSIM độ sáng, cửa sổ Gauss) trong lõi bó hoa —
                   bắt việc vẽ lại cánh hoa, đổi hình, làm nhoè;
  color_delta_e    chênh màu trung vị (ΔE76, Lab) trong lõi — cho phép chỉnh sáng
                   nhẹ, bắt việc đổi màu hoa;
  shape_iou        trùng khớp HÌNH DÁNG giữa mặt nạ mong đợi và mặt nạ tách từ
                   ảnh ra — bắt việc dời chỗ, cắt mất, mọc thêm.

Ngưỡng ở `NGUONG` — BẢN SAO của `PERCEPTUAL_THRESHOLDS` phía TS
(`src/modules/media/domain/variant-rules.ts`), test TS đọc file này để khoá hai
bên. Phía TS tính LẠI phán quyết từ số đo; ở đây chỉ dùng để quyết định có ghi
asset hay không. Ngưỡng CHƯA hiệu chỉnh bằng ảnh thật của nhà cung cấp (máy
agent không gọi được API — xem nợ kỹ thuật), đặt thận trọng.
"""

from __future__ import annotations

import numpy as np
from PIL import Image, ImageFilter

PHUONG_PHAP = "perceptual"

# (SAFE, WARNING) cho từng số đo. ssim/iou: càng cao càng tốt; delta_e: càng thấp càng tốt.
NGUONG = {
    "structure_ssim": (0.90, 0.80),
    "color_delta_e": (8.0, 15.0),
    "shape_iou": (0.95, 0.90),
}

DO_SAU_LOI_PX = 5


def _loi(alpha: np.ndarray, buoc: int = DO_SAU_LOI_PX) -> np.ndarray:
    m = Image.fromarray(((alpha >= 250) * 255).astype(np.uint8), mode="L")
    for _ in range(buoc):
        m = m.filter(ImageFilter.MinFilter(3))
    return np.asarray(m) == 255


def _lab(rgb: np.ndarray) -> np.ndarray:
    c = rgb.astype(np.float32) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]], dtype=np.float32)
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883], dtype=np.float32)
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def _ssim_map(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    from scipy.ndimage import gaussian_filter

    a = a.astype(np.float64)
    b = b.astype(np.float64)
    s = 1.5
    mu_a, mu_b = gaussian_filter(a, s), gaussian_filter(b, s)
    va = gaussian_filter(a * a, s) - mu_a**2
    vb = gaussian_filter(b * b, s) - mu_b**2
    cov = gaussian_filter(a * b, s) - mu_a * mu_b
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    return ((2 * mu_a * mu_b + c1) * (2 * cov + c2)) / ((mu_a**2 + mu_b**2 + c1) * (va + vb + c2))


def phan_quyet(so_do: dict[str, float | None]) -> str:
    """SAFE / WARNING / REJECTED — số đo xấu nhất quyết định. Thiếu số đo = không kiểm được."""
    ket = "SAFE"
    for ten, (safe, warn) in NGUONG.items():
        v = so_do.get(ten)
        if v is None:
            return "REJECTED"
        cao_la_tot = ten != "color_delta_e"
        dat_safe = v >= safe if cao_la_tot else v <= safe
        dat_warn = v >= warn if cao_la_tot else v <= warn
        if not dat_warn:
            return "REJECTED"
        if not dat_safe:
            ket = "WARNING"
    return ket


def do_giu_nguyen(
    mong_doi_rgba: Image.Image,
    anh_ra: Image.Image,
    alpha_ra: Image.Image | None,
) -> dict:
    """`mong_doi_rgba`: bó hoa gốc đã đặt vào khung (điểm ảnh Master + alpha), CÙNG
    kích thước `anh_ra`. `alpha_ra`: mặt nạ tách từ ảnh ra (None = không tách được
    → shape_iou None → REJECTED, vì không kiểm được thì không được báo đạt)."""
    if anh_ra.size != mong_doi_rgba.size:
        anh_ra = anh_ra.resize(mong_doi_rgba.size, Image.LANCZOS)
    arr = np.asarray(mong_doi_rgba.convert("RGBA"))
    a = arr[..., 3]
    loi = _loi(a)
    so_do: dict[str, float | None] = {"structure_ssim": None, "color_delta_e": None, "shape_iou": None}
    if loi.sum() < 64:
        return {"method": PHUONG_PHAP, **so_do, "result": "REJECTED", "ly_do": ["Lõi bó hoa quá nhỏ để đo"]}

    goc = arr[..., :3]
    ra = np.asarray(anh_ra.convert("RGB"))
    l_goc = goc.astype(np.float32) @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    l_ra = ra.astype(np.float32) @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    so_do["structure_ssim"] = round(float(_ssim_map(l_goc, l_ra)[loi].mean()), 4)
    de = np.linalg.norm(_lab(goc)[loi] - _lab(ra)[loi], axis=1)
    so_do["color_delta_e"] = round(float(np.median(de)), 2)
    if alpha_ra is not None:
        if alpha_ra.size != mong_doi_rgba.size:
            alpha_ra = alpha_ra.resize(mong_doi_rgba.size, Image.BILINEAR)
        m1 = a > 128
        m2 = np.asarray(alpha_ra.convert("L")) > 128
        hop = int((m1 | m2).sum())
        so_do["shape_iou"] = round(float((m1 & m2).sum() / hop), 4) if hop else 0.0

    ket = phan_quyet(so_do)
    ly_do: list[str] = []
    if ket != "SAFE":
        if so_do["shape_iou"] is None:
            ly_do.append("Không tách được bó hoa trên ảnh kết quả — không kiểm được hình dáng")
        for ten, (safe, warn) in NGUONG.items():
            v = so_do[ten]
            if v is None:
                continue
            xau = v < safe if ten != "color_delta_e" else v > safe
            if xau:
                ly_do.append(f"{ten} = {v} (ngưỡng an toàn {safe})")
    return {"method": PHUONG_PHAP, **so_do, "result": ket, "ly_do": ly_do}
