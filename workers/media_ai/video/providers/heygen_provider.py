"""
HeyGen Video Provider (Phương án B — Chế độ Standby / Sẵn sàng kích hoạt).
Thu hoạch & Chuẩn hóa từ SocialFlow backend/video_providers/heygen.py.
Tạo video nhân vật ảo / MC AI thuyết minh giới thiệu hoa tươi với đồng bộ khẩu hình (lip-sync).
"""

from __future__ import annotations

import json
import os
import time
import urllib.request
from pathlib import Path
from typing import Any, Dict, Optional

from media_ai.video.providers.base import BaseVideoProvider, VideoProviderError
from media_ai.video.providers.local_cinematic import LocalCinematicProvider

HEYGEN_API_URL = "https://api.heygen.com/v2"
POLL_INTERVAL_SECONDS = 5
MAX_POLL_ATTEMPTS = 60


class HeyGenProvider(BaseVideoProvider):
    """
    Adapter kết nối HeyGen AI Video Generation (Talking Avatar / Photo).
    Ở chế độ Standby: Sẵn sàng kích hoạt ngay khi cấu hình HEYGEN_API_KEY.
    """

    def __init__(self, api_key: Optional[str] = None):
        self._api_key = api_key or os.environ.get("HEYGEN_API_KEY") or ""
        self._fallback_provider = LocalCinematicProvider()

    @property
    def name(self) -> str:
        return "HEYGEN"

    @property
    def model_version(self) -> str:
        return "heygen-v2"

    def is_available(self) -> bool:
        """Kiểm tra có API Key để kết nối HeyGen không."""
        return bool(self._api_key.strip())

    def _submit_video(self, script_text: str, title: str) -> str:
        """Gửi yêu cầu tạo video tới HeyGen API."""
        url = f"{HEYGEN_API_URL}/video/generate"
        headers = {
            "X-Api-Key": self._api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "title": title[:50] if title else "ALG Product Video",
            "video_inputs": [
                {
                    "character": {
                        "type": "avatar",
                        "avatar_id": "Daisy-inskirt-20220818",
                        "avatar_style": "normal",
                    },
                    "voice": {
                        "type": "text",
                        "input_text": script_text or "Chào mừng quý khách đến với tiệm hoa tươi cao cấp.",
                        "voice_id": "2d5b0e6cf36f460aa7fc47e3eee4ba54",
                    },
                    "background": {
                        "type": "color",
                        "value": "#fafafa",
                    },
                }
            ],
            "dimension": {
                "width": 1080,
                "height": 1920,
            },
        }

        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            video_id = data.get("data", {}).get("video_id")
            if not video_id:
                raise VideoProviderError(f"HeyGen không trả về video_id: {data}")
            return video_id

    def _poll_video(self, video_id: str, out_file: Path) -> Path:
        """Thăm dò trạng thái render từ HeyGen."""
        url = f"https://api.heygen.com/v1/video_status.get?video_id={video_id}"
        headers = {"X-Api-Key": self._api_key}

        for attempt in range(MAX_POLL_ATTEMPTS):
            time.sleep(POLL_INTERVAL_SECONDS)
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                status = data.get("data", {}).get("status")
                if status == "completed":
                    video_url = data.get("data", {}).get("video_url")
                    if video_url:
                        urllib.request.urlretrieve(video_url, out_file)
                        return out_file
                    raise VideoProviderError(f"HeyGen completed nhưng thiếu video_url: {data}")
                elif status == "failed":
                    err_msg = data.get("data", {}).get("error") or "Không rõ nguyên nhân"
                    raise VideoProviderError(f"HeyGen render thất bại: {err_msg}")

        raise VideoProviderError(f"Quá thời gian chờ render từ HeyGen ({MAX_POLL_ATTEMPTS * POLL_INTERVAL_SECONDS}s)")

    def render_video(
        self,
        job_id: str,
        org_id: str,
        payload: Dict[str, Any],
        out_file: Path,
        progress_callback: Optional[Any] = None,
    ) -> Path:
        """
        Render với HeyGen. Nếu chưa có Key, tự động dự phòng sang Local Cinematic.
        """
        if not self.is_available():
            print("ℹ️ [HeyGenProvider] Chưa cấu hình HEYGEN_API_KEY. Tự động dự phòng sang Local Cinematic.", flush=True)
            if progress_callback:
                progress_callback("LOG", {"message": "HeyGen chưa bật API Key, tự động chuyển sang Local Cinematic Motion"})
            return self._fallback_provider.render_video(job_id, org_id, payload, out_file, progress_callback)

        try:
            if progress_callback:
                progress_callback("STAGE", {"stage": "HEYGEN_SUBMITTING", "progress": 30})

            scenes = payload.get("scenes") or []
            full_script = " ".join(
                str(s.get("voiceScript") or s.get("voice_script") or s.get("textOverlay") or "").strip()
                for s in scenes
            ).strip()

            title = payload.get("title") or "ALG Video"
            video_id = self._submit_video(script_text=full_script, title=title)

            if progress_callback:
                progress_callback("STAGE", {"stage": "HEYGEN_PROCESSING", "progress": 55})

            return self._poll_video(video_id, out_file)

        except Exception as err:
            print(f"⚠️ [HeyGenProvider] Lỗi HeyGen: {err}. Chuyển sang dự phòng Local Cinematic.", flush=True)
            if progress_callback:
                progress_callback("LOG", {"message": f"HeyGen gặp lỗi ({err}), chuyển sang dự phòng Local Cinematic"})
            return self._fallback_provider.render_video(job_id, org_id, payload, out_file, progress_callback)
