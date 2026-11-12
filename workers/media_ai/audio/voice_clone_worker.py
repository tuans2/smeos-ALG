"""
Voice Clone Worker — job `audio.voice_clone` (24/09/2026).

Quyết định PO 24/09/2026: Voice Clone xây thật với ElevenLabs Instant Voice
Clone. Luồng: đọc mẫu giọng tiệm đã tải (kho, đúng tổ chức) → kiểm độ dài →
`POST /v1/voices/add` → ghi `voice_clones.provider_voice_id` + `READY`.
Hỏng → `voice_clones.status = FAILED` + lý do đọc được; phía TS tự hoàn
credit ở lần đọc kế tiếp (`refundJob`, worker không ghi `usage` — YC-U4).
"""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

from shared.job_failure import ghi_job_loi
from .tts_engine import _ensure_api_key

VOICE_CLONE_FEATURE = "audio.voice_clone"
_REPO_ROOT = Path(__file__).resolve().parents[3]
_STORAGE_ROOT = _REPO_ROOT / "var" / "storage"

# ElevenLabs IVC nhận mẫu ngắn, nhưng dưới ~20 giây giọng nhân bản không giống.
MAU_TOI_THIEU_GIAY = 20.0
MAU_TOI_DA_GIAY = 600.0


def _do_dai_giay(tep: Path) -> float:
    try:
        res = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(tep)],
            capture_output=True, text=True, timeout=20,
        )
        return float(res.stdout.strip())
    except Exception:
        return 0.0


def _loi_than_thien(status: int, body: str) -> str:
    text = body[:300]
    if status == 401:
        return "ElevenLabs từ chối khoá API (401) — kiểm tra ELEVENLABS_API_KEY."
    if status in (402, 429) or "quota" in text.lower():
        return f"Tài khoản ElevenLabs hết hạn mức hoặc bị giới hạn ({status})."
    if "voice_limit" in text or "voice limit" in text.lower():
        return "Tài khoản ElevenLabs đã đủ số giọng tối đa — xoá bớt giọng cũ."
    if "can_not_use_instant_voice_cloning" in text or status == 403:
        return "Gói ElevenLabs hiện tại không có Instant Voice Clone — cần gói Starter trở lên."
    return f"ElevenLabs lỗi {status}: {text}"


def clone_voice_elevenlabs(name: str, sample: Path, mime: str) -> Dict[str, Any]:
    """Gửi mẫu lên ElevenLabs IVC. Trả {'ok': True, 'voice_id'} hoặc {'ok': False, 'error'}."""
    api_key = _ensure_api_key("ELEVENLABS_API_KEY")
    if not api_key:
        return {"ok": False, "error": "Worker thiếu ELEVENLABS_API_KEY — thêm vào .env rồi khởi động lại worker."}
    try:
        import requests

        with open(sample, "rb") as fh:
            resp = requests.post(
                "https://api.elevenlabs.io/v1/voices/add",
                headers={"xi-api-key": api_key},
                data={
                    "name": f"ALG · {name}"[:100],
                    "description": "Giọng nhân bản của chủ tiệm (ALG Creative Studio)",
                    "remove_background_noise": "true",
                    "labels": json.dumps({"source": "smeos"}),
                },
                files=[("files", (sample.name, fh, mime))],
                timeout=120,
            )
        if resp.status_code == 200:
            voice_id = resp.json().get("voice_id")
            if voice_id:
                return {"ok": True, "voice_id": voice_id}
            return {"ok": False, "error": "ElevenLabs không trả voice_id"}
        return {"ok": False, "error": _loi_than_thien(resp.status_code, resp.text)}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": f"Không gọi được ElevenLabs: {exc}"}


def _cap_nhat_giong(conn: Any, org: str, clone_id: str, status: str, voice_id: Optional[str], error: Optional[str]) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE voice_clones
               SET status = %s, provider_voice_id = COALESCE(%s, provider_voice_id),
                   error = %s, updated_at = now()
             WHERE id = %s AND organization_id = %s
            """,
            (status, voice_id, error, clone_id, org),
        )


def process_voice_clone_job(conn: Any, job: Dict[str, Any]) -> None:
    """Chạy một job `audio.voice_clone` đã được `claim_next` nhận."""
    from shared.storage import doc_bytes

    job_id = job["id"]
    org = job["organization_id"]  # chỉ từ dòng job, không từ payload
    payload = job["payload"] if isinstance(job["payload"], dict) else json.loads(job["payload"])
    clone_id = str(payload.get("voiceCloneId") or "")
    key = str(payload.get("sampleStorageKey") or "")
    mime = str(payload.get("sampleMimeType") or "audio/mpeg")
    work = Path(tempfile.mkdtemp(prefix=f"voiceclone_{job_id}_"))
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE generation_jobs SET stage = 'GENERATING' WHERE id = %s", (job_id,))
        conn.commit()

        if not clone_id or not key.startswith(f"org/{org}/"):
            raise RuntimeError("Mẫu giọng không thuộc tổ chức của job")
        sample = work / ("sample" + (Path(key).suffix or ".mp3"))
        sample.write_bytes(doc_bytes(key, _STORAGE_ROOT))

        dai = _do_dai_giay(sample)
        if dai < MAU_TOI_THIEU_GIAY:
            raise RuntimeError(
                f"Mẫu giọng quá ngắn ({dai:.0f}s) — cần tối thiểu {MAU_TOI_THIEU_GIAY:.0f}s, nên 1–3 phút nói rõ, không nhạc nền."
            )
        if dai > MAU_TOI_DA_GIAY:
            raise RuntimeError("Mẫu giọng dài quá 10 phút — cắt còn 1–3 phút.")

        kq = clone_voice_elevenlabs(str(payload.get("name") or "Giọng chủ tiệm"), sample, mime)
        if not kq["ok"]:
            raise RuntimeError(kq["error"])

        _cap_nhat_giong(conn, org, clone_id, "READY", kq["voice_id"], None)
        output = {"voice_clone_id": clone_id, "provider": "elevenlabs", "sample_seconds": round(dai, 1)}
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE generation_jobs
                   SET status = 'COMPLETED', result = 'SAFE', stage = NULL,
                       completed_at = now(), output = %s
                 WHERE id = %s
                """,
                (json.dumps(output), job_id),
            )
        conn.commit()
    except Exception as exc:  # noqa: BLE001
        conn.rollback()
        loi = str(exc)[:1000]
        _cap_nhat_giong(conn, org, clone_id, "FAILED", None, loi)
        with conn.cursor() as cur:
            # Không tự thử lại: bản ghi giọng đã sang FAILED ở trên, chạy lại phải đặt lại nó trước.
            ghi_job_loi(cur, job_id, exc, cho_phep_thu_lai=False)
        conn.commit()
    finally:
        shutil.rmtree(work, ignore_errors=True)
