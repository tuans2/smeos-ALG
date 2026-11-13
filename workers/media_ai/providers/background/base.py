"""Khung adapter chung cho nhà cung cấp HẬU CẢNH của M04b (Đợt 1, 24/09/2026).

Hợp đồng Chặng 06c nói bằng Ý ĐỊNH của ALG (khung, ánh sáng, bảng màu, cỡ
cảnh, seed) — không bằng tên tham số của Stability hay bên nào. Mỗi nhà cung
cấp là một adapter:

    BackgroundRequest (ý định)  ──adapter.generate()──▶  BackgroundResult

và khai một `NangLuc` (bảng năng lực). Ý định mà nhà cung cấp không làm được
KHÔNG bị âm thầm bỏ: adapter ghi tên nó vào `bo_qua` và worker lưu vào asset.

`dung_prompt_hau_canh` là bộ dựng lời nhắc dùng chung cho mọi bên nhận prompt
tiếng Anh — thêm nhà cung cấp mới không phải viết lại phần này.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from PIL import Image

# Luôn nối vào lời nhắc: nhà cung cấp chỉ được vẽ không gian trống. Bó hoa thật
# dán đè sau đó — đây là lớp giảm nhiễu thị giác, không phải lớp bảo vệ sản phẩm.
RANG_BUOC_CANH_TRONG = (
    "empty scene, no flowers, no bouquet, no vase, no people, no hands, no text, "
    "no logo, open space for a product, photorealistic"
)
NEGATIVE_MAC_DINH = "flowers, bouquet, vase, person, hand, text, watermark, logo, blurry, distorted"
DO_DAI_PROMPT_TOI_DA = 600

HUONG_SANG = ("left", "right", "above", "front")

# Phong cách hậu cảnh — khớp `VARIANT_STYLES` ở
# `src/modules/media/domain/variant-direction-rules.ts` (test TS đọc hằng này).
PHONG_CACH = ("natural", "cinematic", "film", "vivid")

# Bậc chất lượng / tăng nét / cách ghép (Đợt 3) — khớp `variant-direction-rules.ts`.
CHAT_LUONG = ("standard", "high")
TANG_NET = ("none", "2x")
CACH_GHEP = ("paste", "harmonize", "relight")

_CUM_HUONG_SANG = {
    "left": "soft key light coming from the left",
    "right": "soft key light coming from the right",
    "above": "soft overhead light from above",
    "front": "soft frontal light",
}
_CUM_SHOT = {
    "close": "tight close-up framing, shallow depth of field, softly blurred background",
    "medium": "medium shot with a surface in the lower third",
    "wide": "wide establishing view, generous empty space, visible surface in the foreground",
}

# Màu tiếng Việt hay gặp trong kịch bản Chặng 05 → tiếng Anh cho mô hình ảnh.
# Màu không có trong bảng và không phải ASCII thì bỏ (không gửi chữ Việt cho mô
# hình chỉ hiểu tiếng Anh) — và ghi vào `bo_qua`.
_MAU_VI_EN = {
    "đỏ": "red", "hồng": "pink", "hồng pastel": "pastel pink", "trắng": "white", "kem": "cream",
    "be": "beige", "vàng": "yellow", "vàng nhạt": "pale yellow", "cam": "orange", "tím": "purple",
    "tím nhạt": "lavender", "xanh lá": "green", "xanh lá cây": "green", "xanh dương": "blue",
    "xanh ngọc": "teal", "xanh": "green", "đen": "black", "nâu": "brown", "gỗ": "wood brown",
    "xám": "grey", "bạc": "silver", "vàng kim": "gold", "đỏ đô": "burgundy", "đỏ rượu": "burgundy",
    "hồng đào": "peach", "đào": "peach", "san hô": "coral", "pastel": "pastel",
}


@dataclass(frozen=True)
class BackgroundRequest:
    """Ý định hậu cảnh cho MỘT khung — không chứa tên tham số của nhà cung cấp nào."""

    ratio: str                         # "9:16" | "4:5" | "1:1" | "16:9"
    rong: int                          # khung làm việc (điểm ảnh)
    cao: int
    scene_prompt: str | None = None    # backgroundPrompt tiếng Anh của cảnh (Chặng 05)
    lighting_direction: str | None = None
    lighting_mood: str | None = None
    palette: tuple[str, ...] = ()
    shot: str | None = None
    seed: int | None = None
    # `style` (Đợt 2, 25/09/2026) — Ý ĐỊNH "phong cách hình ảnh" của ALG
    # (`PHONG_CACH`: natural / cinematic / film / vivid), KHÔNG phải tên
    # `style_preset` của nhà cung cấp nào. Adapter tự dịch (Stability:
    # `STYLE_SANG_PRESET`); không hỗ trợ hoặc giá trị lạ thì ghi `bo_qua`.
    style: str | None = None
    # `quality` (Đợt 3, 25/09/2026): "standard" | "high" — ý định ALG.
    # Stability: high = Stable Image Ultra. Bên không có bậc cao hơn ghi `bo_qua`.
    quality: str = "standard"


@dataclass(frozen=True)
class NangLuc:
    """Bảng năng lực của một nhà cung cấp hậu cảnh."""

    seed: bool
    negative_prompt: bool
    ratios: frozenset[str]
    prompt: bool = True
    style: bool = False
    quality: bool = False


@dataclass
class BackgroundResult:
    anh: Image.Image
    prompt: str | None
    seed: int | None
    aspect_ratio: str
    bo_qua: list[str] = field(default_factory=list)  # ý định nhà cung cấp không làm được
    model_version: str | None = None  # model THẬT đã gọi (vd Core hay Ultra)


class BackgroundProvider(Protocol):
    name: str
    model_version: str
    nang_luc: NangLuc

    def generate(self, req: BackgroundRequest) -> BackgroundResult: ...


def _sach(chuoi: str | None, toi_da: int) -> str:
    goc = "".join(ch for ch in (chuoi or "").strip() if ch.isprintable())
    return goc[:toi_da].strip()


def dich_mau(palette: tuple[str, ...] | list[str]) -> tuple[list[str], list[str]]:
    """(màu tiếng Anh dùng được, màu bỏ qua)."""
    dung, bo = [], []
    for m in palette:
        k = _sach(m, 40).lower()
        if not k:
            continue
        if k in _MAU_VI_EN:
            dung.append(_MAU_VI_EN[k])
        elif k.isascii():
            dung.append(k)
        else:
            bo.append(k)
    return list(dict.fromkeys(dung))[:5], bo


def dung_prompt_hau_canh(req: BackgroundRequest) -> tuple[str, list[str]]:
    """Lời nhắc tiếng Anh từ ý định + danh sách ý định bị bỏ (không dịch được)."""
    phan: list[str] = []
    bo_qua: list[str] = []
    goc = _sach(req.scene_prompt, DO_DAI_PROMPT_TOI_DA)
    phan.append(goc or "elegant softly lit interior backdrop for a flower shop product photo")
    if req.lighting_direction in _CUM_HUONG_SANG:
        phan.append(_CUM_HUONG_SANG[req.lighting_direction])
    mood = _sach(req.lighting_mood, 120)
    if mood:
        if mood.isascii():
            phan.append(mood)
        else:
            bo_qua.append("lighting_mood")  # chữ Việt — mô hình ảnh chỉ hiểu tiếng Anh
    if req.shot in _CUM_SHOT:
        phan.append(_CUM_SHOT[req.shot])
    mau, mau_bo = dich_mau(req.palette)
    if mau:
        phan.append("color palette: " + ", ".join(mau))
    if mau_bo:
        bo_qua.append("palette:" + "|".join(mau_bo))
    return ". ".join(phan) + ". " + RANG_BUOC_CANH_TRONG, bo_qua
