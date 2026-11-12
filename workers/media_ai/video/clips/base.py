"""Cổng "ảnh → clip chuyển động" cho video Khu vực E (PO 25/09/2026).

Nhà cung cấp sinh chuyển động cho TỪNG cảnh từ ảnh sản phẩm (Veo, Kling, Runway,
Luma — vai trò tương đương, thứ tự do tiệm đặt). Ghép clip + bản phối Khu vực C
+ phụ đề là HẬU KỲ của ALG (FFmpeg), không phải bước chất lượng của nhà
cung cấp. Mọi bên lỗi → dựng Ken Burns cục bộ và ghi rõ lý do.
"""

from __future__ import annotations

import base64
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol


class ClipProviderError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class ClipRequest:
    image_path: Path
    prompt: str
    aspect_ratio: str  # "9:16" | "16:9" | "1:1" | "4:5"
    duration_s: float  # thời lượng cảnh mong muốn — adapter chọn mức gần nhất nhà cung cấp hỗ trợ


class ClipProvider(Protocol):
    name: str
    model_version: str

    def co_khoa(self) -> bool: ...
    def sinh_clip(self, req: ClipRequest, out_path: Path) -> Path: ...


MO_TA_CHUYEN_DONG = {
    "ZOOM_IN": "slow cinematic push-in toward the bouquet",
    "ZOOM_OUT": "slow cinematic pull-back revealing the bouquet",
    "PAN_RIGHT": "slow smooth pan to the right",
    "PAN_LEFT": "slow smooth pan to the left",
    "PAN_UP": "slow tilt up along the bouquet",
    "STATIC": "almost static shot with gentle natural parallax",
}


def mo_ta_canh(motion: str | None, loi_thoai: str | None = None) -> str:
    chuyen_dong = MO_TA_CHUYEN_DONG.get(str(motion or "").upper(), "slow cinematic camera glide")
    return (
        f"{chuyen_dong}. Professional product video of this exact flower bouquet; soft natural light, "
        "subtle petal movement. Keep every flower, colour, wrapping and ribbon identical to the image. "
        "No text, no logos, no people added."
    )


def data_uri(path: Path) -> str:
    duoi = path.suffix.lower()
    mime = "image/png" if duoi == ".png" else "image/webp" if duoi == ".webp" else "image/jpeg"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")
