"""Worker M01 — lấy việc từ `generation_jobs` bằng `SKIP LOCKED` +
`LISTEN/NOTIFY` (quyết định D6-1, kiến trúc V2 mục 3.1). Cấm tuyệt đối
`subprocess.Popen` + parse stdout; cấm chạy job qua HTTP (`workers/README.md`
luật 1-5).

`organization_id` lấy CHỈ từ dòng job (`job["organization_id"]`) — không suy
từ dữ liệu ảnh, không nhận từ tham số nào khác (luật 1).

Ba trục job tách rời (luật 2): `stage` đổi khi đổi bước, `result` khi có
phán quyết (`OK`/`LOW_CONFIDENCE`, đặc tả 07 mục 6.1), `status` sau cùng.
Worker KHÔNG ghi `usage` (luật 3) — hạn mức đã kiểm và ghi ở phía core lúc
enqueue (`enqueue-job.ts`).
"""

from __future__ import annotations

import json
import logging
import os
import re
import signal
import time
from pathlib import Path
from typing import Any

import psycopg
from psycopg.rows import dict_row

from shared.job_trace import log_job_claimed
from shared.rls import job_db_context, set_db_context
from shared.job_failure import ghi_job_loi
from shared.log_json import cau_hinh_log, xoa_ngu_canh_job
from shared.storage import dang_dung_kho_dung_chung, doc_bytes
from vision.providers.chung import MucDung, nap_json, tinh_cost_usd
from vision.providers.registry import lay_provider, lay_provider_co_du_phong

log = logging.getLogger("vision.worker")

FEATURE = "vision.analyze"

# Vòng lặp chính không bao giờ được chết vì một sự cố tạm thời (mất kết nối
# Postgres, DNS chớp tắt). Nó ngủ theo thang tăng dần rồi nối lại — tiến
# trình chết là job kẹt `PENDING` vô thời hạn và không ai biết cho tới khi
# người dùng hỏi.
BACKOFF_DAU_GIAY = 1.0
BACKOFF_TOI_DA_GIAY = 60.0
CONTRACT_VERSION = "2"  # Schema.json thêm phong_cach, dip_su_dung vào identity

# Gốc đĩa dùng khi CHƯA cấu hình kho dùng chung. `shared.storage` quyết định
# đọc từ S3/R2 hay từ đĩa theo đúng bốn biến môi trường mà phía web đọc, nên
# web và worker không bao giờ nhìn vào hai kho khác nhau.
REPO_ROOT = Path(__file__).resolve().parents[3]
STORAGE_ROOT = REPO_ROOT / "var" / "storage"


def notify_channel_for(feature: str) -> str:
    """Mirror của `notifyChannelFor` (`postgres-queue-provider.ts`) — hai bên
    phải tính ra cùng một tên kênh, không có nguồn sự thật chung nào khác."""
    return "floraos_job_" + re.sub(r"[^a-zA-Z0-9_]", "_", feature)


def _read_asset_bytes(storage_key: str) -> bytes:
    """Rào thứ hai quanh `storage_key`. Rào thứ nhất ở `registerAsset`
    (`storageKeyMatchesContext`) chặn đường dẫn giả mạo lúc ghi; rào này
    chặn lúc đọc, cho cả những dòng đã nằm sẵn trong bảng từ trước khi rào
    thứ nhất có. `..` trong `storage_key` mà không chặn là worker đọc được
    tệp bất kỳ trên đĩa máy chủ — rào giữ nguyên ở cả đường S3 lẫn đường đĩa.
    """
    return doc_bytes(storage_key, STORAGE_ROOT)


def _emit_event(conn: psycopg.Connection, job_id: str, event: str, payload: dict) -> None:
    """`job_events` — nhật ký cộng dồn cho SSE (đặc tả 07 mục 6.1). `seq` bằng
    `MAX(seq)+1` trong phạm vi job — an toàn vì một job chỉ có đúng một
    worker sở hữu sau `claim_next` (cùng giả định `job_events.seq`, nợ #16).
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO job_events (id, job_id, organization_id, seq, event, payload, created_at)
            VALUES (gen_random_uuid(), %(job_id)s,
                    (SELECT organization_id FROM generation_jobs WHERE id = %(job_id)s),
                    COALESCE((SELECT MAX(seq) FROM job_events WHERE job_id = %(job_id)s), 0) + 1,
                    %(event)s, %(payload)s, now())
            ON CONFLICT (job_id, seq) DO NOTHING
            """,
            {"job_id": job_id, "event": event, "payload": json.dumps(payload)},
        )
    conn.commit()


