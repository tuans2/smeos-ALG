"""Hậu cảnh do Stability AI sinh cho nhánh Cloud của M04b (23/09/2026).

Vì sao hậu cảnh RIÊNG, không "sửa ảnh có hoa":
    Nhánh Cloud cũ (`executeCloudCreative`, chạy đồng bộ trong request HTTP)
    gửi nguyên ảnh hoa cho nhà cung cấp và nhận về ảnh mới — bó hoa bị vẽ lại,
    nên không có cách nào ĐO Subject Integrity, và mã cũ gõ tay 0,98. Ở đây
    nhà cung cấp chỉ vẽ KHÔNG GIAN TRỐNG (không hoa, không người, không chữ).
    Worker dán NGUYÊN KHỐI chủ thể đã tách từ Master Image lên trên
    (`StudioBackdropEngine.composite(backdrop_image=...)`), rồi đo lõi chủ thể
    bằng đúng phép đo của nhánh local (`_do_lo_chu_the`). Bó hoa của tiệm
    không bao giờ đi qua mô hình sinh ảnh.

Endpoint: `POST https://api.stability.ai/v2beta/stable-image/generate/core`
(multipart/form-data, trả thẳng byte ảnh khi `Accept: image/*`) — cùng
endpoint adapter TS cũ `stability-ai-image-provider.ts` từng dùng (đã gỡ 25/09 — nợ #152).

Chi phí: Stability không trả số tiền trong phản hồi. `cost_usd` để `None`
(chưa đo được), đúng nguyên tắc "chưa đo được khác 0" của `providers/chung.py`.
"""

from __future__ import annotations

import os
from typing import Any

import platform
import ssl

import random
from io import BytesIO

import httpx
from PIL import Image

from media_ai.providers.background.base import (
    NEGATIVE_MAC_DINH,
    RANG_BUOC_CANH_TRONG,
    BackgroundRequest,
    BackgroundResult,
    NangLuc,
    dung_prompt_hau_canh,
)

_ENDPOINT = "https://api.stability.ai/v2beta/stable-image/generate/core"
# `quality=high` (Đợt 3, 25/09/2026): Stable Image Ultra — cùng dạng multipart
# (prompt, negative_prompt, aspect_ratio, seed, output_format). Giá tham khảo:
# Core 3 credit Stability/ảnh, Ultra 8 (bảng giá bên thứ ba, 06/2026 — trang
# chính thức không tải được nội dung tự động; đối chiếu lại khi đo thật).
_ENDPOINT_ULTRA = "https://api.stability.ai/v2beta/stable-image/generate/ultra"
MODEL_ULTRA = "stable-image-ultra-v2beta"

# Tỷ lệ Stability Core chấp nhận — chọn tỷ lệ gần nhất với khung cần phủ.
_TY_LE_HO_TRO: dict[str, float] = {
    "1:1": 1.0,
    "4:5": 0.8,
    "5:4": 1.25,
    "2:3": 2 / 3,
    "3:2": 1.5,
    "9:16": 9 / 16,
    "16:9": 16 / 9,
    "21:9": 21 / 9,
    "9:21": 9 / 21,
}

# Ràng buộc "cảnh trống" + negative dùng chung khung adapter (`base.py`).
_RANG_BUOC_CANH_TRONG = RANG_BUOC_CANH_TRONG
_NEGATIVE = NEGATIVE_MAC_DINH

_DO_DAI_PROMPT_TOI_DA = 600

# 17 giá trị `style_preset` của Stability Core v2beta (Đợt 2, 25/09/2026).
# Nguồn: tài liệu bên thứ ba đối chiếu 24/09/2026 (trang chính thức không tải
# được nội dung tự động — xem nợ #130). Chỉ dùng để kiểm bảng dịch bên dưới.
STYLE_PRESETS: frozenset[str] = frozenset({
    "3d-model", "analog-film", "anime", "cinematic", "comic-book", "digital-art",
    "enhance", "fantasy-art", "isometric", "line-art", "low-poly",
    "modeling-compound", "neon-punk", "origami", "photographic", "pixel-art",
    "tile-texture",
})

