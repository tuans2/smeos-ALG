"""Log JSON cho worker — cùng trường với `src/core/observability/log.ts` (ROADMAP E1.3).

Mỗi bản ghi `logging` thành một dòng JSON ra stdout: `ts`, `level`, `event`
(tên logger), `message`, và ngữ cảnh job đang chạy (`requestId`, `jobId`,
`organizationId`, `feature`) do `gan_ngu_canh_job()` đặt lúc nhận job. Khoá
nhạy cảm bị lọc như phía web. Không thêm phụ thuộc (D19).
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Mapping

_KHOA_CAM = re.compile(r"phone|so_dien_thoai|address|dia_chi|password|secret|cookie|authorization|token|api_?key", re.I)
_ngu_canh: ContextVar[dict[str, Any]] = ContextVar("alg_job_log_context", default={})

# Thuộc tính có sẵn của LogRecord — không chép vào dòng JSON.
_THUOC_TINH_GOC = set(vars(logging.makeLogRecord({}))) | {"message", "asctime"}
_sentry_bat = False


def loc_su_kien_sentry(event: dict[str, Any], _hint: Any = None) -> dict[str, Any]:
    """Bỏ mọi thứ có thể chứa dữ liệu khách trước khi gửi: request, user, breadcrumb, extra, biến cục bộ."""
    for khoa in ("request", "user", "breadcrumbs", "extra"):
        event.pop(khoa, None)
    for ngoai_le in (event.get("exception") or {}).get("values") or []:
        for khung in (ngoai_le.get("stacktrace") or {}).get("frames") or []:
            khung.pop("vars", None)
    return event


def bat_sentry() -> bool:
    """Bật Sentry khi có `SENTRY_DSN` (E1.5). Log `error`/`exception` thành sự kiện lỗi; không đo hiệu năng."""
    global _sentry_bat
    dsn = os.environ.get("SENTRY_DSN")
    if not dsn:
        return False
    import sentry_sdk

    sentry_sdk.init(
        dsn=dsn,
        environment=os.environ.get("SENTRY_ENVIRONMENT", "production"),
        release=os.environ.get("RENDER_GIT_COMMIT"),
        send_default_pii=False,
        include_local_variables=False,
        max_breadcrumbs=0,
        traces_sample_rate=0,
        before_send=loc_su_kien_sentry,
    )
    _sentry_bat = True
    return True


def gan_ngu_canh_job(job: Mapping[str, Any]) -> None:
    """Đặt ngữ cảnh cho mọi dòng log sau đó trong job này (và tag lỗi gửi Sentry nếu bật)."""
    _ngu_canh.set(
        {
            k: v
            for k, v in {
                "requestId": job.get("request_id"),
                "jobId": str(job["id"]) if job.get("id") is not None else None,
                "organizationId": job.get("organization_id"),
                "feature": job.get("feature"),
            }.items()
            if v is not None
        }
    )
    _gan_tag_sentry(_ngu_canh.get())


def xoa_ngu_canh_job() -> None:
    _ngu_canh.set({})
    _gan_tag_sentry({"requestId": None, "jobId": None, "organizationId": None, "feature": None})


def _gan_tag_sentry(tags: Mapping[str, Any]) -> None:
    if not _sentry_bat:
        return
    import sentry_sdk

    scope = sentry_sdk.get_isolation_scope()
    for k, v in tags.items():
        if v is None:
            scope.remove_tag(k)
        else:
            scope.set_tag(k, str(v))


def _loc(ctx: Mapping[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in ctx.items() if v is not None and not _KHOA_CAM.search(k)}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        dong: dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created, timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "level": record.levelname.lower().replace("warning", "warn").replace("critical", "error"),
            "event": record.name,
            "message": record.getMessage(),
            **_ngu_canh.get(),
        }
        dong.update(_loc({k: v for k, v in vars(record).items() if k not in _THUOC_TINH_GOC}))
        if record.exc_info:
            dong["error"] = self.formatException(record.exc_info)
        return json.dumps(dong, ensure_ascii=False, default=str)


def cau_hinh_log() -> None:
    """Gọi một lần ở điểm khởi động worker."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(os.environ.get("LOG_LEVEL", "INFO"))
    bat_sentry()