def claim_next(conn: psycopg.Connection, feature: str) -> dict[str, Any] | None:
    """`SELECT … FOR UPDATE SKIP LOCKED` rồi `UPDATE … PROCESSING`, một giao
    dịch — đúng cơ chế `GenerationJobRepository.claimNext` phía TS (đặc tả 07
    mục 6), worker chạy thẳng câu SQL này, không gọi lại hàm TS (`YC-J8`).
    """
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


def _da_phan_tich(conn: psycopg.Connection, job_id: str, organization_id: str) -> set[str]:
    """Những ảnh đã có kết quả từ một lượt chạy trước của CHÍNH job này.

    Một job lô hỏng ở ảnh thứ tư thì ba ảnh đầu đã ghi xong và đã `commit`
    (kết nối ở chế độ `autocommit`, `rollback` không lấy lại được gì). Lần
    chạy lại phải bỏ qua đúng ba ảnh đó: ghi lại là nhân đôi hàng chờ duyệt,
    mà gọi lại nhà cung cấp cho chúng là tiêu tiền lần hai cho cùng một ảnh.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT asset_id FROM product_analyses WHERE job_id = %s AND organization_id = %s",
            (job_id, organization_id),
        )
        return {row[0] for row in cur.fetchall()}


def _insert_analysis(
    conn: psycopg.Connection,
    job: dict[str, Any],
    asset_id: str,
    product_id: str | None,
    provider: Any,
    raw: dict,
    contract_name: str = "PhanTichSanPhamHoa",
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO product_analyses
                (id, organization_id, product_id, asset_id, job_id,
                 provider, model, model_version, contract_name, contract_version,
                 raw, approval_state, created_at)
            VALUES
                (gen_random_uuid(), %(organization_id)s, %(product_id)s, %(asset_id)s, %(job_id)s,
                 %(provider)s, %(model)s, %(model_version)s, %(contract_name)s, %(contract_version)s,
                 %(raw)s, 'PENDING', now())
            ON CONFLICT (job_id, asset_id) DO NOTHING
            """,
            {
                "organization_id": job["organization_id"],
                "product_id": product_id,
                "asset_id": asset_id,
                "job_id": job["id"],
                "provider": provider.name,
                "model": provider.model_version,
                "model_version": provider.model_version,
                "contract_name": contract_name,
                "contract_version": CONTRACT_VERSION,
                "raw": json.dumps(raw),
            },
        )
    conn.commit()


