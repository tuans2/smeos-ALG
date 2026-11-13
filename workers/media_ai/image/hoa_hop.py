"""Chế độ ghép `harmonize` (Đợt 3 nâng cấp chất lượng ảnh biến thể, 25/09/2026).

Mục tiêu: bó hoa "ngồi" trong cảnh thay vì "dán lên" — mà KHÔNG đụng lõi bó
hoa (cổng Subject Integrity vẫn đo trùng khít từng điểm ảnh). Mọi thay đổi chỉ
ở ba chỗ được phép:

1. **Màu bóng lấy từ hậu cảnh** (`mau_bong_tu_nen`): bóng đổ trên nền gỗ ấm
   phải ngả nâu ấm, trên nền xanh phải ngả xanh — trước đây bóng dùng một màu
   cố định theo preset, lệch hẳn khi hậu cảnh do nhà cung cấp vẽ.
2. **Độ nét hậu cảnh khớp chủ thể** (`khop_do_net_nen`): hậu cảnh sắc hơn hẳn
   bó hoa (ảnh AI 1 MP phóng lên, hay phông tự dựng) làm bó hoa trông "mềm" và
   tách lớp; làm mờ NHẸ hậu cảnh — chỉ hậu cảnh — như độ sâu trường ảnh thật.
3. **Light wrap mạnh hơn** trong ĐÚNG dải viền 4 px đã có (`LIGHT_WRAP_DEPTH_PX`)
   — nằm ngoài lõi đo (co biên 5 px).
"""

from __future__ import annotations

import numpy as np
from PIL import Image, ImageFilter

# Light wrap ở chế độ harmonize (mặc định 0,30).
CUONG_DO_LIGHT_WRAP = 0.42
# Hậu cảnh sắc hơn chủ thể quá hệ số này mới làm mờ.
NGUONG_CHENH_NET = 1.6
BAN_KINH_MO_TOI_DA = 2.5


def _do_net(anh_l: np.ndarray, mat_na: np.ndarray) -> float:
    """Phương sai Laplacian trong vùng mặt nạ (không cần OpenCV)."""
    if mat_na.sum() < 64:
        return 0.0
    a = anh_l.astype(np.float32)
    lap = (
        -4 * a[1:-1, 1:-1] + a[:-2, 1:-1] + a[2:, 1:-1] + a[1:-1, :-2] + a[1:-1, 2:]
    )
    m = mat_na[1:-1, 1:-1]
    return float(lap[m].var()) if m.any() else 0.0


def mau_bong_tu_nen(nen: Image.Image, alpha: Image.Image, mac_dinh: tuple[int, int, int]) -> tuple[int, int, int]:
    """Màu bóng = tông tối của hậu cảnh quanh chân bó hoa (giữ độ bão hoà nhẹ)."""
    a = np.asarray(alpha.convert("L")) > 32
    if not a.any():
        return mac_dinh
    ys, xs = np.nonzero(a)
    y0 = int(ys.max())
    h, w = a.shape
    x0, x1 = max(0, int(xs.min())), min(w, int(xs.max()) + 1)
    y_a, y_b = max(0, y0 - (y0 - int(ys.min())) // 4), min(h, y0 + max(8, h // 20))
    vung = np.asarray(nen.convert("RGB"))[y_a:y_b, x0:x1].reshape(-1, 3).astype(np.float32)
    m = ~a[y_a:y_b, x0:x1].reshape(-1)
    if m.sum() < 16:
        return mac_dinh
    tb = vung[m].mean(axis=0)
    # Tối đi còn ~22% độ sáng, giữ sắc độ của nền.
    toi = np.clip(tb * 0.22, 0, 255)
    return int(toi[0]), int(toi[1]), int(toi[2])


def khop_do_net_nen(nen: Image.Image, chu_the_rgba: Image.Image) -> tuple[Image.Image, float]:
    """Làm mờ nhẹ HẬU CẢNH khi nó sắc hơn chủ thể quá `NGUONG_CHENH_NET` lần.

    Trả (nền mới, bán kính đã dùng). Không bao giờ đụng chủ thể."""
    alpha = np.asarray(chu_the_rgba.split()[3]) > 200
    l_chu_the = np.asarray(chu_the_rgba.convert("L"))
    l_nen = np.asarray(nen.convert("L"))
    net_ct = _do_net(l_chu_the, alpha)
    net_nen = _do_net(l_nen, ~(np.asarray(chu_the_rgba.split()[3]) > 8))
    if net_ct <= 0 or net_nen <= net_ct * NGUONG_CHENH_NET:
        return nen, 0.0
    ban_kinh = float(min(BAN_KINH_MO_TOI_DA, 0.6 * np.log2(net_nen / net_ct)))
    if ban_kinh < 0.3:
        return nen, 0.0
    return nen.filter(ImageFilter.GaussianBlur(radius=ban_kinh)), round(ban_kinh, 2)
