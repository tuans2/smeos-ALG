"""Danh sách nhà cung cấp trọn gói — VAI TRÒ TƯƠNG ĐƯƠNG (PO 25/09/2026).

Thêm nhà cung cấp mới: viết một adapter theo `base.SceneProvider` rồi thêm một
dòng vào `NHA_CUNG_CAP`. Thứ tự thử: nhà cung cấp người gọi chọn (nếu có) →
`VARIANT_PROVIDER_ORDER` trong `.env` → thứ tự trong bảng. Chỉ bên nào CÓ KHOÁ
mới được thử.
"""

from __future__ import annotations

import os
from typing import Callable

from media_ai.providers.scene.base import SceneProvider
from media_ai.providers.scene.fal_scene import FalSceneProvider
from media_ai.providers.scene.imagen_scene import ImagenSceneProvider
from media_ai.providers.scene.stability_scene import StabilitySceneProvider

NHA_CUNG_CAP: dict[str, Callable[[], SceneProvider]] = {
    "fal": FalSceneProvider,
    "stability": StabilitySceneProvider,
    "imagen": ImagenSceneProvider,
}

# Tên cũ ở hợp đồng / payload (Đợt 1) → tên ở đây.
_BIET_DANH = {"stability_ai": "stability", "fal_ai": "fal"}


def thu_tu_nha_cung_cap(uu_tien: str | None = None, thu_tu_tiem: list[str] | None = None) -> list[SceneProvider]:
    """`thu_tu_tiem`: thứ tự core gửi (`payload.provider_order` — bên chọn cho
    lượt → thứ tự tiệm → mặc định, 25/09/2026). Có thì thắng `VARIANT_PROVIDER_ORDER`."""
    cau_hinh = [str(t).strip().lower() for t in (thu_tu_tiem or []) if str(t).strip()] or [
        t.strip().lower() for t in (os.environ.get("VARIANT_PROVIDER_ORDER") or "").split(",") if t.strip()
    ]
    ten = [_BIET_DANH.get(t, t) for t in cau_hinh if _BIET_DANH.get(t, t) in NHA_CUNG_CAP] or list(NHA_CUNG_CAP)
    if uu_tien:
        u = _BIET_DANH.get(uu_tien.strip().lower(), uu_tien.strip().lower())
        if u in NHA_CUNG_CAP:
            ten = [u] + [t for t in ten if t != u]
    ds = [NHA_CUNG_CAP[t]() for t in dict.fromkeys(ten)]
    return [p for p in ds if p.co_khoa()]