def process_job(conn: psycopg.Connection, job: dict[str, Any], provider: Any = None) -> None:
    payload = job["payload"] if isinstance(job["payload"], dict) else json.loads(job["payload"])
    asset_ids: list[str] = payload["asset_ids"]
    product_id: str | None = payload.get("product_id")
    organization_id = job["organization_id"]  # luật 1 — chỉ từ dòng job

    # Bộ máy lấy từ chính dòng job, cùng luật với `organization_id`. Điều
    # hành đổi bộ máy giữa lúc job này xếp hàng thì job này vẫn chạy bằng bộ
    # đã chốt lúc tạo (`requestAnalysis`) — hai ảnh cùng một lô không bao giờ
    # chạy bằng hai bộ khác nhau.
    #
    # `provider` truyền vào chỉ để bộ test tiêm bản giả; luồng thật để trống
    # và hỏi sổ đăng ký.
    bo_may_da_hong: str | None = None
    if provider is None:
        provider, _bo_may, bo_may_da_hong = lay_provider_co_du_phong(payload.get("engine"))
        if bo_may_da_hong:
            log.warning(
                "job %s: bộ máy %s dựng không nổi, chạy bằng %s",
                job["id"],
                bo_may_da_hong,
                _bo_may,
            )

    lowest_confidence = 100
    industry = payload.get("industry") or payload.get("industry_key")
    if not industry and not hasattr(conn, "fetchone_queue"):
        try:
            with conn.cursor() as cur:
                # Ngành chỉ ở cột industry_key (ADR-012 T-6c-2 đã xoá settings.industry)
                cur.execute(
                    "SELECT industry_key FROM organizations WHERE id = %s",
                    (organization_id,),
                )
                row = cur.fetchone()
                if row and row[0]:
                    industry = row[0]
        except Exception:
            pass
    industry = industry or "FLORAL"
    contract_name = f"PhanTichSanPham_{industry.capitalize()}" if industry.upper() != "FLORAL" else "PhanTichSanPhamHoa"

    try:
        _emit_event(conn, job["id"], "stage", {"stage": "DETECTING"})
        with conn.cursor() as cur:
            cur.execute("UPDATE generation_jobs SET stage = 'DETECTING' WHERE id = %s", (job["id"],))
        conn.commit()

        da_xong = _da_phan_tich(conn, job["id"], organization_id)
        for asset_id in asset_ids:
            if asset_id in da_xong:
                _emit_event(
                    conn,
                    job["id"],
                    "log",
                    {"asset_id": asset_id, "status": "bỏ qua — đã có kết quả từ lượt trước"},
                )
                continue

            storage_key = _asset_storage_key(conn, organization_id, asset_id)
            image_bytes = _read_asset_bytes(storage_key)

            bat_dau = time.monotonic()
            try:
                raw = provider.analyze(
                    image_bytes,
                    {
                        "organization_id": organization_id,
                        "product_id": product_id,
                        "asset_id": asset_id,
                        "industry": industry,
                    },
                )
            except Exception:
                _ghi_ai_request(
                    conn,
                    job_id=job["id"],
                    organization_id=organization_id,
                    model_key=provider.name,
                    outcome="FAILED",
                    latency_ms=int((time.monotonic() - bat_dau) * 1000),
                    fallback_from=bo_may_da_hong,
                    # Lượt hỏng vẫn bị nhà cung cấp tính tiền nếu nó đã kịp
                    # gọi mô hình — bỏ nó khỏi sổ là để chi phí thật cao hơn
                    # sổ mà không ai giải thích được khoảng lệch.
                    **_so_do_chi_phi(provider),
                )
                raise
            do_tre_ms = int((time.monotonic() - bat_dau) * 1000)

            confidence = raw.get("confidence")
            if isinstance(confidence, (int, float)) and not isinstance(confidence, bool):
                lowest_confidence = min(lowest_confidence, int(confidence))

            _ghi_ai_request(
                conn,
                job_id=job["id"],
                organization_id=organization_id,
                model_key=provider.name,
                outcome="ACCEPTED",
                latency_ms=do_tre_ms,
                quality_score=(
                    confidence / 100
                    if isinstance(confidence, (int, float)) and not isinstance(confidence, bool)
                    else None
                ),
                fallback_from=bo_may_da_hong,
                **_so_do_chi_phi(provider),
            )

            _insert_analysis(conn, job, asset_id, product_id, provider, raw, contract_name=contract_name)
            _emit_event(
                conn,
                job["id"],
                "log",
                {
                    "asset_id": asset_id,
                    "status": "phân tích xong",
                    "engine": provider.name,
                    # Bộ máy tổ chức đã CHỌN mà dựng không nổi, nếu có. Thác
                    # dự phòng nay tụt xuống thang chất lượng (quyết định
                    # 09/17, nợ #84), nên một lượt vẫn ra kết quả bằng bộ kém
                    # hơn — dòng tiến trình người dùng đang xem phải nói ra
                    # điều đó, không để nó đi im lặng.
                    "fallback_from": bo_may_da_hong,
                    "latency_ms": do_tre_ms,
                },
            )

        result = "LOW_CONFIDENCE" if lowest_confidence < 70 else "OK"
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE generation_jobs
                   SET status = 'COMPLETED', result = %s, stage = NULL, completed_at = now()
                 WHERE id = %s
                """,
                (result, job["id"]),
            )
        conn.commit()
        _emit_event(conn, job["id"], "done", {"status": "COMPLETED", "result": result})

    except Exception as exc:  # noqa: BLE001 — job lỗi kỹ thuật, không phải phán quyết nghiệp vụ
        # KHÔNG `rollback()` ở đây: kết nối chạy `autocommit`, những ảnh đã
        # phân tích xong trước ảnh lỗi đã `commit` và không lấy lại được.
        # Chúng là kết quả thật, giữ nguyên — lần chạy lại bỏ qua chúng nhờ
        # `_da_phan_tich` và `ON CONFLICT`.
        log.exception("job %s hỏng", job["id"])
        with conn.cursor() as cur:
            thu_lai = ghi_job_loi(cur, job["id"], exc)
        conn.commit()
        _emit_event(conn, job["id"], "retry" if thu_lai else "done", {"status": "PENDING" if thu_lai else "FAILED", "error": str(exc)})


def _so_do_chi_phi(provider: Any) -> dict[str, Any]:
    """Mức dùng và tiền của lượt vừa chạy, đọc từ chính provider.

    Hỏi provider chứ không tự tính lại: chỉ nó biết nó đã gọi mô hình mấy lần
    (bộ Đầy đủ gọi HAI lượt khi confidence thấp) và bằng bản mô hình nào.

    Bộ chạy cục bộ không có `muc_dung_lan_cuoi` — trả dict rỗng để
    `_ghi_ai_request` giữ `None`, đúng nghĩa "không tiêu tiền nhà cung cấp"
    thay vì "đã đo và bằng 0".
    """
    muc_dung = getattr(provider, "muc_dung_lan_cuoi", None)
    if muc_dung is None:
        return {}
    model = getattr(provider, "model_version", None) or getattr(provider, "name", "")
    return {
        "muc_dung": muc_dung,
        "cost_usd": tinh_cost_usd(str(model), muc_dung, _gia_token()),
    }


def _gia_token() -> dict:
    """Bảng giá ở `contracts/config.json`, đọc một lần rồi giữ lại.

    Giá nằm trong hợp đồng chứ không trong mã: đổi giá là một dòng JSON, và
    lượt đổi đó không cần triển khai lại worker.
    """
    global _GIA_TOKEN_CACHE
    if _GIA_TOKEN_CACHE is None:
        try:
            _GIA_TOKEN_CACHE = nap_json("config.json").get("gia_token") or {}
        except Exception:  # noqa: BLE001 — thiếu bảng giá thì để trống cost_usd
            _GIA_TOKEN_CACHE = {}
    return _GIA_TOKEN_CACHE


_GIA_TOKEN_CACHE: dict | None = None


def _ghi_ai_request(
    conn: psycopg.Connection,
    *,
    job_id: str,
    organization_id: str,
    model_key: str,
    outcome: str,
    latency_ms: int,
    quality_score: float | None = None,
    fallback_from: str | None = None,
    attempt: int = 1,
    muc_dung: MucDung | None = None,
    cost_usd: float | None = None,
    image_count: int = 1,
) -> None:
    """Một dòng `ai_requests` cho MỖI lời gọi mô hình.

    Đường phân tích ảnh là đường gọi AI đông nhất của nền tảng, và trước đợt
    soát này nó không ghi một dòng nào: không độ trễ theo mô hình, không chi
    phí theo mô hình, không dấu vết bộ máy nào đã chạy cho tổ chức nào. Hệ
    quả là cổng đổi provider (`BO_ANH_VANG.md` mục 9, chỉ số 6 — chi phí và
    thời gian mỗi ảnh) không có số để điền, và một bộ máy chậm dần đi không
    ai thấy cho tới khi người dùng phàn nàn.

    Ghi sổ KHÔNG BAO GIỜ làm chết job: một bảng nhật ký hỏng thì mất số liệu,
    còn ném lỗi ở đây thì mất cả kết quả phân tích mà khách đã trả tiền.

    **Bốn cột chi phí (09/17).** `input_tokens`/`output_tokens`/`image_count`/
    `cost_usd` có trong lược đồ từ AI-1 nhưng chưa đường nào điền, nên câu
    "một lượt phân tích tốn bao nhiêu" chỉ trả lời được bằng hoá đơn cuối
    tháng của nhà cung cấp — không tách nổi theo tổ chức, theo bộ máy, hay
    theo ảnh, và đó là nợ #71. Nay số đọc từ `response.usage` của chính nhà
    cung cấp, nhân với bảng giá ở `contracts/config.json`.

    `cost_usd` để TRỐNG khi không có giá cho mô hình đó, không ghi 0: một số 0
    trong sổ chi phí đọc ra "miễn phí", và `local_cv` chạy trên máy nhà thì
    đúng là 0 USD nhưng không đúng là 0 đồng.
    """
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_requests (
                    id, organization_id, job_id, capability_code, model_key,
                    attempt, fallback_from, source, latency_ms, quality_score,
                    input_tokens, output_tokens, image_count, cost_usd,
                    duration_seconds, outcome, created_at
                ) VALUES (
                    gen_random_uuid()::text, %s, %s, 'AIC-01', %s,
                    %s, %s, 'CORE', %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, now()
                )
                """,
                (
                    organization_id,
                    job_id,
                    model_key,
                    attempt,
                    fallback_from,
                    latency_ms,
                    quality_score,
                    muc_dung.input_tokens if muc_dung else None,
                    muc_dung.output_tokens if muc_dung else None,
                    image_count,
                    cost_usd,
                    latency_ms / 1000.0,
                    outcome,
                ),
            )
        conn.commit()
    except Exception:  # noqa: BLE001 — sổ hỏng không được kéo theo job
        log.warning("không ghi được ai_requests cho job %s", job_id, exc_info=True)


