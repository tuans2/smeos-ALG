"""Chấm kỹ thuật tự động cho ảnh biến thể (Đợt 3 nâng cấp chất lượng ảnh,
25/09/2026).

NÓI THẬT VỀ PHẠM VI: đây là bộ chấm HEURISTIC trên các tiêu chí kỹ thuật đo
được — không phải mô hình thẩm mỹ học máy (LAION/NIMA cần torch + CLIP, chưa
có trên worker). Nó bắt các lỗi hay gặp để xếp hạng phương án và báo động sớm;
không thay ô chấm mắt của PO trong `scripts/cham-bien-the.py`.

Sáu tiêu chí, mỗi tiêu chí 0..1, tổng 0..100 theo trọng số `TRONG_SO`:
  do_net      độ nét trong vùng bó hoa (phương sai Laplacian, ảnh quy về cao 1024)
  phoi_sang   độ sáng trung bình hợp lý, ít điểm cháy / bệt
  tach_nen    bó hoa khác màu/độ sáng với hậu cảnh quanh nó (ΔE Lab)
  bo_cuc      diện tích bó hoa hợp lý (12–60% khung), không dính mép khung
  khong_dem   không có dải màu đệm ở mép (lỗi trước Đợt 1)
  hai_hoa     hậu cảnh không rực hơn bó hoa (bó hoa là nhân vật chính)
"""

from __future__ import annotations

import numpy as np
from PIL import Image

PHIEN_BAN = "cham-ky-thuat-v1"
TRONG_SO = {"do_net": 0.25, "phoi_sang": 0.2, "tach_nen": 0.2, "bo_cuc": 0.2, "khong_dem": 0.1, "hai_hoa": 0.05}


def _lab(rgb: np.ndarray) -> np.ndarray:
    c = rgb.astype(np.float32) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]], dtype=np.float32)
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883], dtype=np.float32)
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def _dai_dem(a: np.ndarray, nguong: int = 2) -> float:
    h, w, _ = a.shape

    def phang(d: np.ndarray) -> bool:
        return int((d.max(axis=0) - d.min(axis=0)).max()) <= nguong

    tren = next((i for i in range(h) if not phang(a[i])), h)
    duoi = next((i for i in range(h) if not phang(a[h - 1 - i])), h)
    trai = next((j for j in range(w) if not phang(a[:, j])), w)
    phai = next((j for j in range(w) if not phang(a[:, w - 1 - j])), w)
    tren, duoi, trai, phai = min(tren, h // 2), min(duoi, h // 2), min(trai, w // 2), min(phai, w // 2)
    return ((tren + duoi) * w + (trai + phai) * (h - tren - duoi)) / (w * h)


def cham_ky_thuat(anh: Image.Image, mat_na_chu_the: Image.Image) -> dict:
    """`mat_na_chu_the`: alpha của bó hoa CÙNG KHUNG với `anh` (L, 0..255)."""
    anh = anh.convert("RGB")
    if mat_na_chu_the.size != anh.size:
        mat_na_chu_the = mat_na_chu_the.resize(anh.size, Image.BILINEAR)
    # Quy về cao 1024 để số đo độ nét không phụ thuộc độ phân giải xuất.
    he_so = 1024 / anh.height
    kich = (max(1, round(anh.width * he_so)), 1024)
    rgb = np.asarray(anh.resize(kich, Image.LANCZOS)).astype(np.int16)
    m = np.asarray(mat_na_chu_the.resize(kich, Image.BILINEAR)) > 128
    diem: dict[str, float] = {}

    l = rgb.astype(np.float32) @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    lap = -4 * l[1:-1, 1:-1] + l[:-2, 1:-1] + l[2:, 1:-1] + l[1:-1, :-2] + l[1:-1, 2:]
    mm = m[1:-1, 1:-1]
    var = float(lap[mm].var()) if mm.sum() > 64 else 0.0
    diem["do_net"] = float(np.clip((np.log10(var + 1) - 1.0) / 1.5, 0, 1))

    tb = float(l.mean()) / 255
    chay = float(((l > 250) | (l < 5)).mean())
    lech = 0.0 if 0.4 <= tb <= 0.8 else min(abs(tb - 0.4), abs(tb - 0.8)) / 0.3
    diem["phoi_sang"] = float(np.clip(1 - lech - 4 * chay, 0, 1))

    if m.sum() > 64 and (~m).sum() > 64:
        from PIL import ImageFilter

        vong = np.asarray(
            Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(31))
        ) > 0
        vong &= ~m
        lab = _lab(rgb)
        de = float(np.linalg.norm(lab[m].mean(axis=0) - lab[vong if vong.any() else ~m].mean(axis=0)))
        diem["tach_nen"] = float(np.clip(de / 30, 0, 1))
        hsv_s = (rgb.max(axis=2) - rgb.min(axis=2)) / np.maximum(rgb.max(axis=2), 1)
        diem["hai_hoa"] = float(np.clip((hsv_s[m].mean() - hsv_s[~m].mean() + 0.1) / 0.3, 0, 1))
        ys, xs = np.nonzero(m)
        dien_tich = ((ys.max() - ys.min() + 1) * (xs.max() - xs.min() + 1)) / m.size
        s_dt = 1.0 if 0.12 <= dien_tich <= 0.6 else max(0.0, 1 - min(abs(dien_tich - 0.12), abs(dien_tich - 0.6)) / 0.2)
        h, w = m.shape
        le = min(ys.min() / h, xs.min() / w, (h - 1 - ys.max()) / h, (w - 1 - xs.max()) / w)
        diem["bo_cuc"] = float(np.clip(s_dt * (1.0 if le >= 0.02 else 0.6), 0, 1))
    else:
        diem.update({"tach_nen": 0.0, "hai_hoa": 0.0, "bo_cuc": 0.0})

    diem["khong_dem"] = float(np.clip(1 - _dai_dem(rgb) / 0.05, 0, 1))
    tong = sum(TRONG_SO[k] * diem[k] for k in TRONG_SO)
    return {
        "score": round(100 * tong, 1),
        "components": {k: round(v, 3) for k, v in diem.items()},
        "version": PHIEN_BAN,
    }
