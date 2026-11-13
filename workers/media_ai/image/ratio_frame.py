"""Tỷ lệ khung chuẩn của M04b và phép đóng khung dùng chung.

Tách khỏi `jobs/variant_worker.py` (nợ #78, 17/09) để `providers/expansion/`
dùng lại được CÙNG một `RATIO_PRESETS`/`dong_khung` mà không khiến `jobs/`
import ngược từ `providers/` (hoặc ngược lại) — hai gói đó không được phụ
thuộc vòng vào nhau. `variant_worker.py` giữ nguyên tên cũ `RATIO_PRESETS`/
`_dong_khung` bằng cách import lại từ đây, nên không nơi gọi nào phải sửa.
"""

from __future__ import annotations

from PIL import Image

RATIO_PRESETS: dict[str, tuple[int, int]] = {
    "1:1": (1024, 1024),
    "4:5": (1024, 1280),
    "9:16": (1080, 1920),
    "16:9": (1920, 1080),
}


def kich_thuoc_xuat(ratio: str, he_so: int = 1) -> tuple[int, int]:
    """Khung xuất; `he_so=2` khi `upscale=2x` (Đợt 3, 25/09/2026) — vd 9:16 → 2160×3840."""
    rong, cao = RATIO_PRESETS.get(ratio, RATIO_PRESETS["1:1"])
    return rong * he_so, cao * he_so


def dong_khung(anh: Image.Image, ratio: str, he_so: int = 1) -> Image.Image:
    """Đưa về đúng tỷ lệ bằng cách ĐỆM, không cắt.

    Cắt là cách nhanh nhất để mất mấy bông ngoài rìa hoặc cụt cuống — mà bảo
    toàn trọn bó hoa chính là điều M04b hứa. Ảnh RGBA đệm trong suốt; ảnh
    nền đặc đệm bằng màu góc trên trái, tức chính màu phông vừa ghép.
    """
    rong_dich, cao_dich = kich_thuoc_xuat(ratio, he_so)
    ty_le = min(rong_dich / anh.width, cao_dich / anh.height)
    moi = (max(1, int(anh.width * ty_le)), max(1, int(anh.height * ty_le)))
    vua = anh.resize(moi, Image.LANCZOS)

    if anh.mode == "RGBA":
        khung = Image.new("RGBA", (rong_dich, cao_dich), (0, 0, 0, 0))
    else:
        khung = Image.new("RGB", (rong_dich, cao_dich), anh.convert("RGB").getpixel((0, 0)))

    khung.paste(vua, ((rong_dich - moi[0]) // 2, (cao_dich - moi[1]) // 2), vua if anh.mode == "RGBA" else None)
    return khung
