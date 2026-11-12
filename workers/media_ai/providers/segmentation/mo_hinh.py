"""Bảng mô hình tách nền + giấy phép (Đợt 3 nâng cấp chất lượng ảnh, 25/09/2026).

Luật D18 (`AGENTS.md`): mô hình không vào production khi thiếu một trong bốn ô
giấy phép. Soát 25/09/2026 phát hiện mặc định cũ `bria-rmbg` (BRIA RMBG-1.4)
theo giấy phép **bria-rmbg-1.4 — chỉ phi thương mại**, dùng thương mại phải ký
hợp đồng với BRIA (thẻ mô hình huggingface.co/briaai/RMBG-1.4). RMBG-2.0 cũng
CC BY-NC 4.0. ALG là SaaS thu phí → không dùng được hai mô hình này nếu
chưa có hợp đồng.

Mặc định mới: `isnet-general-use` (IS-Net / DIS, repo xuebinqin/DIS, Apache-2.0).
Đo 25/09 trên ảnh tay cầm bó hoa thật (1024×1024, CPU): 1,6 s, ~1,2 GB RAM;
giữ được lá dương xỉ mảnh và TRỌN cẳng tay (u2netp làm mờ nửa cẳng tay → vết
"tay cụt"). BiRefNet (MIT) cho chất lượng cao hơn nữa nhưng bản lite đã vượt
6 GB RAM trên CPU ở 1024 px — chưa hợp máy worker hiện tại.

`VARIANT_SEGMENTATION_MODEL` trong `.env` vẫn đè được (máy dev dùng `u2netp`).
"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class GiayPhep:
    license: str
    commercial_use: bool
    nguon: str


MO_HINH_TACH_NEN: dict[str, GiayPhep] = {
    "isnet-general-use": GiayPhep("Apache-2.0", True, "github.com/xuebinqin/DIS"),
    "u2net": GiayPhep("Apache-2.0", True, "github.com/xuebinqin/U-2-Net"),
    "u2netp": GiayPhep("Apache-2.0", True, "github.com/xuebinqin/U-2-Net"),
    "birefnet-general": GiayPhep("MIT", True, "github.com/ZhengPeng7/BiRefNet"),
    "birefnet-general-lite": GiayPhep("MIT", True, "github.com/ZhengPeng7/BiRefNet"),
    "bria-rmbg": GiayPhep("bria-rmbg-1.4 (phi thương mại)", False, "huggingface.co/briaai/RMBG-1.4"),
}

MAC_DINH = "isnet-general-use"


def mo_hinh_tach_nen() -> str:
    return (os.environ.get("VARIANT_SEGMENTATION_MODEL") or "").strip() or MAC_DINH


def giay_phep(ten: str) -> GiayPhep | None:
    return MO_HINH_TACH_NEN.get(ten)
