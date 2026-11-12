"""
Worker xử lý tiến trình Render Video (M04c).
Tuân thủ chuẩn D6-1 của floraos-core:
- Lấy việc bằng SELECT ... FOR UPDATE SKIP LOCKED
- Lắng nghe PostgreSQL LISTEN/NOTIFY qua kênh alg_job_video_render (và kênh cũ floraos_job_video_render)
- Cập nhật job_events (stage, progress, done) cho SSE client
- Cập nhật video_jobs sang RENDER_COMPLETED
- Tích hợp kiến trúc Provider Pattern:
  + Phương án A (Mặc định): LocalCinematicProvider (FFmpeg Ken Burns, 0 credit)
  + Phương án B (Standby): GoogleVeoProvider & HeyGenProvider (AI Generative)
- Tuyệt đối không import bừa bãi, bảo toàn 100% tenant isolation (lấy org_id từ job).
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional

import psycopg
from psycopg.rows import dict_row

from media_ai.video.providers import get_video_provider, VideoProviderError
from shared.job_failure import phan_loai_loi
from shared.job_trace import log_job_claimed
from shared.rls import job_db_context, set_db_context
from shared.log_json import cau_hinh_log, xoa_ngu_canh_job
from shared.storage import dang_dung_kho_dung_chung, ghi_bytes

FEATURE = "video.render"
REPO_ROOT = Path(__file__).resolve().parents[3]
STORAGE_ROOT = REPO_ROOT / "var" / "storage"
RENDER_DIR = STORAGE_ROOT / "videos"


def publish_render(out_file: Path, storage_key: str) -> None:
    """Đưa video vừa dựng lên kho dùng chung (R2/S3) dưới đúng khoá web đọc.

    Web và worker là hai dịch vụ Render khác máy: tệp chỉ nằm trên đĩa worker
    thì `/api/v1/storage/videos/...` không đọc được (audit SDAGF R-14). Chạy
    đĩa cục bộ (dev) thì tệp đã ở đúng chỗ `var/storage/<khoá>` — không làm gì.
    """
    if not dang_dung_kho_dung_chung():
        return
    ghi_bytes(storage_key, out_file.read_bytes(), "video/mp4", STORAGE_ROOT)
    out_file.unlink(missing_ok=True)


def notify_channel_for(feature: str) -> str:
    """Tên kênh LISTEN/NOTIFY tương ứng."""
    return "alg_job_" + re.sub(r"[^a-zA-Z0-9_]", "_", feature)


def legacy_notify_channel_for(feature: str) -> str:
    """Kênh tên cũ trước khi đổi tên ALG (12/11/2026) — vẫn nghe để không lỡ tín hiệu từ web chưa cập nhật."""
    return "floraos_job_" + re.sub(r"[^a-zA-Z0-9_]", "_", feature)


def claim_next(conn: psycopg.Connection, feature: str = FEATURE) -> Optional[Dict[str, Any]]:
    """Lấy job video tiếp theo bằng SELECT FOR UPDATE SKIP LOCKED."""
    xoa_ngu_canh_job()
    with conn.transaction():
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT * FROM generation_jobs
                 WHERE status = 'PENDING' AND feature = %s
                    AND (run_after IS NULL OR run_after <= now())
                 ORDER BY created_at
                 FOR UPDATE SKIP LOCKED
                 LIMIT 1
                """,
                (feature,),
            )
            job = cur.fetchone()
            if job is None:
                return None
            cur.execute(
                "UPDATE generation_jobs SET status = 'PROCESSING', started_at = now() WHERE id = %s",
                (job["id"],),
            )
    log_job_claimed(job)
    return job


def record_job_event(cur: psycopg.Cursor, job_id: str, event: str, payload: Dict[str, Any]):
    """Ghi nhận sự kiện tiến trình vào job_events để client đọc qua SSE."""
    cur.execute(
        """
        INSERT INTO job_events (id, job_id, organization_id, seq, event, payload, created_at)
        VALUES (gen_random_uuid(), %(job_id)s,
                (SELECT organization_id FROM generation_jobs WHERE id = %(job_id)s),
                COALESCE((SELECT MAX(seq) FROM job_events WHERE job_id = %(job_id)s), 0) + 1,
                %(event)s, %(payload)s, NOW())
        """,
        {"job_id": job_id, "event": event, "payload": json.dumps(payload)},
    )


