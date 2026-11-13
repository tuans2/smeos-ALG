"""Ngữ cảnh tổ chức cho Row Level Security ở worker (ADR-013 D-I3, checklist ALG 1.18).

Worker giữ một kết nối dài hạn: nhận job (đi qua mọi tổ chức) chạy quyền hệ thống; xử lý một job chạy trong
đúng tổ chức của dòng job (`job["organization_id"]` — luật 1 của worker). `DB_RLS_MODE` cùng nghĩa với web:
off = không đặt gì; audit/enforce = đặt `app.org_id`, `app.rls_system`, `app.rls_mode` cho phiên.
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Iterator

_SQL = (
    "SELECT set_config('app.org_id', %s, false), "
    "set_config('app.rls_system', %s, false), "
    "set_config('app.rls_mode', %s, false)"
)


def rls_mode() -> str:
    mode = os.environ.get("DB_RLS_MODE", "off")
    return mode if mode in ("off", "audit", "enforce") else "off"


def set_db_context(conn: Any, organization_id: str | None) -> None:
    """`organization_id` None = quyền hệ thống (nhận job, quét hàng đợi)."""
    mode = rls_mode()
    if mode == "off":
        return
    conn.execute(_SQL, (organization_id or "", "" if organization_id else "on", mode))


@contextmanager
def job_db_context(conn: Any, job: dict[str, Any]) -> Iterator[None]:
    """Xử lý một job trong tổ chức của job; xong (kể cả lỗi) trả kết nối về quyền hệ thống."""
    set_db_context(conn, str(job["organization_id"]))
    try:
        yield
    finally:
        set_db_context(conn, None)
