"""Rembg Segmenter — Bóc tách chủ thể chuẩn xác từng pixel cho M04a.

Sử dụng `rembg` (U2Net / BiRefNet) để bóc tách chủ thể (bó hoa, cành lá, giấy gói,
nơ và tay cầm) với kênh Alpha (RGBA) sắc nét, giải quyết triệt để lỗi viền mờ chữ nhật
và hiện tượng loang lổ của thuật toán ngưỡng màu HSV trước đây.
"""

from __future__ import annotations

import io
from typing import Any

from PIL import Image

import os
from media_ai.providers.base import Segmenter


class RembgSegmenter:
    """Hiện thực cổng `Segmenter` sử dụng thư viện rembg chạy cục bộ."""

    name = "rembg"
    model_version = "isnet-general-use-v1"

    def __init__(self, model_name: str | None = None) -> None:
        if model_name is None:
            # Ưu tiên đọc VARIANT_SEGMENTATION_MODEL từ biến môi trường (ví dụ: u2netp trong .env)
            # để tránh treo máy hoặc chờ quá lâu khi chạy trên máy phát triển cá nhân
            # Mặc định theo bảng giấy phép (Đợt 3, 25/09/2026): `bria-rmbg` cũ là
            # phi thương mại — xem `providers/segmentation/mo_hinh.py`.
            from media_ai.providers.segmentation.mo_hinh import mo_hinh_tach_nen

            model_name = mo_hinh_tach_nen()
        self.model_name = model_name
        self.model_version = f"{model_name}-v1"
        self._session: Any = None

    def _get_session(self) -> Any:
        if self._session is None:
            try:
                import rembg

                # Ép dùng CPUExecutionProvider để tránh CoreML compiler deadlock trên macOS Apple Silicon
                try:
                    self._session = rembg.new_session(
                        self.model_name, providers=["CPUExecutionProvider"]
                    )
                except Exception:
                    self._session = rembg.new_session(self.model_name)
            except Exception:
                self._session = False
        return self._session if self._session is not False else None

    def segment(self, image: bytes) -> dict[str, Any]:
        """Tuân thủ protocol Segmenter, trả về metadata và alpha mask."""
        rgba_img, mask_l = self.extract_subject(image)
        mask_bytes = io.BytesIO()
        mask_l.save(mask_bytes, format="PNG")

        return {
            "name": self.name,
            "model_version": self.model_version,
            "mask": mask_bytes.getvalue(),
            "width": rgba_img.width,
            "height": rgba_img.height,
        }

    def extract_subject(
        self, image: bytes | Image.Image
    ) -> tuple[Image.Image, Image.Image]:
        """Tách chủ thể ra định dạng RGBA và trả về (ảnh RGBA, mặt nạ Alpha L)."""
        if isinstance(image, bytes):
            pil_img = Image.open(io.BytesIO(image)).convert("RGB")
        else:
            pil_img = image.convert("RGB")

        w, h = pil_img.size
        session = self._get_session()

        if session is not None:
            try:
                import rembg
                from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

                def _do_remove() -> Image.Image:
                    res = rembg.remove(pil_img, session=session)
                    if res.mode != "RGBA":
                        res = res.convert("RGBA")
                    return res

                timeout_s = float(os.environ.get("VARIANT_SEGMENTATION_TIMEOUT_SECONDS", "45"))
                with ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(_do_remove)
                    try:
                        res = future.result(timeout=timeout_s)
                        alpha_mask = res.split()[3]
                        # Bảo tồn 100% pixel RGB gốc từ Master Image: chỉ lấy kênh Alpha từ rembg
                        # không dùng RGB do rembg sinh lại vì có sai số làm trượt cổng Subject Integrity.
                        rgba_img = pil_img.convert("RGBA")
                        rgba_img.putalpha(alpha_mask)
                        return rgba_img, alpha_mask
                    except FuturesTimeoutError:
                        pass
            except Exception:
                pass

        # Fallback an toàn nếu session lỗi, quá giờ hoặc chưa tải được model
        rgba_fallback = pil_img.convert("RGBA")
        mask_fallback = Image.new("L", (w, h), 255)
        return rgba_fallback, mask_fallback