# Ý định phong cách của ALG (`base.PHONG_CACH`) → `style_preset` Stability.
# Chỉ các preset ảnh chụp — ảnh sản phẩm hoa thật không đi với anime/pixel-art.
STYLE_SANG_PRESET: dict[str, str] = {
    "natural": "photographic",
    "cinematic": "cinematic",
    "film": "analog-film",
    "vivid": "enhance",
}


class BackgroundProviderError(RuntimeError):
    """Nhà cung cấp không sinh được hậu cảnh (thiếu khoá, hết credit, lỗi mạng…).

    Worker bắt lỗi này để LÙI về phông tự dựng cục bộ, không làm hỏng job.
    """

    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


def chon_ty_le(width: int, height: int) -> str:
    if width <= 0 or height <= 0:
        return "1:1"
    muc_tieu = width / height
    return min(_TY_LE_HO_TRO, key=lambda k: abs(_TY_LE_HO_TRO[k] - muc_tieu))


def lam_sach_prompt(scene_prompt: str | None) -> str:
    """Cắt độ dài, bỏ ký tự điều khiển, luôn nối ràng buộc 'cảnh trống'."""
    goc = (scene_prompt or "").strip()
    goc = "".join(ch for ch in goc if ch.isprintable())
    goc = goc[:_DO_DAI_PROMPT_TOI_DA]
    if not goc:
        goc = "elegant softly lit interior backdrop for a flower shop product photo"
    return f"{goc}. {_RANG_BUOC_CANH_TRONG}"


