"""Google Gemini Image — nhà cung cấp dựng cảnh cho biến thể Khu vực D (25/09/2026, PO chọn thêm).

`gemini-2.5-flash-image` DỰNG CẢNH + hoà sáng quanh bó hoa đã đặt đúng chỗ
(bố cục của ALG). Gemini không trả mặt nạ và không có bước tăng nét riêng,
nên `nang_luc` khai thật: `tach_nen=False`, `tang_net=False` —
  - tách nền: bộ tách của ALG (`RembgSegmenter`), ghi `bo_qua: tach_nen:alg`;
  - tăng nét 2x: LANCZOS, ghi `bo_qua: tang_net:lanczos`.
Không trộn cục bộ thay cho bước Gemini LÀM ĐƯỢC (dựng cảnh, ánh sáng). Cổng
"giữ nguyên sản phẩm" vẫn là của ALG (`do_giu_nguyen`).
"""

from __future__ import annotations

from PIL import Image

from media_ai.providers.background.base import BackgroundRequest, dung_prompt_hau_canh
from media_ai.providers.google.gemini_image import MODEL, GeminiImageClient, GeminiImageError
from media_ai.providers.scene.base import (
    PHONG_CACH_THANH_PROMPT,
    NangLucCanh,
    SceneProviderError,
    SceneRequest,
    SceneResult,
)

GIU_NGUYEN = (
    " Keep the flower bouquet EXACTLY as given — same flowers, colours, count, wrapping, "
    "position and size. Only build the surrounding scene and harmonise the lighting."
)


class ImagenSceneProvider:
    name = "imagen"
    nang_luc = NangLucCanh(
        tach_nen=False, dung_canh=True, tang_net=False, seed=False,
        phong_cach_rieng=False, huong_sang=frozenset(), bac_chat_luong=False,
    )

    def __init__(self, client: GeminiImageClient | None = None, segmenter: object | None = None) -> None:
        self._g = client or GeminiImageClient()
        self._seg = segmenter

    def co_khoa(self) -> bool:
        return self._g.co_khoa()

    def tach_nen(self, anh: Image.Image) -> Image.Image:
        try:
            if self._seg is None:
                from media_ai.providers.segmentation.rembg_segmenter import RembgSegmenter

                self._seg = RembgSegmenter()
            _, mat_na = self._seg.extract_subject(anh)  # type: ignore[attr-defined]
        except Exception as exc:  # noqa: BLE001
            raise SceneProviderError(f"Tách nền (ALG) cho Gemini lỗi: {exc}") from exc
        mat_na = mat_na.convert("L")
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
        bo_qua = [*bo_qua, "tach_nen:alg"]
        if req.seed is not None:
            bo_qua.append("seed")
        from io import BytesIO

        chu_the = Image.open(BytesIO(req.chu_the_png)).convert("RGBA")
        nen = Image.new("RGBA", chu_the.size, (235, 235, 235, 255))
        nen.alpha_composite(chu_the)
        try:
            anh = self._g.sua_anh(nen.convert("RGB"), "Build a photographic scene around this bouquet: " + prompt + "." + GIU_NGUYEN)
        except GeminiImageError as exc:
            raise SceneProviderError(str(exc), exc.status_code) from exc
        anh = anh.convert("RGB")
        if anh.size != (req.rong, req.cao):
            anh = anh.resize((req.rong, req.cao), Image.LANCZOS)
        return SceneResult(anh=anh, prompt=prompt, seed=None, model_version=MODEL, bo_qua=bo_qua, tham_so={"model": MODEL})

    def tang_net(self, anh: Image.Image, he_so: int) -> Image.Image:
        return anh.resize((anh.width * he_so, anh.height * he_so), Image.LANCZOS)
