"""Video nhà cung cấp (PO 25/09/2026): mỗi cảnh một clip chuyển động do nhà cung cấp
sinh từ ảnh sản phẩm, ALG ghép clip + bản phối Khu vực C + phụ đề.

Thứ tự thử = `payload.provider_order` (bên chọn cho lượt → thứ tự tiệm → mặc
định veo → kling → runway → luma), chỉ bên có khoá. MỘT nhà cung cấp làm trọn
mọi cảnh để video đồng nhất; một cảnh hỏng → bỏ bên đó, thử bên kế tiếp từ
đầu. Mọi bên hỏng → Ken Burns cục bộ (`LocalCinematicProvider`) với CÙNG ảnh,
âm thanh, phụ đề, và ghi rõ lý do (`ket_qua`) để core hoàn phần chênh credit.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from media_ai.video.clips.base import ClipProvider, ClipProviderError, ClipRequest, mo_ta_canh
from media_ai.video.clips.registry import thu_tu_clip
from media_ai.video.providers.base import BaseVideoProvider, VideoProviderError
from media_ai.video.providers.local_cinematic import LocalCinematicProvider
from media_ai.video.slideshow_engine import SlideshowError, render_clip_sequence


def _don_tam(cb: Dict[str, Any]) -> None:
    a = cb.get("audio_path")
    if isinstance(a, Path) and a.is_file():
        a.unlink(missing_ok=True)
    for f in cb.get("temp_files") or []:
        if isinstance(f, Path) and f.is_file():
            f.unlink(missing_ok=True)


class AiClipVideoProvider(BaseVideoProvider):
    def __init__(self, order: List[str], dung: Callable[[List[str]], List[ClipProvider]] = thu_tu_clip,
                 local: Optional[LocalCinematicProvider] = None) -> None:
        self._order = order
        self._dung = dung
        self._local = local or LocalCinematicProvider()
        self._name = "PROVIDER_CLIPS"
        self._model = "provider_clips"
        self.ket_qua: Dict[str, Any] = {}

    @property
    def name(self) -> str:
        return self._name

    @property
    def model_version(self) -> str:
        return self._model

    def is_available(self) -> bool:
        return self._local.is_available()

    def render_video(self, job_id: str, org_id: str, payload: Dict[str, Any], out_file: Path,
                     progress_callback: Optional[Any] = None) -> Path:
        out_dir = out_file.parent
        out_dir.mkdir(parents=True, exist_ok=True)
        cb = self._local.chuan_bi(job_id, org_id, payload, out_dir, progress_callback)
        anh: List[Path] = cb["image_paths"]
        durations: List[float] = cb["scene_durations"]
        motions: List[str] = cb["scene_motions"]
        loi: List[str] = []
        ben = self._dung(self._order)
        if not ben:
            loi.append("Không nhà cung cấp video nào có khoá trong thứ tự " + ",".join(self._order))

        try:
            for p in ben:
                if progress_callback:
                    progress_callback("STAGE", {"stage": f"CLIPS_{p.name.upper()}", "progress": 60})
                clips: List[Path] = []
                try:
                    for i, img in enumerate(anh):
                        req = ClipRequest(image_path=img, prompt=mo_ta_canh(motions[i] if i < len(motions) else None),
                                          aspect_ratio=cb["aspect_ratio"], duration_s=durations[i] if i < len(durations) else 5.0)
                        clips.append(p.sinh_clip(req, out_dir / f"{job_id}_{p.name}_clip{i}.mp4"))
                    if progress_callback:
                        progress_callback("STAGE", {"stage": "ASSEMBLING", "progress": 85})
                    render_clip_sequence(clips, out_file, cb["aspect_ratio"], durations, cb["audio_path"], cb["subtitle_overlays"])
                except (ClipProviderError, SlideshowError) as exc:
                    loi.append(f"{p.name}: {str(exc)[:200]}")
                    if progress_callback:
                        progress_callback("LOG", {"message": f"{p.name} không dựng được clip — thử nhà cung cấp kế tiếp", "reason": str(exc)[:200]})
                    continue
                finally:
                    for c in clips:
                        c.unlink(missing_ok=True)
                self._name, self._model = p.name.upper(), p.model_version
                self.ket_qua = {"clip_provider": p.name, "provider_fallback": False, "provider_attempts": loi}
                _don_tam(cb)
                return out_file

            # Mọi nhà cung cấp hỏng → Ken Burns cục bộ, cùng ảnh / âm thanh / phụ đề.
            ly_do = "; ".join(loi)
            if progress_callback:
                progress_callback("LOG", {"message": "Mọi nhà cung cấp video lỗi — dựng Ken Burns cục bộ", "reason": ly_do[:300]})
            self._name, self._model = self._local.name, self._local.model_version
            self.ket_qua = {"clip_provider": None, "provider_fallback": True, "provider_fallback_reason": ly_do[:500], "provider_attempts": loi}
            # `render_tu_chuan_bi` dọn âm thanh + phụ đề tạm.
            return self._local.render_tu_chuan_bi(cb, out_file, progress_callback)
        except VideoProviderError:
            raise