class StabilityBackgroundProvider:
    name = "stability_ai"
    model_version = "stable-image-core-v2beta"
    # Bảng năng lực (Đợt 1, 24/09/2026). Seed 0..4294967294 theo API v2beta.
    nang_luc = NangLuc(seed=True, negative_prompt=True, ratios=frozenset(_TY_LE_HO_TRO), style=True, quality=True)
    SEED_TOI_DA = 4_294_967_294

    def __init__(
        self,
        api_key: str | None = None,
        client: httpx.Client | None = None,
        timeout_s: float = 60.0,
    ) -> None:
        self._api_key = api_key if api_key is not None else os.environ.get("STABILITY_API_KEY")
        self._client = client
        self._timeout_s = timeout_s

    def sinh_hau_canh(self, scene_prompt: str | None, width: int, height: int) -> dict[str, Any]:
        """Trả `{"image": bytes, "prompt": str, "aspect_ratio": str}`.

        Ném `BackgroundProviderError` cho MỌI lỗi — kể cả thiếu khoá — để
        worker có đúng một nhánh lùi về phông cục bộ.
        """
        prompt = lam_sach_prompt(scene_prompt)
        ty_le = chon_ty_le(width, height)
        return {"image": self._goi(prompt, ty_le, None), "prompt": prompt, "aspect_ratio": ty_le}

    @staticmethod
    def _style_preset(style: str | None) -> tuple[str | None, list[str]]:
        """Ý định ALG → `style_preset`. Giá trị lạ bị bỏ và ghi `bo_qua` —
        không gửi thẳng cho Stability (enum lạ là HTTP 400)."""
        if not style:
            return None, []
        preset = STYLE_SANG_PRESET.get(style)
        if preset and preset in STYLE_PRESETS:
            return preset, []
        return None, [f"style:{style}"]

    def generate(self, req: BackgroundRequest) -> BackgroundResult:
        """Adapter theo khung chung: ý định ALG → tham số Stability Core.

        - khung: `aspect_ratio` = ĐÚNG tỉ lệ đích (không còn theo ảnh Master);
        - ánh sáng / cỡ cảnh / bảng màu: ghép vào `prompt` (`dung_prompt_hau_canh`);
        - seed: luôn gửi và luôn trả về — không truyền thì tự bốc, để tái tạo được.
        """
        prompt, bo_qua = dung_prompt_hau_canh(req)
        ty_le = req.ratio if req.ratio in _TY_LE_HO_TRO else chon_ty_le(req.rong, req.cao)
        seed = req.seed if req.seed is not None else random.randint(0, self.SEED_TOI_DA)
        seed = max(0, min(int(seed), self.SEED_TOI_DA))
        style_preset, bo_qua_style = self._style_preset(req.style)
        bo_qua = bo_qua + bo_qua_style
        ultra = req.quality == "high"
        if ultra and style_preset is not None:
            # Chưa đối chiếu được tài liệu chính thức rằng Ultra nhận
            # `style_preset` — không gửi, nói thật.
            style_preset = None
            bo_qua.append("style")
        du_lieu = self._goi(prompt, ty_le, seed, style_preset=style_preset, ultra=ultra)
        try:
            anh = Image.open(BytesIO(du_lieu))
            anh.load()
        except Exception as exc:  # noqa: BLE001 — ảnh hỏng là lỗi nhà cung cấp, lùi về phông cục bộ
            raise BackgroundProviderError(f"Stability trả ảnh không đọc được: {exc}") from exc
        return BackgroundResult(
            anh=anh, prompt=prompt, seed=seed, aspect_ratio=ty_le, bo_qua=bo_qua,
            model_version=MODEL_ULTRA if ultra else self.model_version,
        )

    def _goi(
        self, prompt: str, ty_le: str, seed: int | None, style_preset: str | None = None, ultra: bool = False
    ) -> bytes:
        if not self._api_key:
            raise BackgroundProviderError("Thiếu STABILITY_API_KEY")
        du_lieu_form: dict[str, Any] = {
            "prompt": prompt,
            "negative_prompt": _NEGATIVE,
            "aspect_ratio": ty_le,
            "output_format": "png",
        }
        if seed is not None:
            du_lieu_form["seed"] = str(seed)
        if style_preset is not None:
            du_lieu_form["style_preset"] = style_preset
        client = self._client if self._client is not None else httpx.Client(timeout=self._timeout_s)
        try:
            resp = client.post(
                _ENDPOINT_ULTRA if ultra else _ENDPOINT,
                headers={"Authorization": f"Bearer {self._api_key}", "Accept": "image/*"},
                files={"none": ("", b"")},
                data=du_lieu_form,
            )
        except httpx.HTTPError as exc:
            if "PROTOCOL_VERSION" in str(exc).upper():
                raise BackgroundProviderError(
                    "Python của worker không bắt tay TLS 1.3 được với Stability "
                    f"({ssl.OPENSSL_VERSION}, Python {platform.python_version()}). "
                    "Tạo lại workers/.venv bằng Python ≥ 3.11 (pyproject.toml yêu cầu) — "
                    "xem docs/dac-ta/TECHNICAL_DEBT.md nợ #126."
                ) from exc
            raise BackgroundProviderError(f"Lỗi mạng khi gọi Stability: {exc}") from exc
        finally:
            if self._client is None:
                client.close()

        if resp.status_code != 200:
            # Câu dễ hiểu cho chủ tiệm/vận hành; chi tiết gốc giữ phía sau.
            de_hieu = {
                401: "Khoá STABILITY_API_KEY sai hoặc đã bị thu hồi — tạo khoá mới ở platform.stability.ai",
                402: "Tài khoản Stability hết credit — nạp thêm ở platform.stability.ai/account/credits",
                403: "Stability từ chối yêu cầu (kiểm duyệt nội dung hoặc tài khoản bị hạn chế)",
                429: "Stability đang giới hạn tần suất — thử lại sau ít phút",
            }.get(resp.status_code)
            chi_tiet = resp.text[:160]
            raise BackgroundProviderError(
                f"{de_hieu} (HTTP {resp.status_code})" if de_hieu else f"Stability trả HTTP {resp.status_code}: {chi_tiet}",
                status_code=resp.status_code,
            )
        content_type = resp.headers.get("content-type", "")
        if not content_type.startswith("image/") or len(resp.content) < 100:
            raise BackgroundProviderError(
                f"Stability trả dữ liệu không phải ảnh ({content_type}, {len(resp.content)} bytes)"
            )
        return resp.content


def resolve_background_provider(provider_key: str | None) -> StabilityBackgroundProvider:
    """Hiện chỉ có Stability — khoá lạ cũng không được âm thầm đổi nhà cung cấp."""
    key = (provider_key or "stability").strip().lower()
    if key not in {"stability", "stability_ai"}:
        raise BackgroundProviderError(f"Nhà cung cấp hậu cảnh chưa hỗ trợ: {provider_key}")
    return StabilityBackgroundProvider()
