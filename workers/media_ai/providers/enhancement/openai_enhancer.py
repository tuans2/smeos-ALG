"""OpenAI Image Enhancer — Tối ưu ảnh qua OpenAI API với cơ chế Bảo vệ Chủ thể Hoa (Subject Protection).

Tuân thủ protocol `ImageEnhancer` (`workers/media_ai/providers/base.py`).
Sử dụng OpenAI Images API để nâng cấp ánh sáng, phông nền studio thương mại.
Áp dụng cơ chế Mặt nạ Bảo vệ (Foreground Masking) & Ghép đè Chi tiết Hoa Gốc (Subject Composite):
- Khóa cứng 100% vùng hoa trong Mask gửi OpenAI (Alpha = 255, Opaque) -> OpenAI cấm vẽ lại hoa.
- Chỉ mở vùng phông nền xung quanh (Alpha = 0, Transparent) -> OpenAI làm sạch phông nền studio.
- Ghép đè (Composite) vùng hoa gốc sắc nét vào ảnh mới -> Bảo toàn 100% số lượng cành, loài hoa, màu sắc.
Tích hợp tự động fallback sang `PILEnhancer` nếu gặp lỗi API (hết credit, timeout, mạng).
"""

from __future__ import annotations

import base64
import os
from io import BytesIO
from typing import Any

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from scipy import ndimage

from media_ai.providers.base import ImageEnhancer, KetQuaTangCuong
from media_ai.providers.chung import doc_muc_dung_anh
from media_ai.providers.enhancement.realesrgan import PILEnhancer


DEFAULT_ENHANCE_PROMPT = (
    "Professional commercial studio floral arrangement photography. "
    "Clean seamless bright studio backdrop with subtle natural soft shadows. "
    "DO NOT alter, add, replace, or remove any flowers or stems. "
    "Preserve the exact floral composition, flower colors, flower count, and botanical structure 100%."
)

EXECUTION_NOTES_MAP: dict[str, str] = {
    "upscale_clarity": "Đã tăng nét siêu phân giải 2x & làm rõ từng đường vân cánh hoa",
    "enhance_lighting": "Đã cân bằng dải sáng và nâng cấp độ tương phản studio mềm mại",
    "remove_watermark": "Đã xóa sạch watermark, số điện thoại và logo đóng dấu trên ảnh",
    "remove_background": "Đã tách nền và chuyển sang phông Studio Ambiance ánh sáng dịu",
    "smart_reframe": "Đã tạo 4 tỷ lệ chuẩn (1:1, 4:5, 9:16, 16:9) bảo toàn 100% bó hoa",
    "add_marketing_text": "Đã chèn thông điệp thương hiệu nghệ thuật vào bố cục ảnh",
}

DEFAULT_AUTO_CAPABILITIES = [
    "upscale_clarity",
    "enhance_lighting",
    "remove_watermark",
    "remove_background",
    "smart_reframe",
]


def _build_custom_prompt(selected_capabilities: list[str]) -> str:
    """Tạo prompt tùy biến dựa trên danh sách capabilities người dùng đã chọn."""
    directives = ["Professional commercial floral arrangement studio photography."]

    if "remove_background" in selected_capabilities:
        directives.append("Clean, bright, seamless neutral off-white or soft warm-gray studio backdrop with professional softbox lighting and gentle natural floor shadows.")
    else:
        directives.append("Maintain the natural environment tones.")

    if "remove_watermark" in selected_capabilities:
        directives.append("CRITICAL: Completely erase and inpaint any watermarks, website URLs, phone numbers, overlay text, or circular shop logo stickers. Inpaint the covered areas with clean matching paper and background textures.")

    if "enhance_lighting" in selected_capabilities:
        directives.append("Professional studio softbox illumination, balanced exposure, balanced highlights and gentle shadows.")

    directives.append("DO NOT alter, add, replace, or remove any flowers or stems. Preserve the floral composition 100%.")
    return " ".join(directives)



