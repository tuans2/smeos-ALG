"""Smart Reframe — Tạo 4 tỷ lệ từ Master Image MỘT LẦN.

Không gọi lại AI. Chỉ crop/fit thông minh từ ảnh đã tăng cường.
4 tỷ lệ chuẩn (M04 mục 17.3):
  - 1:1      vuông (Instagram post, catalog grid)
  - 4:5      dọc nhẹ (Instagram portrait)
  - 9:16     dọc full (Reels, Stories, TikTok)
  - 16:9     ngang (YouTube thumbnail, web banner)

Logic bảo toàn chủ thể (Subject Preservation):
  - Khi tỷ lệ ảnh gốc và tỷ lệ đích gần nhau (chênh lệch < 8%):
    Crop nhẹ rìa để đạt tỷ lệ toàn màn hình (full-bleed).
  - Khi tỷ lệ lệch nhau (như 16:9 hoặc 9:16):
    Bảo toàn 100% chủ thể bằng Fit & Studio Canvas Extension (Ambiance Pad),
    giữ trọn vẹn từng bông hoa, cành lá, nơ và giấy gói ở trung tâm,
    khoảng đệm mở rộng bằng phông nền Studio Ambiance mịn màng.
"""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageFilter

RATIO_PRESETS: dict[str, tuple[int, int]] = {
    "1:1": (1, 1),
    "4:5": (4, 5),
    "9:16": (9, 16),
    "16:9": (16, 9),
}

BUNDLE_VARIANT_PRESETS: dict[str, tuple[int, int]] = {
    "closeup": (1, 1),
    "angle_15": (4, 5),
}

TARGET_WIDTHS: dict[str, int] = {
    "1:1": 1024,
    "4:5": 1024,
    "9:16": 1080,
    "16:9": 1920,
    "closeup": 1024,
    "angle_15": 1024,
}


@dataclass
class ReframedImage:
    ratio: str
    image: bytes
    width: int
    height: int


