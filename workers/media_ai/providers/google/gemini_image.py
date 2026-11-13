"""Gemini API — sửa ảnh theo mô tả (`gemini-2.5-flash-image`), 25/09/2026.

Nhà cung cấp "Google Imagen" trong danh mục Creative Studio (PO chọn thêm).
Một lời gọi REST `generateContent` với ảnh vào (inlineData) + mô tả; đáp ứng
chứa ảnh ra ở `candidates[0].content.parts[].inlineData`. Cùng khoá
`GEMINI_API_KEY` với adapter nội dung / Veo. CHƯA gọi thật từ máy agent (nợ #153).
"""

from __future__ import annotations

import base64
import os
from io import BytesIO

import httpx
from PIL import Image

MODEL = "gemini-2.5-flash-image"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"


class GeminiImageError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class GeminiImageClient:
    def __init__(self, api_key: str | None = None, client: httpx.Client | None = None, timeout_s: float = 120) -> None:
        self.api_key = api_key if api_key is not None else os.environ.get("GEMINI_API_KEY")
        self._client = client
        self._timeout_s = timeout_s

    def co_khoa(self) -> bool:
        return bool(self.api_key)

    def sua_anh(self, anh: Image.Image, mo_ta: str) -> Image.Image:
        if not self.api_key:
            raise GeminiImageError("Thiếu GEMINI_API_KEY")
        buf = BytesIO()
        anh.save(buf, format="PNG")
        than = {
            "contents": [{
                "role": "user",
                "parts": [
                    {"inlineData": {"mimeType": "image/png", "data": base64.b64encode(buf.getvalue()).decode("ascii")}},
                    {"text": mo_ta},
                ],
            }],
            "generationConfig": {"responseModalities": ["IMAGE"]},
        }
        client = self._client or httpx.Client(timeout=self._timeout_s)
        try:
            r = client.post(URL, headers={"x-goog-api-key": self.api_key, "Content-Type": "application/json"}, json=than)
            if r.status_code != 200:
                raise GeminiImageError(f"Gemini Image từ chối (HTTP {r.status_code}): {r.text[:160]}", r.status_code)
            data = r.json()
        except httpx.HTTPError as exc:
            raise GeminiImageError(f"Lỗi mạng khi gọi Gemini Image: {exc}") from exc
        finally:
            if self._client is None:
                client.close()
        for part in ((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []:
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                try:
                    out = Image.open(BytesIO(base64.b64decode(inline["data"])))
                    out.load()
                    return out
                except OSError as exc:
                    raise GeminiImageError(f"Ảnh Gemini trả về không đọc được: {exc}") from exc
        ly_do = (data.get("promptFeedback") or {}).get("blockReason") or ((data.get("candidates") or [{}])[0].get("finishReason"))
        raise GeminiImageError(f"Gemini Image không trả ảnh ({ly_do or 'không rõ'})")