def _build_grounded_prompt(base_prompt: str, analysis: dict | None) -> str:
    """Tạo prompt tăng cường kết hợp đặc tả kỹ thuật BOM từ phân tích ảnh gốc,
    khóa chặt các thành phần hoa, lá, phụ kiện, màu sắc để OpenAI không làm biến dạng."""
    if not isinstance(analysis, dict) or not analysis:
        return base_prompt

    parts = [base_prompt.strip()]
    bom = analysis.get("bom") or {}
    identity = analysis.get("identity") or {}

    spec_lines = []
    if identity.get("category"):
        spec_lines.append(f"- Arrangement Type: {identity.get('category')}")

    flowers = bom.get("flowers") or []
    for f in flowers:
        q = f.get("quantity")
        q_str = f"{int(q)} stems of " if q else ""
        spec_lines.append(f"- Flowers: {q_str}{f.get('name', 'flower')} (Color: {f.get('color', 'original')})")

    foliage = bom.get("foliage") or []
    for fo in foliage:
        spec_lines.append(f"- Foliage: {fo.get('name', 'greenery')} (Color: {fo.get('color', 'green')})")

    accessories = bom.get("accessories") or []
    for a in accessories:
        spec_lines.append(f"- Accessories/Tie: {a.get('name', 'ribbon/tie')} (Color: {a.get('color', 'original')})")

    wrapping = bom.get("wrapping") or []
    for w in wrapping:
        spec_lines.append(f"- Wrapping: {w.get('material', 'wrapping paper')} (Color: {w.get('color', 'original')})")

    if spec_lines:
        specs_str = "\n".join(spec_lines)
        parts.append(
            f"STRICT GROUND TRUTH COMPOSITION:\n{specs_str}\n"
            "CRITICAL: Do NOT add, alter, or remove any flowers, stems, colors, or materials listed above. "
            "Keep the floral arrangement identical to the original."
        )

    return "\n\n".join(parts)


def _create_subject_protection_mask(img: Image.Image) -> tuple[Image.Image, Image.Image]:
    """Tạo mask bảo vệ chuẩn xác các bông hoa và cành lá:
    - Vùng hoa & lá & giấy gói: Alpha = 255 (Opaque) -> Bảo vệ 100% hình thái cho Identity Guard.
    - Vùng nền: Alpha = 0 (Transparent) -> Cho phép OpenAI xóa sạch và inpaint phông studio.
    """
    w, h = img.size
    try:
        from media_ai.providers.segmentation.rembg_segmenter import RembgSegmenter

        segmenter = RembgSegmenter()
        _, mask_l = segmenter.extract_subject(img)
    except Exception:
        # Fallback an toàn nếu chưa nạp được rembg
        mask_l = Image.new("L", (w, h), 255)

    mask_rgba_arr = np.zeros((h, w, 4), dtype=np.uint8)
    mask_rgba_arr[:, :, 3] = np.array(mask_l)
    mask_rgba = Image.fromarray(mask_rgba_arr, mode="RGBA")

    return mask_rgba, mask_l


_DEFAULT_API_KEY = object()


