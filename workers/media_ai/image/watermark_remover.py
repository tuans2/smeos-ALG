"""Watermark Remover & Inpainter — Xóa logo, số điện thoại, chữ đóng dấu trên ảnh hoa.

Sử dụng thuật toán Fast Marching / Navier-Stokes Inpainting của OpenCV (`cv2.inpaint`)
kết hợp phân tích độ tương phản và hình thái học để tẩy sạch watermark và nhãn dán,
khôi phục lại bề mặt giấy gói phẳng phiu mà không làm biến dạng các cánh hoa.
"""

from __future__ import annotations

from io import BytesIO
from typing import Any

import numpy as np
from PIL import Image


class WatermarkRemover:
    """Xóa watermark, chữ đóng dấu và nhãn dán thương hiệu."""

    def __init__(self, inpaint_radius: int = 3) -> None:
        self.inpaint_radius = inpaint_radius

    def inpaint_mask(
        self, image: Image.Image, mask: Image.Image | np.ndarray
    ) -> Image.Image:
        """Thực hiện inpainting trên ảnh PIL với mask nhị phân (255 = vùng cần xóa)."""
        try:
            import cv2

            img_rgb = np.array(image.convert("RGB"))
            img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)

            if isinstance(mask, Image.Image):
                mask_arr = np.array(mask.convert("L"))
            else:
                mask_arr = mask.astype(np.uint8)

            # Đảm bảo mask là nhị phân (0 hoặc 255)
            _, binary_mask = cv2.threshold(mask_arr, 127, 255, cv2.THRESH_BINARY)

            # Nở nhẹ viền mask 2 pixel để bao trọn viền chữ/chân logo
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
            dilated_mask = cv2.dilate(binary_mask, kernel, iterations=1)

            # Áp dụng inpainting Telea
            inpainted_bgr = cv2.inpaint(
                img_bgr, dilated_mask, self.inpaint_radius, cv2.INPAINT_TELEA
            )
            inpainted_rgb = cv2.cvtColor(inpainted_bgr, cv2.COLOR_BGR2RGB)
            return Image.fromarray(inpainted_rgb)
        except Exception:
            # Fallback nếu OpenCV gặp sự cố
            return image

    def detect_and_remove_watermarks(
        self,
        image: Image.Image,
        alpha_mask: Image.Image | None = None,
        custom_regions: list[tuple[int, int, int, int]] | None = None,
    ) -> Image.Image:
        """Tự động rà soát các vùng thường xuất hiện watermark (nhãn dán góc, chữ đóng dấu trên giấy)

        và inpaint sạch sẽ.
        """
        w, h = image.size
        combined_mask = np.zeros((h, w), dtype=np.uint8)

        # 1. Nếu có custom_regions truyền vào: (x1, y1, x2, y2)
        if custom_regions:
            for x1, y1, x2, y2 in custom_regions:
                combined_mask[max(0, y1):min(h, y2), max(0, x1):min(w, x2)] = 255

        # 2. Tự động phát hiện tem nhãn/sticker tròn sáng màu ở các góc
        try:
            import cv2

            img_bgr = cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2BGR)
            gray_for_circle = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            _, white_thresh = cv2.threshold(gray_for_circle, 215, 255, cv2.THRESH_BINARY)
            circle_contours, _ = cv2.findContours(white_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in circle_contours:
                area = cv2.contourArea(cnt)
                perimeter = cv2.arcLength(cnt, True)
                if perimeter > 0:
                    circularity = 4 * np.pi * (area / (perimeter * perimeter))
                    (cx, cy), radius = cv2.minEnclosingCircle(cnt)
                    if circularity > 0.65 and 20 < radius < 140:
                        if cy > h * 0.45 or cx < w * 0.30 or cx > w * 0.70:
                            cv2.circle(combined_mask, (int(cx), int(cy)), int(radius + 4), 255, -1)
        except Exception:
            pass

        # 3. Quét phát hiện watermark dạng text / chữ ký trên giấy và nhãn dán góc
        try:
            import cv2

            img_rgb = np.array(image.convert("RGB"))
            img_gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
            img_hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)

            # 3. Quét phát hiện watermark dạng text / chữ ký trên giấy
            lower_zone = np.zeros_like(img_gray)
            lower_zone[int(h * 0.40):int(h * 0.95), int(w * 0.05):int(w * 0.95)] = 255

            # Tính độ tương phản nét chữ so với nền giấy lân cận (Local Background Subtraction)
            bg_gray = cv2.GaussianBlur(img_gray, (21, 21), 0)
            diff = cv2.subtract(bg_gray, img_gray)

            # Nét mực tối màu:
            # - Tương phản cao với nền giấy (diff > 18)
            # - Độ sáng tuyệt đối < 135
            # - BẮT BUỘC: Độ bão hòa màu thấp (img_hsv[:, :, 1] < 45) để tuyệt đối không ăn vào cánh hoa đỏ, vàng, cam, tím!
            is_dark_ink = (
                (diff > 18)
                & (img_gray < 135)
                & (img_hsv[:, :, 1] < 45)
                & (lower_zone > 0)
            )

            # Lọc hình thái học: nét chữ ký/hotline là các nét mảnh (diện tích thành phần liên thông < 600px)
            # Không bao giờ inpaint các khối lớn như bông hoa hay cành lá
            num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
                is_dark_ink.astype(np.uint8), connectivity=8
            )
            filtered_text_mask = np.zeros_like(img_gray)
            for i in range(1, num_labels):
                area = stats[i, cv2.CC_STAT_AREA]
                cw = stats[i, cv2.CC_STAT_WIDTH]
                ch = stats[i, cv2.CC_STAT_HEIGHT]
                # Nét chữ ký hoặc số điện thoại: diện tích nhỏ hơn 600px, kích thước nhỏ hơn 40px
                if 8 <= area <= 600 and cw <= 45 and ch <= 45:
                    filtered_text_mask[labels == i] = 255

            # Nở nhẹ viền nét chữ 1-2 pixel bằng ellipse để inpaint mượt mà
            kernel_stroke = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
            dilated_text = cv2.dilate(filtered_text_mask, kernel_stroke, iterations=1)
            combined_mask = np.maximum(combined_mask, dilated_text)
        except Exception:
            pass

        if np.any(combined_mask > 0):
            return self.inpaint_mask(image, combined_mask)

        return image
