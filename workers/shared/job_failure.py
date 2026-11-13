"""Ghi job lỗi có kỷ luật (ROADMAP E5.1): phân loại lỗi, tự thử lại lỗi tạm thời có backoff.

Lỗi tạm thời (hết thời gian chờ, mất kết nối, nhà cung cấp 429/5xx) → job quay về `PENDING` với
`run_after` = bây giờ + backoff (30 giây nhân đôi mỗi lần, tối đa 10 phút, cộng ngẫu nhiên để các
job lỗi cùng lúc không dội lại cùng lúc), tối đa `MAX_LAN_THU` lần. Hết lượt hoặc lỗi cần người xử lý
(dữ liệu sai, ảnh hỏng, lỗi lập trình) → `FAILED` kèm `failure_kind`. Khớp `TaskFailureKind` của
`src/lib/ui-system/task-state.ts` (`retryable` / `needs_action`).

Credit đã trừ một lần lúc tạo job; các lần tự thử lại không trừ thêm. Hoàn credit vẫn do phía web
làm khi job dừng hẳn ở `FAILED`.
"""

from __future__ import annotations

import random
from typing import Any, Callable

RETRYABLE = "RETRYABLE"
NEEDS_ACTION = "NEEDS_ACTION"

MAX_LAN_THU = 3
BACKOFF_CO_SO_GIAY = 30
BACKOFF_TOI_DA_GIAY = 600
DO_DAI_LOI_TOI_DA = 1000

_TEN_LOI_TAM_THOI = {
    # httpx
    "TimeoutException", "ConnectTimeout", "ReadTimeout", "WriteTimeout", "PoolTimeout",
    "ConnectError", "ReadError", "WriteError", "RemoteProtocolError", "NetworkError",
    # openai / anthropic SDK
    "APITimeoutError", "APIConnectionError", "RateLimitError", "InternalServerError",
    # psycopg
    "OperationalError",
}


def _ma_http(exc: BaseException) -> int | None:
    for ten in ("status_code", "status"):
        ma = getattr(exc, ten, None)
        if isinstance(ma, int):
            return ma
    phan_hoi = getattr(exc, "response", None)
    ma = getattr(phan_hoi, "status_code", None)
    return ma if isinstance(ma, int) else None


def _tam_thoi(exc: BaseException) -> bool:
    if isinstance(exc, (TimeoutError, ConnectionError)):
        return True
    if any(cls.__name__ in _TEN_LOI_TAM_THOI for cls in type(exc).__mro__):
        return True
    ma = _ma_http(exc)
    return ma is not None and (ma == 429 or 500 <= ma <= 599)


def phan_loai_loi(exc: BaseException) -> str:
    """`RETRYABLE` nếu lỗi (hoặc nguyên nhân gốc trong chuỗi `__cause__`/`__context__`) là tạm thời."""
    da_xet: set[int] = set()
    hien_tai: BaseException | None = exc
    while hien_tai is not None and id(hien_tai) not in da_xet:
        if _tam_thoi(hien_tai):
            return RETRYABLE
        da_xet.add(id(hien_tai))
        hien_tai = hien_tai.__cause__ or hien_tai.__context__
    return NEEDS_ACTION


def backoff_giay(lan_thu: int, ngau_nhien: Callable[[], float] = random.random) -> float:
    """Chờ trước lần thử thứ `lan_thu + 1`: trần(30·2^(n−1), 600) × [0,5; 1)."""
    tran = min(BACKOFF_TOI_DA_GIAY, BACKOFF_CO_SO_GIAY * 2 ** max(0, lan_thu - 1))
    return tran * (0.5 + ngau_nhien() / 2)


def ghi_job_loi(
    cur: Any,
    job_id: Any,
    exc: BaseException,
    *,
    cho_phep_thu_lai: bool = True,
    ngau_nhien: Callable[[], float] = random.random,
) -> bool:
    """Ghi lỗi cho job; trả `True` nếu đã hẹn thử lại (job về `PENDING`), `False` nếu dừng ở `FAILED`.

    Một câu UPDATE: đếm `attempts` (mỗi lần lỗi +1) và quyết định thử lại ngay trong CSDL, nên hai
    tiến trình không đọc-rồi-ghi đè nhau. Người gọi tự `commit()`.
    """
    loai = phan_loai_loi(exc)
    thu_lai = cho_phep_thu_lai and loai == RETRYABLE
    he_so = 0.5 + ngau_nhien() / 2
    cur.execute(
        """
        WITH q AS (
          SELECT %(thu_lai)s AND attempts + 1 < %(max)s AS hen
            FROM generation_jobs WHERE id = %(id)s
        )
        UPDATE generation_jobs g
           SET status = CASE WHEN q.hen THEN 'PENDING' ELSE 'FAILED' END::job_status,
               run_after = CASE WHEN q.hen
                 THEN now() + make_interval(secs => LEAST(%(tran)s, %(co_so)s * power(2, g.attempts)) * %(he_so)s)
                 END,
               started_at = CASE WHEN q.hen THEN NULL ELSE g.started_at END,
               completed_at = CASE WHEN q.hen THEN NULL ELSE now() END,
               stage = NULL, error = %(loi)s, failure_kind = %(loai)s, attempts = g.attempts + 1
          FROM q
         WHERE g.id = %(id)s
        RETURNING g.status
        """,
        {
            "id": job_id,
            "thu_lai": thu_lai,
            "max": MAX_LAN_THU,
            "tran": BACKOFF_TOI_DA_GIAY,
            "co_so": BACKOFF_CO_SO_GIAY,
            "he_so": he_so,
            "loi": str(exc)[:DO_DAI_LOI_TOI_DA],
            "loai": loai,
        },
    )
    dong = cur.fetchone() if hasattr(cur, "fetchone") else None
    trang_thai = dong.get("status") if isinstance(dong, dict) else (dong[0] if dong else None)
    return trang_thai == "PENDING"