def process_video_job(conn: psycopg.Connection, job: Dict[str, Any]):
    """Thực thi tác vụ render video thông qua Provider."""
    job_id = job["id"]
    org_id = job["organization_id"]
    payload = job.get("payload") or {}
    video_job_id = payload.get("videoJobId") or job_id
    format_type = payload.get("format") or "REEL_15S"

    print(f"🎬 [VideoWorker] Bắt đầu render job {job_id} cho video_job {video_job_id} ({format_type})", flush=True)

    with conn.cursor(row_factory=dict_row) as cur:
        # 1. Chuyển generation_jobs sang PROCESSING
        cur.execute(
            """
            UPDATE generation_jobs
            SET status = 'PROCESSING', stage = 'RENDERING', started_at = NOW(), attempts = attempts + 1
            WHERE id = %s
            """,
            (job_id,),
        )
        record_job_event(cur, job_id, "stage", {"stage": "RENDERING", "progress": 15})

        # 2. Chuẩn bị thư mục và đường dẫn tệp đầu ra
        out_dir = RENDER_DIR / org_id
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / f"{video_job_id}.mp4"

        # 3. Lựa chọn Provider (Mặc định Phương án A LOCAL_CINEMATIC hoặc Phương án B VEO/HEYGEN)
        # PO 25/09/2026: nhà cung cấp trước — core gửi thứ tự thử (`provider_order`);
        # rỗng = người dùng chọn đích danh Ken Burns cục bộ. Job cũ không có
        # trường này giữ cách chọn cũ theo `provider`/biến môi trường.
        provider_order = payload.get("provider_order")
        if isinstance(provider_order, list) and provider_order:
            from media_ai.video.providers.ai_clip_provider import AiClipVideoProvider

            provider = AiClipVideoProvider([str(k) for k in provider_order])
        else:
            provider_name = payload.get("provider") or payload.get("videoProvider")
            provider = get_video_provider(provider_name)
        print(f"🎬 [VideoWorker] Điều phối render qua [{provider.name}] ({provider.model_version})", flush=True)

        def handle_progress(evt_type: str, data: Dict[str, Any]):
            if evt_type == "STAGE":
                record_job_event(cur, job_id, "stage", data)
            elif evt_type == "LOG":
                record_job_event(cur, job_id, "log", data)

        try:
            # 4. Thực thi render qua Provider
            provider.render_video(
                job_id=job_id,
                org_id=org_id,
                payload=payload,
                out_file=out_file,
                progress_callback=handle_progress,
            )
            storage_key = f"videos/{org_id}/{video_job_id}.mp4"
            publish_render(out_file, storage_key)
            video_url = f"/api/v1/storage/{storage_key}"

            # 5. Cập nhật video_jobs sang RENDER_COMPLETED
            cur.execute(
                """
                UPDATE video_jobs
                SET stage = 'RENDER_COMPLETED', final_video_url = %s, error_message = NULL, updated_at = NOW()
                WHERE id = %s AND organization_id = %s
                """,
                (video_url, video_job_id, org_id),
            )

            # 6. Đánh dấu generation_jobs hoàn tất
            output_json = json.dumps({
                "video_url": video_url,
                "video_job_id": video_job_id,
                "provider": provider.name,
                # Core đọc để hoàn phần chênh credit khi nhà cung cấp lỗi và video dựng cục bộ.
                **getattr(provider, "ket_qua", {}),
            })
            cur.execute(
                """
                UPDATE generation_jobs
                SET status = 'COMPLETED', stage = NULL, result = 'SUCCESS',
                    output = %s,
                    completed_at = NOW()
                WHERE id = %s
                """,
                (output_json, job_id),
            )
            record_job_event(cur, job_id, "done", {"progress": 100, "video_url": video_url})
            print(f"✅ [VideoWorker] Render thành công [{provider.name}] video_job {video_job_id} -> {video_url}", flush=True)

        except Exception as exc:
            err_msg = str(exc)
            print(f"❌ [VideoWorker] Thất bại khi render video_job {video_job_id}: {err_msg}", flush=True)
            record_job_event(cur, job_id, "error", {"error": err_msg})

            cur.execute(
                """
                UPDATE video_jobs
                SET stage = 'FAILED', error_message = %s, updated_at = NOW()
                WHERE id = %s AND organization_id = %s
                """,
                (err_msg[:500], video_job_id, org_id),
            )
            cur.execute(
                """
                UPDATE generation_jobs
                SET status = 'FAILED', stage = NULL, result = NULL,
                    error = %s, failure_kind = %s, completed_at = NOW()
                WHERE id = %s
                """,
                (err_msg[:500], phan_loai_loi(exc), job_id),
            )


def run_worker(db_url: Optional[str] = None):
    """Vòng lặp chính của Video Worker lắng nghe sự kiện từ Postgres."""
    dsn = db_url or os.environ.get("DATABASE_URL")
    if not dsn:
        env_file = REPO_ROOT / ".env"
        if env_file.is_file():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("DATABASE_URL=") and not line.startswith("#"):
                    dsn = line.split("=", 1)[1].strip("\"'")
                    break
    if not dsn:
        dsn = "postgresql://smeos:smeos@127.0.0.1:5433/smeos?sslmode=disable"

    channel = notify_channel_for(FEATURE)
    print(f"🚀 [VideoWorker] Khởi động lắng nghe kênh: {channel}", flush=True)

    while True:
        try:
            with psycopg.connect(dsn, autocommit=True, application_name="alg-worker:video") as conn:
                set_db_context(conn, None)  # nhận job đi qua mọi tổ chức — quyền hệ thống (RLS)
                conn.execute(f"LISTEN {channel}")
                conn.execute(f"LISTEN {legacy_notify_channel_for(FEATURE)}")
                print(f"📡 [VideoWorker] Đã kết nối Postgres và lắng nghe kênh {channel}", flush=True)

                while True:
                    # 1. Quét và nhận việc còn tồn trong hàng đợi
                    while True:
                        job = claim_next(conn, FEATURE)
                        if not job:
                            break
                        try:
                            with job_db_context(conn, job):
                                process_video_job(conn, job)
                        except Exception as e:
                            print(f"❌ [VideoWorker] Lỗi ngoài dự kiến xử lý job {job.get('id')}: {e}", flush=True)

                    # 2. Chờ thông báo NOTIFY mới (timeout 5s để định kỳ kiểm tra liveness)
                    for notif in conn.notifies(timeout=5):
                        pass

        except psycopg.OperationalError as op_err:
            print(f"⚠️ [VideoWorker] Mất kết nối Postgres: {op_err}. Thử lại sau 3s...", flush=True)
            time.sleep(3)
        except Exception as general_err:
            print(f"⚠️ [VideoWorker] Ngoại lệ vòng lặp: {general_err}. Thử lại sau 3s...", flush=True)
            time.sleep(3)


if __name__ == "__main__":
    cau_hinh_log()
    run_worker()
