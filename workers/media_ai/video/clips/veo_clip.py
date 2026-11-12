"""Google Veo qua Gemini API — ảnh → video (25/09/2026).

`POST …/models/{model}:predictLongRunning` với `instances[0].{prompt, image}` và
`parameters.{aspectRatio}`; poll `GET …/{operation}` tới `done`, tải
`response.generateVideoResponse.generatedSamples[0].video.uri` (header khoá).
Veo chỉ hỗ trợ 16:9 và 9:16 — khung khác xin 9:16 rồi ALG cắt khung khi
ghép. Khoá `GOOGLE_VEO_API_KEY` hoặc `GEMINI_API_KEY`. CHƯA gọi thật (nợ #153).
Thay nhánh Veo cũ (`providers/veo_provider.py`) chỉ sinh MỘT clip cho cả video
và bỏ mất lời thoại / nhạc / phụ đề.
"""

from __future__ import annotations

import base64
import os
import time
from pathlib import Path

import httpx

from media_ai.video.clips.base import ClipProviderError, ClipRequest

BASE = "https://generativelanguage.googleapis.com/v1beta"
MODEL = "veo-3.0-generate-001"


class VeoClip:
    name = "veo"
    model_version = MODEL

    def __init__(self, api_key: str | None = None, client: httpx.Client | None = None, khoang_poll_s: float = 10.0, so_lan_poll: int = 60) -> None:
        self.api_key = api_key if api_key is not None else (os.environ.get("GOOGLE_VEO_API_KEY") or os.environ.get("GEMINI_API_KEY"))
        self._client = client
        self._khoang = khoang_poll_s
        self._so_lan = so_lan_poll

    def co_khoa(self) -> bool:
        return bool(self.api_key)

    def sinh_clip(self, req: ClipRequest, out_path: Path) -> Path:
        if not self.api_key:
            raise ClipProviderError("Thiếu GEMINI_API_KEY / GOOGLE_VEO_API_KEY")
        hdr = {"x-goog-api-key": self.api_key, "Content-Type": "application/json"}
        duoi = req.image_path.suffix.lower()
        mime = "image/png" if duoi == ".png" else "image/jpeg"
        client = self._client or httpx.Client(timeout=120)
        try:
            r = client.post(f"{BASE}/models/{MODEL}:predictLongRunning", headers=hdr, json={
                "instances": [{
                    "prompt": req.prompt,
                    "image": {"bytesBase64Encoded": base64.b64encode(req.image_path.read_bytes()).decode("ascii"), "mimeType": mime},
                }],
                "parameters": {"aspectRatio": "16:9" if req.aspect_ratio == "16:9" else "9:16"},
            })
            if r.status_code != 200:
                raise ClipProviderError(f"Veo từ chối (HTTP {r.status_code}): {r.text[:160]}", r.status_code)
            op = r.json().get("name")
            if not op:
                raise ClipProviderError("Veo không trả mã tiến trình")
            for _ in range(self._so_lan):
                s = client.get(f"{BASE}/{op}", headers=hdr)
                if s.status_code != 200:
                    raise ClipProviderError(f"Veo lỗi khi hỏi tiến trình (HTTP {s.status_code})", s.status_code)
                d = s.json()
                if d.get("done"):
                    if d.get("error"):
                        raise ClipProviderError(f"Veo thất bại: {str(d['error'])[:160]}")
                    mau = ((d.get("response") or {}).get("generateVideoResponse") or {}).get("generatedSamples") or []
                    uri = ((mau[0] if mau else {}).get("video") or {}).get("uri")
                    if not uri:
                        raise ClipProviderError("Veo xong nhưng không có video (có thể bị bộ lọc an toàn chặn)")
                    v = client.get(uri, headers={"x-goog-api-key": self.api_key}, follow_redirects=True)
                    if v.status_code != 200:
                        raise ClipProviderError(f"Không tải được video Veo (HTTP {v.status_code})", v.status_code)
                    out_path.write_bytes(v.content)
                    return out_path
                time.sleep(self._khoang)
            raise ClipProviderError("Veo quá thời gian chờ")
        except httpx.HTTPError as exc:
            raise ClipProviderError(f"Lỗi mạng khi gọi Veo: {exc}") from exc
        finally:
            if self._client is None:
                client.close()