def _asset_storage_key(conn: psycopg.Connection, organization_id: str, asset_id: str) -> str:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT storage_key FROM assets WHERE id = %s AND organization_id = %s",
            (asset_id, organization_id),
        )
        row = cur.fetchone()
        if row is None:
            raise LookupError(f"asset {asset_id} không thuộc tổ chức {organization_id}")
        return row[0]


class _CoDungLai:
    """`SIGTERM`/`SIGINT` không cắt ngang giữa một job. Dừng giữa chừng để
    lại job `PROCESSING` mồ côi, phải chờ quét treo 15 phút mới gỡ ra; đặt cờ
    rồi thoát ở đầu vòng lặp kế tiếp thì job đang chạy luôn kết thúc tử tế."""

    def __init__(self) -> None:
        self.dung = False
        for sig in (signal.SIGTERM, signal.SIGINT):
            signal.signal(sig, self._nhan)

    def _nhan(self, *_: Any) -> None:
        log.info("nhận tín hiệu dừng — kết thúc job đang chạy rồi thoát")
        self.dung = True


def _vong_lap(conn: psycopg.Connection, co: "_CoDungLai", poll_interval_seconds: float) -> None:
    channel = notify_channel_for(FEATURE)
    with conn.cursor() as cur:
        cur.execute(f"LISTEN {channel}")

    while not co.dung:
        job = claim_next(conn, FEATURE)
        if job is not None:
            with job_db_context(conn, job):
                process_job(conn, job)
            continue

        for _notify in conn.notifies(timeout=poll_interval_seconds):
            break  # một NOTIFY là đủ để vòng lặp thử claim lại ngay


