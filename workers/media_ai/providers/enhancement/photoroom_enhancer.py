"""Photoroom Image Editing API v2 — enhancer nhà cung cấp cho M04a (25/09/2026).

Một lượt `POST https://image-api.photoroom.com/v2/edit` (multipart, header
`x-api-key`) làm trọn các bước chất lượng Photoroom có: tách nền + phông studio
(`removeBackground`, `background.color`), bóng đổ AI (`shadow.mode=ai.soft`),
chỉnh sáng AI (`lighting.mode=ai.auto`), tăng nét AI (`upscale.mode=ai.fast`).
`referenceBox=originalImage` + `outputSize=originalImage` giữ nguyên khung và vị
trí bó hoa — bố cục là của ALG, không để nhà cung cấp tự cắt lại.

Năng lực Photoroom KHÔNG có (xoá watermark, chèn chữ) ghi vào `bo_qua`, không
âm thầm bỏ và không trộn xử lý cục bộ thay thế (luật PO 25/09/2026).

Lược đồ tham số theo tài liệu API Photoroom v2/edit; CHƯA gọi thật được từ máy
agent (không có khoá) — xác nhận trên máy thật trước khi bật cho khách (nợ #138).
Thay adapter TS cũ (`photoroom-image-provider.ts`, đã gỡ 25/09 — nợ #152) vốn gửi `storage_key` nội bộ
làm `image_url` dạng JSON tới `/v1/segment` — chưa từng chạy đúng.
"""

from __future__ import annotations

import os
from io import BytesIO
from typing import Any

import httpx
from PIL import Image

from media_ai.providers.base import KetQuaTangCuong
from media_ai.providers.enhancement._cloud_common import NhaCungCapLoi, chon_nang_luc, lui_ve_cuc_bo

ENDPOINT = "https://image-api.photoroom.com/v2/edit"
MAU_PHONG_STUDIO = "FFFFFF"

GHI_CHU: dict[str, str] = {
    "remove_background": "Photoroom đã tách nền và đặt lên phông studio trắng kèm bóng đổ AI",
    "enhance_lighting": "Photoroom đã chỉnh sáng AI cho bó hoa",
    "upscale_clarity": "Photoroom đã tăng nét AI",
    "smart_reframe": "Đã tạo 4 tỷ lệ chuẩn (1:1, 4:5, 9:16, 16:9) bảo toàn 100% bó hoa",
}
KHONG_HO_TRO = ("remove_watermark", "add_marketing_text")


class PhotoroomEnhancer:
    name = "photoroom"
    model_version = "photoroom-v2-edit"

    def __init__(self, api_key: str | None = None, client: httpx.Client | None = None, timeout_s: float | None = None,
                 lui_cuc_bo: bool = True) -> None:
        self._lui_cuc_bo = lui_cuc_bo
        self.api_key = api_key if api_key is not None else os.environ.get("PHOTOROOM_API_KEY")
        self._client = client
        self._timeout_s = timeout_s or float(os.environ.get("PHOTOROOM_TIMEOUT_SECONDS") or 90)

    def tham_so(self, selected_caps: list[str]) -> tuple[dict[str, str], list[str], list[str]]:
        """(trường form gửi đi, ghi chú đã áp dụng, năng lực bỏ qua)."""
        data: dict[str, str] = {
            "referenceBox": "originalImage",
            "outputSize": "originalImage",
            "export.format": "jpeg",
        }
        if "remove_background" in selected_caps:
            data["removeBackground"] = "true"
            data["background.color"] = MAU_PHONG_STUDIO
            data["shadow.mode"] = "ai.soft"
        else:
            data["removeBackground"] = "false"
        if "enhance_lighting" in selected_caps:
            data["lighting.mode"] = "ai.auto"
        if "upscale_clarity" in selected_caps:
            data["upscale.mode"] = "ai.fast"
        da_ap_dung = [GHI_CHU[c] for c in selected_caps if c in GHI_CHU]
        bo_qua = [c for c in selected_caps if c in KHONG_HO_TRO]
        return data, da_ap_dung, bo_qua

    def _loi(self, image: bytes, config: dict[str, Any], ly_do: str) -> KetQuaTangCuong:
        """`lui_cuc_bo=False` (trong chuỗi nhà cung cấp): ném để thử bên kế tiếp."""
        if not self._lui_cuc_bo:
            raise NhaCungCapLoi(self.name, ly_do)
        return lui_ve_cuc_bo(image, config, self.name, ly_do)

    def enhance(self, image: bytes, config: dict[str, Any]) -> KetQuaTangCuong:
        mode, selected_caps = chon_nang_luc(config)
        if not self.api_key:
            return self._loi(image, config, "Thiếu PHOTOROOM_API_KEY")

        data, da_ap_dung, bo_qua = self.tham_so(selected_caps)
        client = self._client or httpx.Client(timeout=self._timeout_s)
        try:
            r = client.post(
                ENDPOINT,
                headers={"x-api-key": self.api_key, "Accept": "image/jpeg, image/png"},
                data=data,
                files={"imageFile": ("image.jpg", image, "image/jpeg")},
            )
            if r.status_code != 200:
                return self._loi(
                    image, config, f"Photoroom từ chối (HTTP {r.status_code}): {r.text[:160]}"
                )
            anh = Image.open(BytesIO(r.content))
            anh.load()
        except httpx.HTTPError as exc:
            return self._loi(image, config, f"Lỗi mạng khi gọi Photoroom: {exc}")
        except OSError as exc:
            return self._loi(image, config, f"Ảnh Photoroom trả về không đọc được: {exc}")
        finally:
            if self._client is None:
                client.close()

        buf = BytesIO()
        anh.convert("RGB").save(buf, format="JPEG", quality=92)
        return {
            "image": buf.getvalue(),
            "generated_flags": {"generative_fill_used": False, "requires_reshoot_warning": False},
            "parameters": {
                "provider": self.name,
                "model": self.model_version,
                "mode": mode,
                "selected_capabilities": selected_caps,
                "applied_changes": da_ap_dung,
                "bo_qua": bo_qua,
                "tham_so_nha_cung_cap": data,
                "enhanced_size": list(anh.size),
                "fallback": False,
            },
        }
