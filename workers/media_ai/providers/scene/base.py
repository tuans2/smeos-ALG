"""Cổng "nhà cung cấp làm trọn gói" cho biến thể Khu vực D (25/09/2026).

Quyết định PO 25/09/2026: khi đã dùng nhà cung cấp thì dùng TOÀN BỘ tính năng
của họ để có chất lượng cao nhất — tách nền, dựng cảnh + chỉnh sáng + ghép, tăng
nét đều do nhà cung cấp làm. Luồng xử lý cục bộ (phông tự dựng, ghép dán nguyên
khối, hoà hợp, tăng nét LANCZOS) chỉ dành cho máy phát triển / khi mọi nhà cung
cấp đều lỗi — hoàn thiện nó là nợ kỹ thuật (#138).

Các nhà cung cấp có VAI TRÒ TƯƠNG ĐƯƠNG (PO 25/09): mỗi bên là một adapter theo
cùng cổng này, khai `NangLucCanh`; thêm bên mới = thêm một adapter + một dòng ở
`registry.py`, không sửa worker.

Hợp đồng nói bằng Ý ĐỊNH ALG (cảnh, ánh sáng, bảng màu, phong cách, seed,
chất lượng) — adapter dịch sang tham số riêng. Ý định nào không làm được (kể cả
qua prompt) ghi vào `bo_qua`, không âm thầm bỏ.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from PIL import Image

# Ý định phong cách → cụm prompt, cho nhà cung cấp không có tham số phong cách riêng.
PHONG_CACH_THANH_PROMPT: dict[str, str] = {
    "natural": "natural true-to-life photographic look",
    "cinematic": "cinematic lighting with depth and contrast",
    "film": "analog film look, soft grain, gentle colors",
    "vivid": "vivid vibrant colors, crisp detail",
}


class SceneProviderError(RuntimeError):
    """Nhà cung cấp không làm được bước này (thiếu khoá, hết credit, lỗi mạng, sai
    dữ liệu). Worker thử nhà cung cấp kế tiếp, hết thì lùi về luồng cục bộ."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class NangLucCanh:
    tach_nen: bool
    dung_canh: bool
    tang_net: bool
    seed: bool
    phong_cach_rieng: bool          # có tham số phong cách riêng (không chỉ qua prompt)
    huong_sang: frozenset[str]      # hướng sáng có tham số riêng
    bac_chat_luong: bool            # có bậc chất lượng cao hơn


@dataclass(frozen=True)
class SceneRequest:
    """Ý định cho MỘT khung. `chu_the_png`: khung đúng tỉ lệ đích, bó hoa đã đặt
    đúng chỗ (bố cục của ALG), nền trong suốt."""

    chu_the_png: bytes
    ratio: str
    rong: int
    cao: int
    scene_prompt: str | None = None
    lighting_direction: str | None = None
    lighting_mood: str | None = None
    palette: tuple[str, ...] = ()
    shot: str | None = None
    seed: int | None = None
    style: str | None = None
    quality: str = "standard"


@dataclass
class SceneResult:
    anh: Image.Image
    prompt: str | None
    seed: int | None
    model_version: str
    bo_qua: list[str] = field(default_factory=list)
    tham_so: dict = field(default_factory=dict)  # tham số THẬT đã gửi (trừ ảnh) — để tái tạo


class SceneProvider(Protocol):
    name: str
    nang_luc: NangLucCanh

    def co_khoa(self) -> bool: ...
    def tach_nen(self, anh: Image.Image) -> Image.Image: ...        # trả alpha (L) cùng kích thước
    def dung_canh(self, req: SceneRequest) -> SceneResult: ...
    def tang_net(self, anh: Image.Image, he_so: int) -> Image.Image: ...