def run_worker(database_url: str, poll_interval_seconds: float = 5.0) -> None:
    """Vòng lặp chính. `LISTEN` để thức ngay khi có job mới; vẫn giữ vòng lặp
    thăm dò làm lưới an toàn (bỏ lỡ `NOTIFY` khi mất kết nối tạm thời không
    làm job kẹt vô thời hạn — `scan-stuck-jobs.ts`, `YC-J10`, là lưới thứ hai
    ở phía TS cho đúng trường hợp này).

    Mọi sự cố hạ tầng đều nối lại thay vì thoát. Một tiến trình worker chết
    âm thầm là dạng hỏng tệ nhất của M01: API vẫn nhận ảnh, vẫn trừ credit,
    vẫn tạo job, và người dùng ngồi nhìn màn hình chờ không bao giờ xong.
    """
    co = _CoDungLai()
    backoff = BACKOFF_DAU_GIAY

    while not co.dung:
        try:
            with psycopg.connect(database_url, autocommit=True, application_name="smeos-worker:vision") as conn:
                set_db_context(conn, None)  # nhận job đi qua mọi tổ chức — quyền hệ thống (RLS)
                log.info("worker %s đã nối cơ sở dữ liệu, chờ việc", FEATURE)
                backoff = BACKOFF_DAU_GIAY
                _vong_lap(conn, co, poll_interval_seconds)
        except Exception:  # noqa: BLE001 — sự cố hạ tầng, nối lại chứ không thoát
            if co.dung:
                break
            log.exception("mất kết nối, thử lại sau %.0f giây", backoff)
            time.sleep(backoff)
            backoff = min(backoff * 2, BACKOFF_TOI_DA_GIAY)

    log.info("worker %s đã dừng", FEATURE)


def main() -> None:
    cau_hinh_log()
    database_url = os.environ["DATABASE_URL"]
    run_worker(database_url)


if __name__ == "__main__":
    main()