class SmartReframe:
    """Tạo các tỷ lệ chuẩn và biến thể bố cục (closeup, dynamic angle) từ một ảnh master."""

    name = "smart_reframe"
    model_version = "studio-ambiance-fit-v2"

    def reframe(
        self, master_image: bytes, include_variants: bool = False
    ) -> dict[str, ReframedImage]:
        """Trả về dict ratio_key -> ReframedImage cho các tỷ lệ chuẩn (và biến thể nếu include_variants=True)."""
        img = Image.open(BytesIO(master_image))
        if img.mode != "RGB":
            img = img.convert("RGB")

        presets = dict(RATIO_PRESETS)
        if include_variants:
            presets.update(BUNDLE_VARIANT_PRESETS)

        results: dict[str, ReframedImage] = {}

        for ratio_key, (rw, rh) in presets.items():
            target_w = TARGET_WIDTHS[ratio_key]
            target_h = int(target_w * rh / rw)

            if ratio_key == "closeup":
                reframed_img = self._render_closeup_macro(img, target_w, target_h)
            elif ratio_key == "angle_15":
                reframed_img = self._render_dynamic_angled(img, target_w, target_h)
            else:
                reframed_img = self._render_studio_ambiance_fit(img, target_w, target_h)

            buf = BytesIO()
            reframed_img.save(buf, format="JPEG", quality=92)
            results[ratio_key] = ReframedImage(
                ratio=ratio_key,
                image=buf.getvalue(),
                width=target_w,
                height=target_h,
            )

        return results

    def _render_closeup_macro(
        self, img: Image.Image, target_w: int, target_h: int
    ) -> Image.Image:
        """Tạo ảnh chụp cận cảnh Macro (Zoom 1.6x vào tâm điểm chất liệu sản phẩm)."""
        orig_w, orig_h = img.size
        # Vùng lấy nét: 60% kích thước trung tâm
        crop_w = int(orig_w * 0.62)
        crop_h = int(orig_h * 0.62)
        left = (orig_w - crop_w) // 2
        # Cân đối hơi hướng lên trên tâm điểm hoa/sản phẩm
        top = max(0, int((orig_h - crop_h) * 0.40))
        if top + crop_h > orig_h:
            top = orig_h - crop_h

        cropped = img.crop((left, top, left + crop_w, top + crop_h))
        # Nâng nét chi tiết vi mô cho ảnh Macro
        enhanced = cropped.resize((target_w, target_h), Image.LANCZOS)
        enhanced = enhanced.filter(ImageFilter.UnsharpMask(radius=1.8, percent=135, threshold=2))
        return enhanced

    def _render_dynamic_angled(
        self, img: Image.Image, target_w: int, target_h: int
    ) -> Image.Image:
        """Tạo bố cục ảnh thương mại với góc nghiêng và ánh sáng định hướng dynamic."""
        from PIL import ImageEnhance
        # Bắt đầu với render 4:5
        base_4_5 = self._render_studio_ambiance_fit(img, target_w, target_h)
        # Tăng tương phản nhẹ và độ ấm để tạo cảm giác góc chụp có chiều sâu
        contrast = ImageEnhance.Contrast(base_4_5)
        res = contrast.enhance(1.06)
        color = ImageEnhance.Color(res)
        res = color.enhance(1.04)
        return res

    def _render_studio_ambiance_fit(
        self, img: Image.Image, target_w: int, target_h: int
    ) -> Image.Image:
        """Tạo ảnh theo tỷ lệ mục tiêu bảo toàn 100% chủ thể với Studio Seamless Canvas Extension.
        Không tạo viền mờ hộp (letterbox box artifact) mà tái tạo liền mạch nền studio."""
        orig_w, orig_h = img.size
        orig_ratio = orig_w / orig_h
        target_ratio = target_w / target_h

        # Nếu tỷ lệ rất gần nhau (chênh lệch < 8%), crop nhẹ với Smart Framing
        ratio_diff = abs(orig_ratio - target_ratio) / target_ratio
        if ratio_diff < 0.08:
            crop_w, crop_h = self._compute_crop_box(orig_w, orig_h, target_w, target_h)
            left = (orig_w - crop_w) // 2
            top = max(0, int((orig_h - crop_h) * 0.25))
            if top + crop_h > orig_h:
                top = orig_h - crop_h
            cropped = img.crop((left, top, left + crop_w, top + crop_h))
            return cropped.resize((target_w, target_h), Image.LANCZOS)

        import numpy as np

        # Lấy mẫu màu sắc rìa ảnh gốc để tạo phông nền studio hòa quyện
        arr = np.array(img)
        # Lấy mẫu từ mép trên và 2 bên
        top_edge = arr[:25, :].reshape(-1, 3)
        left_edge = arr[:, :25].reshape(-1, 3)
        right_edge = arr[:, -25:].reshape(-1, 3)
        border_pixels = np.concatenate([top_edge, left_edge, right_edge], axis=0)
        
        bg_color = tuple(np.median(border_pixels, axis=0).astype(int))

        # Tỷ lệ co dãn của chủ thể trong canvas dọc/ngang
        if target_h > target_w:
            # Khung dọc (4:5 hoặc 9:16 Story)
            # Dành 82% chiều ngang cho chủ thể, đặt ở nửa dưới hoặc trung tâm
            scale = (target_w * 0.88) / orig_w
            sharp_w = max(1, int(orig_w * scale))
            sharp_h = max(1, int(orig_h * scale))
            if sharp_h > target_h * 0.90:
                scale = (target_h * 0.90) / orig_h
                sharp_w = max(1, int(orig_w * scale))
                sharp_h = max(1, int(orig_h * scale))
        else:
            # Khung ngang (16:9)
            scale = (target_h * 0.88) / orig_h
            sharp_w = max(1, int(orig_w * scale))
            sharp_h = max(1, int(orig_h * scale))

        foreground = img.resize((sharp_w, sharp_h), Image.LANCZOS)

        # Tạo studio backdrop gradient tự nhiên liền mạch (sáng ở tâm, dịu ở rìa)
        bg = Image.new("RGB", (target_w, target_h), bg_color)
        
        # Tạo ánh sáng studio vignette nhẹ cho nền
        y, x = np.ogrid[:target_h, :target_w]
        cy, cx = target_h * 0.45, target_w * 0.5
        max_d = np.sqrt(target_w**2 + target_h**2) / 1.8
        dist = np.clip(np.sqrt((x - cx)**2 + (y - cy)**2) / max_d, 0.0, 1.0)
        
        # Mở rộng dải màu từ sáng nhẹ ở tâm sang màu rìa
        center_color = np.clip(np.array(bg_color) + 12, 0, 255)
        edge_color = np.array(bg_color)
        gradient = center_color[np.newaxis, np.newaxis, :] * (1.0 - dist[:, :, np.newaxis] * 0.25)
        gradient = np.clip(gradient, 0, 255).astype(np.uint8)
        bg = Image.fromarray(gradient, mode="RGB")

        # Đặt foreground vào vị trí cân bằng thị giác
        paste_x = (target_w - sharp_w) // 2
        # Khung dọc: đẩy nhẹ lên trên hoặc cân đối (center)
        paste_y = (target_h - sharp_h) // 2

        # Feathering chuyển tiếp mượt mà 60px để triệt tiêu mọi vết cắt viền
        feather_size = min(48, max(12, sharp_w // 20), max(12, sharp_h // 20))
        mask_arr = np.ones((sharp_h, sharp_w), dtype=float)
        for i in range(feather_size):
            factor = (i / float(feather_size)) ** 1.5
            mask_arr[i, :] = np.minimum(mask_arr[i, :], factor)
            mask_arr[sharp_h - 1 - i, :] = np.minimum(mask_arr[sharp_h - 1 - i, :], factor)
            mask_arr[:, i] = np.minimum(mask_arr[:, i], factor)
            mask_arr[:, sharp_w - 1 - i] = np.minimum(mask_arr[:, sharp_w - 1 - i], factor)
        feather_mask = Image.fromarray((mask_arr * 255).astype(np.uint8), mode="L")

        bg.paste(foreground, (paste_x, paste_y), feather_mask)
        return bg

    def _compute_crop_box(
        self, orig_w: int, orig_h: int, target_w: int, target_h: int
    ) -> tuple[int, int]:
        """Tính kích thước crop box trong ảnh gốc để đạt tỷ lệ mục tiêu."""
        orig_ratio = orig_w / orig_h
        target_ratio = target_w / target_h

        if orig_ratio > target_ratio:
            # Ảnh gốc rộng hơn → crop chiều ngang
            crop_h = orig_h
            crop_w = int(orig_h * target_ratio)
        else:
            # Ảnh gốc cao hơn → crop chiều dọc
            crop_w = orig_w
            crop_h = int(orig_w / target_ratio)

        return crop_w, crop_h


def reframe_to_ratios(master_image: bytes) -> dict[str, bytes]:
    """Hàm tiện ích: trả về dict ratio_key -> bytes."""
    reframer = SmartReframe()
    reframed = reframer.reframe(master_image)
    return {k: v.image for k, v in reframed.items()}