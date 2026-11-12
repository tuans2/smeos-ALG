"""fal.ai — nhà cung cấp trọn gói (25/09/2026).

Dùng toàn bộ tính năng fal có cho việc này:
  - tách nền: `fal-ai/birefnet/v2` (BiRefNet, MIT) — `output_mask`, độ phân giải 2048;
  - dựng cảnh + ghép + hoà sáng: `fal-ai/bria/product-shot` (BRIA, giấy phép thương
    mại qua API) — `placement_type=original` giữ đúng chỗ bó hoa ALG đã đặt,
    `original_quality=true` giữ kích thước, `optimize_description=true`;
  - tăng nét: `fal-ai/esrgan` (Real-ESRGAN chạy trên máy chủ fal).

Lược đồ product-shot và birefnet đọc từ trang API của fal (25/09/2026); esrgan
theo lược đồ phổ biến (`image_url`, `scale`, `model`) — CHƯA gọi thật được từ máy
agent (chính sách mạng chặn fal.ai). Chạy `scripts/thu-nha-cung-cap-canh.py` trên
máy thật để xác nhận (nợ #138).

BRIA product-shot không nhận seed và không có tham số hướng sáng / phong cách riêng
→ ghi `bo_qua: ["seed"]`; hướng sáng, bảng màu, phong cách đi qua mô tả cảnh.
"""

from __future__ import annotations

import base64

import httpx
from PIL import Image

from media_ai.providers.background.base import BackgroundRequest, dung_prompt_hau_canh
from media_ai.providers.scene.base import (
    PHONG_CACH_THANH_PROMPT,
    NangLucCanh,
    SceneProviderError,
    SceneRequest,
    SceneResult,
)
from media_ai.providers.scene.fal_client import FalClient, data_uri

MODEL_TACH_NEN = "fal-ai/birefnet/v2"
MODEL_CANH = "fal-ai/bria/product-shot"
MODEL_TANG_NET = "fal-ai/esrgan"


def _url_anh(dau_ra: dict, *khoa: str) -> str:
    for k in khoa:
        v = dau_ra.get(k)
        if isinstance(v, dict) and isinstance(v.get("url"), str):
            return v["url"]
        if isinstance(v, list) and v and isinstance(v[0], dict) and isinstance(v[0].get("url"), str):
            return v[0]["url"]
    raise SceneProviderError(f"fal không trả ảnh ({', '.join(khoa)})")


class FalSceneProvider:
    name = "fal"
    nang_luc = NangLucCanh(
        tach_nen=True, dung_canh=True, tang_net=True, seed=False,
        phong_cach_rieng=False, huong_sang=frozenset(), bac_chat_luong=True,
    )

    def __init__(self, api_key: str | None = None, client: httpx.Client | None = None, khoang_poll_s: float = 2.0) -> None:
        self._fal = FalClient(api_key=api_key, client=client, khoang_poll_s=khoang_poll_s)

    def co_khoa(self) -> bool:
        return bool(self._fal.api_key)

    def tach_nen(self, anh: Image.Image) -> Image.Image:
        ra = self._fal.chay(
            MODEL_TACH_NEN,
            {
                "image_url": data_uri(anh.convert("RGB"), "JPEG"),
                "model": "General Use (Heavy)",
                "operating_resolution": "2048x2048",
                "output_mask": True,
                "refine_foreground": True,
                "output_format": "png",
            },
        )
        try:
            mat_na = self._fal.tai_anh(_url_anh(ra, "mask_image")).convert("L")
        except SceneProviderError:
            anh_ra = self._fal.tai_anh(_url_anh(ra, "image"))
            if anh_ra.mode != "RGBA":
                raise SceneProviderError("fal birefnet không trả mặt nạ lẫn kênh alpha")
            mat_na = anh_ra.getchannel("A")
        return mat_na.resize(anh.size, Image.BILINEAR) if mat_na.size != anh.size else mat_na

    def dung_canh(self, req: SceneRequest) -> SceneResult:
        prompt, bo_qua = dung_prompt_hau_canh(
            BackgroundRequest(
                ratio=req.ratio, rong=req.rong, cao=req.cao, scene_prompt=req.scene_prompt,
                lighting_direction=req.lighting_direction, lighting_mood=req.lighting_mood,
                palette=req.palette, shot=req.shot,
            )
        )
        if req.style in PHONG_CACH_THANH_PROMPT:
            prompt = PHONG_CACH_THANH_PROMPT[req.style] + ". " + prompt
        if req.seed is not None:
            bo_qua.append("seed")
        tham_so = {
            "scene_description": prompt,
            "optimize_description": True,
            "num_results": 1,
            "fast": req.quality != "high",
            "placement_type": "original",
            "original_quality": True,
        }
        ra = self._fal.chay(MODEL_CANH, {"image_url": "data:image/png;base64," + _b64(req.chu_the_png), **tham_so})
        anh = self._fal.tai_anh(_url_anh(ra, "images", "image")).convert("RGB")
        return SceneResult(anh=anh, prompt=prompt, seed=None, model_version=MODEL_CANH, bo_qua=bo_qua, tham_so=tham_so)

    def tang_net(self, anh: Image.Image, he_so: int) -> Image.Image:
        ra = self._fal.chay(
            MODEL_TANG_NET,
            {"image_url": data_uri(anh.convert("RGB"), "PNG"), "scale": he_so, "model": "RealESRGAN_x4plus"},
        )
        anh_ra = self._fal.tai_anh(_url_anh(ra, "image", "images")).convert("RGB")
        dich = (anh.width * he_so, anh.height * he_so)
        return anh_ra if anh_ra.size == dich else anh_ra.resize(dich, Image.LANCZOS)


def _b64(b: bytes) -> str:
    return base64.b64encode(b).decode("ascii")
