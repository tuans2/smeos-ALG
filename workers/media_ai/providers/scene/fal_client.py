"""Gọi hàng đợi REST chuẩn của fal.ai — cùng khuôn đã xác minh ở
`providers/expansion/fal_outpainter.py` (18/09): `POST https://queue.fal.run/<model>`
với `Authorization: Key <FAL_KEY>` → `request_id` / `status_url` / `response_url`
→ poll tới `COMPLETED` → đọc kết quả JSON → tải ảnh theo URL.

Ảnh gửi đi dưới dạng data URI base64 (fal nhận hợp lệ; khuyến nghị tải lên CDN
của fal cho ảnh lớn — nợ #138 nếu gặp giới hạn kích thước).
"""

from __future__ import annotations

import base64
import os
import time
from io import BytesIO
from typing import Any

import httpx
from PIL import Image

from media_ai.providers.scene.base import SceneProviderError

QUEUE = "https://queue.fal.run"
SO_LAN_POLL = 90
KHOANG_POLL_S = 2.0


def data_uri(anh: Image.Image, fmt: str = "PNG") -> str:
    buf = BytesIO()
    anh.save(buf, format=fmt)
    mime = "image/png" if fmt == "PNG" else "image/jpeg"
    return f"data:{mime};base64," + base64.b64encode(buf.getvalue()).decode("ascii")


class FalClient:
    def __init__(self, api_key: str | None = None, client: httpx.Client | None = None, timeout_s: float | None = None,
                 khoang_poll_s: float = KHOANG_POLL_S) -> None:
        self.api_key = api_key if api_key is not None else os.environ.get("FAL_KEY")
        self._client = client
        self._timeout_s = timeout_s or float(os.environ.get("FAL_TIMEOUT_SECONDS") or 120)
        self._khoang = khoang_poll_s

    def _hdr(self) -> dict[str, str]:
        return {"Authorization": f"Key {self.api_key}", "Content-Type": "application/json"}

    def chay(self, model: str, dau_vao: dict[str, Any]) -> dict[str, Any]:
        if not self.api_key:
            raise SceneProviderError("Thiếu FAL_KEY")
        client = self._client or httpx.Client(timeout=self._timeout_s)
        try:
            r = client.post(f"{QUEUE}/{model}", headers=self._hdr(), json=dau_vao)
            if r.status_code != 200:
                raise SceneProviderError(f"fal {model} từ chối (HTTP {r.status_code}): {r.text[:160]}", r.status_code)
            sub = r.json()
            rid = sub.get("request_id")
            if not rid:
                raise SceneProviderError(f"fal {model} không trả request_id")
            status_url = sub.get("status_url") or f"{QUEUE}/{model}/requests/{rid}/status"
            response_url = sub.get("response_url") or f"{QUEUE}/{model}/requests/{rid}"
            for _ in range(SO_LAN_POLL):
                s = client.get(status_url, headers=self._hdr())
                if s.status_code not in (200, 202):
                    raise SceneProviderError(f"fal {model} lỗi khi hỏi trạng thái (HTTP {s.status_code})", s.status_code)
                st = s.json().get("status")
                if st == "COMPLETED":
                    break
                if st not in ("IN_QUEUE", "IN_PROGRESS"):
                    raise SceneProviderError(f"fal {model} trạng thái lạ: {st!r}")
                time.sleep(self._khoang)
            else:
                raise SceneProviderError(f"fal {model} quá thời gian chờ")
            kq = client.get(response_url, headers=self._hdr())
            if kq.status_code != 200:
                raise SceneProviderError(f"fal {model} không đọc được kết quả (HTTP {kq.status_code})", kq.status_code)
            return kq.json()
        except httpx.HTTPError as exc:
            raise SceneProviderError(f"Lỗi mạng khi gọi fal {model}: {exc}") from exc
        finally:
            if self._client is None:
                client.close()

    def tai_anh(self, url: str) -> Image.Image:
        if url.startswith("data:"):
            anh = Image.open(BytesIO(base64.b64decode(url.split(",", 1)[1])))
            anh.load()
            return anh
        client = self._client or httpx.Client(timeout=self._timeout_s)
        try:
            r = client.get(url)
            if r.status_code != 200:
                raise SceneProviderError(f"Không tải được ảnh kết quả fal (HTTP {r.status_code})", r.status_code)
            anh = Image.open(BytesIO(r.content))
            anh.load()
            return anh
        except httpx.HTTPError as exc:
            raise SceneProviderError(f"Lỗi mạng khi tải ảnh fal: {exc}") from exc
        except OSError as exc:
            raise SceneProviderError(f"Ảnh fal trả về không đọc được: {exc}") from exc
        finally:
            if self._client is None:
                client.close()

    def tai_bytes(self, url: str) -> bytes:
        """Tải tệp kết quả (video) theo URL fal trả về."""
        client = self._client or httpx.Client(timeout=self._timeout_s)
        try:
            r = client.get(url)
            if r.status_code != 200:
                raise SceneProviderError(f"Không tải được tệp kết quả fal (HTTP {r.status_code})", r.status_code)
            return r.content
        except httpx.HTTPError as exc:
            raise SceneProviderError(f"Lỗi mạng khi tải tệp fal: {exc}") from exc
        finally:
            if self._client is None:
                client.close()