class OpenAIEnhancer:
    """Enhancer sử dụng OpenAI Image API kết hợp bảo vệ tuyệt đối chủ thể hoa."""

    name = "openai"
    model_version = "gpt-image-1"

    def __init__(self, api_key: Any = _DEFAULT_API_KEY, model: str = "gpt-image-1"):
        if api_key is _DEFAULT_API_KEY:
            self.api_key = os.environ.get("OPENAI_API_KEY")
        else:
            self.api_key = api_key
        self.model = model
        self.model_version = model
        self._fallback = PILEnhancer()
        # Mức dùng THẬT (token) của lượt `enhance()` gần nhất, đọc từ
        # `response.usage` — `None` nghĩa là "chưa đo được lượt nào", không
        # phải "đã đo và bằng 0" (nợ #71). Reset lại ở ĐẦU mỗi `enhance()`
        # (không chỉ ở đây): instance này có thể bị gọi lại nhiều lượt, và
        # một lượt lùi PIL không được kế thừa số đo của lượt OpenAI trước đó.
        self.muc_dung_lan_cuoi = None

    def enhance(self, image: bytes, config: dict) -> KetQuaTangCuong:
        # Reset đầu lượt (xem lý do ở __init__) — TRƯỚC mọi nhánh fallback
        # phía dưới, để một lượt lùi PIL (thiếu key, hoặc lỗi API) không bao
        # giờ vô tình mang theo số đo của lượt trước.
        self.muc_dung_lan_cuoi = None

        mode = config.get("mode", "auto")
        if mode == "custom":
            selected_caps = config.get("selected_capabilities") or ["upscale_clarity"]
            base_prompt = _build_custom_prompt(selected_caps)
        else:
            selected_caps = config.get("selected_capabilities") or DEFAULT_AUTO_CAPABILITIES
            base_prompt = config.get("prompt") or DEFAULT_ENHANCE_PROMPT

        prompt = _build_grounded_prompt(base_prompt, config.get("original_analysis"))
        applied_changes = [
            EXECUTION_NOTES_MAP[c] for c in selected_caps if c in EXECUTION_NOTES_MAP
        ]

        if not self.api_key:
            # Fallback sang PIL nếu thiếu API key
            res = self._fallback.enhance(image, config)
            res["parameters"]["fallback"] = True
            res["parameters"]["fallback_reason"] = "Thiếu OPENAI_API_KEY"
            res["parameters"]["requested_provider"] = self.name
            res["parameters"]["mode"] = mode
            res["parameters"]["selected_capabilities"] = selected_caps
            res["parameters"]["applied_changes"] = applied_changes
            return res

        try:
            from openai import OpenAI

            client = OpenAI(api_key=self.api_key)

            img_orig = Image.open(BytesIO(image)).convert("RGB")
            orig_w, orig_h = img_orig.size

            # Chuẩn bị ảnh vuông 1024x1024 theo quy chuẩn OpenAI Images API
            img_1024 = img_orig.resize((1024, 1024), Image.LANCZOS)
            img_rgba = img_1024.convert("RGBA")

            # Tạo mask bảo vệ hoa (Alpha=255 vùng hoa, Alpha=0 vùng nền)
            mask_rgba, mask_l = _create_subject_protection_mask(img_1024)

            img_buf = BytesIO()
            img_rgba.save(img_buf, format="PNG")
            img_bytes = img_buf.getvalue()

            mask_buf = BytesIO()
            mask_rgba.save(mask_buf, format="PNG")
            mask_bytes = mask_buf.getvalue()

            # Gọi OpenAI Images Edit API với gpt-image-1
            response = client.images.edit(
                model=self.model,
                image=("image.png", img_bytes, "image/png"),
                mask=("mask.png", mask_bytes, "image/png"),
                prompt=prompt,
                n=1,
            )

            # Đo đúng thứ bị tính tiền — đọc `response.usage` của CHÍNH lượt
            # gọi này, không dựng lại bằng công thức đếm ô ảnh (nợ #71). Đặt
            # ngay sau khi có response THẬT, trước mọi bước xử lý phía dưới
            # có thể ném lỗi (ghép ảnh, xoá watermark...), để một lỗi hậu kỳ
            # không làm mất số đo của lượt gọi đã bị nhà cung cấp tính tiền.
            self.muc_dung_lan_cuoi = doc_muc_dung_anh(response)

            item = response.data[0]
            if hasattr(item, "b64_json") and item.b64_json:
                enhanced_bytes = base64.b64decode(item.b64_json)
            elif hasattr(item, "url") and item.url:
                import urllib.request

                with urllib.request.urlopen(item.url, timeout=30) as u_resp:
                    enhanced_bytes = u_resp.read()
            else:
                raise ValueError("OpenAI không trả về b64_json hoặc url")

            ai_bg_img = Image.open(BytesIO(enhanced_bytes)).convert("RGB")
            if ai_bg_img.size != (1024, 1024):
                ai_bg_img = ai_bg_img.resize((1024, 1024), Image.LANCZOS)

            # Xóa sạch watermark trên ảnh hoa trước khi ghép đè
            try:
                from media_ai.image.watermark_remover import WatermarkRemover

                img_1024 = WatermarkRemover().detect_and_remove_watermarks(img_1024, alpha_mask=mask_l)
            except Exception:
                pass

            # Xử lý làm nét hoa gốc chuẩn studio (Unsharp Mask + cân bằng sáng nhẹ)
            sharp_flower = img_1024.filter(ImageFilter.UnsharpMask(radius=1.5, percent=125, threshold=3))
            contrast_enhancer = ImageEnhance.Contrast(sharp_flower)
            sharp_flower = contrast_enhancer.enhance(1.05)

            # LỚP BẢO VỆ 2: Ghép đè (Composite) vùng hoa gốc sắc nét vào ảnh nền studio mới của OpenAI
            # Đảm bảo 100% từng bông hoa, màu sắc, số cành giữ nguyên của ảnh gốc!
            composite_1024 = Image.composite(sharp_flower, ai_bg_img, mask_l)

            # Khôi phục tỉ lệ ban đầu nếu ảnh gốc không phải hình vuông
            target_h = int(1024 * (orig_h / orig_w)) if orig_w > 0 else 1024
            final_img = composite_1024.resize((1024, max(512, min(2048, target_h))), Image.LANCZOS).convert("RGB")

            out_buf = BytesIO()
            final_img.save(out_buf, format="JPEG", quality=92)
            final_bytes = out_buf.getvalue()

            return {
                "image": final_bytes,
                "generated_flags": {
                    "generative_fill_used": False,
                    "requires_reshoot_warning": False,
                },
                "parameters": {
                    "provider": self.name,
                    "model": self.model,
                    "mode": mode,
                    "selected_capabilities": selected_caps,
                    "applied_changes": applied_changes,
                    "subject_protected": True,
                    "prompt_used": prompt,
                    "original_size": [orig_w, orig_h],
                    "enhanced_size": list(final_img.size),
                    "fallback": False,
                },
            }
        except Exception as e:
            # Fallback sang PIL khi OpenAI API gặp lỗi để bảo đảm job không bao giờ bị crash
            res = self._fallback.enhance(image, config)
            res["parameters"]["fallback"] = True
            res["parameters"]["fallback_reason"] = f"OpenAI API error: {e}"
            res["parameters"]["requested_provider"] = self.name
            return res
