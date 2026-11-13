"""Làm mờ phần chủ thể bị KHUNG ẢNH GỐC cắt ngang — cẳng tay, cổ tay áo, cuống
hoa (Đợt 3 nâng cấp chất lượng ảnh biến thể, 25/09/2026 — nợ #130b).

Vấn đề: ảnh chụp tay người cầm bó hoa thường có cẳng tay chạy ra tới mép ảnh.
Tách nền giữ cả cẳng tay; khi bó hoa được đặt vào khung `full_frame`, mép ảnh
gốc nằm GIỮA khung mới → cẳng tay (hoặc bó cuống) bị cắt thành một đường thẳng
cứng giữa hậu cảnh. Đo trên BoAnhVang: ảnh có tay cầm đều lộ vết cắt này.

Cách làm — chỉ đụng CẲNG TAY NGƯỜI chạm mép:
  - với mỗi mép (trái / phải / dưới / trên), đo chiều dài chủ thể chạm mép;
  - chạm HẸP (≤ `TY_LE_HEP` bề ngang/chiều cao thân chủ thể) VÀ dải sát mép
    chủ yếu là MÀU DA → cẳng tay thò ra ngoài khung → alpha giảm dần về 0
    trong dải `TY_LE_DAI_MO` tính từ mép;
  - chạm rộng, hoặc chạm hẹp mà không phải da (cành lá, cuống hoa thò ra mép
    — đo 25/09 trên giỏ GHCB0001: nhánh bạch đàn chạm mép trái) = CHÍNH SẢN
    PHẨM → KHÔNG đụng, vì làm mờ sản phẩm là đổi sản phẩm.

Chỉ đổi ALPHA, không đổi màu. Worker đo Subject Integrity trên alpha đã làm
mờ: điểm bị làm mờ rơi khỏi "lõi" (alpha ≥ 250), phần còn lại vẫn phải trùng
khít từng điểm ảnh với Master.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from PIL import Image

NGUONG_CHAM = 32          # alpha coi là "có chủ thể" khi xét chạm mép
TY_LE_HEP = 0.45          # chạm mép ≤ 45% kích thước thân → vật thò ra ngoài
TY_LE_DAI_MO = 0.14       # dải làm mờ = 14% kích thước thân theo chiều vuông góc mép
DAI_MO_TOI_THIEU_PX = 24
CHAM_TOI_THIEU_PX = 6     # dưới mức này coi như không chạm (nhiễu)


@dataclass
class KetQuaMoMep:
    mep: list[str] = field(default_factory=list)  # các mép đã làm mờ
    co_da_nguoi: bool = False                      # phần làm mờ có màu da người
    dai_mo_px: int = 0
    # Vùng đã cố ý làm mờ (không phải sản phẩm) — worker loại khỏi phép đo
    # Subject Integrity, cùng lý do dải light wrap nằm ngoài lõi đo.
    vung_mo: np.ndarray | None = None


TY_LE_DA_TOI_THIEU = 0.5   # dải sát mép phải ≥ 50% điểm màu da mới coi là tay
# Dải mờ dài bằng phần này của đoạn cẳng tay tính từ mép (tay thò dài thì mờ dài).
TY_LE_MO_THEO_TAY = 0.7


def _mat_na_da(rgb: np.ndarray) -> np.ndarray:
    """Màu da người: YCrCb + sắc độ 0–35° + độ bão hoà vừa phải.

    Chặt hơn YCrCb thuần vì ruy băng kem / hồng đào của bó hoa rơi vào dải
    YCrCb của da (đo 25/09 trên BHSK0001: đuôi ruy băng chạm mép dưới) — làm
    mờ ruy băng là đổi sản phẩm."""
    r, g, b = (rgb[..., i].astype(np.float32) for i in range(3))
    y = 0.299 * r + 0.587 * g + 0.114 * b
    cr = (r - y) * 0.713 + 128
    cb = (b - y) * 0.564 + 128
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    s = (mx - mn) / np.maximum(mx, 1)
    # hue (độ) chỉ cần cho vùng r là kênh lớn nhất — da người luôn đỏ-cam
    hue = np.where(mx == r, 60 * ((g - b) / np.maximum(mx - mn, 1)), 999)
    return (
        (cr >= 140) & (cr <= 180) & (cb >= 85) & (cb <= 130) & (y > 60)
        & (hue >= 0) & (hue <= 35) & (s >= 0.12) & (s <= 0.65)
    )


def _co_da(rgb: np.ndarray, vung: np.ndarray) -> bool:
    """Dải sát mép chủ yếu là màu da người?"""
    if not vung.any():
        return False
    return float((_mat_na_da(rgb) & vung).sum()) / float(vung.sum()) >= TY_LE_DA_TOI_THIEU


def _do_dai_tay(da: np.ndarray, kc: np.ndarray, cham_mep: np.ndarray) -> int:
    """Độ dài đoạn da liền từ mép vào trong (px), đo theo khoảng cách tới mép."""
    from scipy import ndimage

    nhan, _ = ndimage.label(da)
    ids = np.unique(nhan[cham_mep & da])
    ids = ids[ids > 0]
    if ids.size == 0:
        return 0
    return int(kc[np.isin(nhan, ids)].max()) + 1


def lam_mo_mep_cat(rgba: Image.Image, alpha: Image.Image) -> tuple[Image.Image, Image.Image, KetQuaMoMep]:
    """Trả (rgba mới, alpha mới, mô tả). Không có gì để làm → trả nguyên bản."""
    a = np.asarray(alpha.convert("L")).astype(np.float32)
    h, w = a.shape
    co = a > NGUONG_CHAM
    kq = KetQuaMoMep()
    if not co.any():
        return rgba, alpha, kq
    ys, xs = np.nonzero(co)
    cao_than, rong_than = int(ys.max() - ys.min() + 1), int(xs.max() - xs.min() + 1)

    he_so = np.ones_like(a)
    # (tên mép, dải chạm, kích thước thân dọc theo mép, kích thước thân vuông góc mép, khoảng cách tới mép)
    xx = np.arange(w, dtype=np.float32)[None, :].repeat(h, 0)
    yy = np.arange(h, dtype=np.float32)[:, None].repeat(w, 1)
    cac_mep = [
        ("left", co[:, 0], cao_than, rong_than, xx),
        ("right", co[:, -1], cao_than, rong_than, (w - 1) - xx),
        ("bottom", co[-1, :], rong_than, cao_than, (h - 1) - yy),
        ("top", co[0, :], rong_than, cao_than, yy),
    ]
    arr = np.array(rgba.convert("RGBA"))
    da = _mat_na_da(arr[..., :3]) & co
    vung_mo = np.zeros_like(co)
    for ten, cham, doc_mep, vuong_goc, kc in cac_mep:
        dai_cham = int(cham.sum())
        if dai_cham < CHAM_TOI_THIEU_PX or dai_cham > TY_LE_HEP * doc_mep:
            continue
        dai_kiem = max(DAI_MO_TOI_THIEU_PX, int(round(TY_LE_DAI_MO * vuong_goc)))
        if not _co_da(arr[..., :3], (kc < dai_kiem) & co):
            continue  # cành lá / cuống / ruy băng thò ra mép = sản phẩm → không đụng
        # Tay thò dài thì mờ dài: 70% đoạn cẳng tay tính từ mép, không ngắn hơn dải kiểm.
        dai = max(dai_kiem, int(round(TY_LE_MO_THEO_TAY * _do_dai_tay(da, kc, kc < 2))))
        dai_mep = (kc < dai) & co
        t = np.clip(kc / dai, 0.0, 1.0)
        mo = t * t * (3 - 2 * t)  # smoothstep: 0 ở mép → 1 ở cuối dải
        he_so = np.minimum(he_so, mo)
        vung_mo |= dai_mep
        kq.mep.append(ten)
        kq.dai_mo_px = max(kq.dai_mo_px, dai)
    if not kq.mep:
        return rgba, alpha, kq

    a_moi = np.clip(a * he_so, 0, 255).astype(np.uint8)
    kq.co_da_nguoi = True
    kq.vung_mo = vung_mo
    arr[..., 3] = np.minimum(arr[..., 3], a_moi)
    return Image.fromarray(arr, mode="RGBA"), Image.fromarray(a_moi, mode="L"), kq
