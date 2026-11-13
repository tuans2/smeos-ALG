"""Test cho `shared/log_json.py` + `shared/job_trace.py` — log worker cùng trường với web."""

from __future__ import annotations

import json
import logging

import pytest

from shared.job_trace import log_job_claimed
from shared.log_json import JsonFormatter, xoa_ngu_canh_job


@pytest.fixture
def dong_log():
    lines: list[str] = []

    class Thu(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            lines.append(JsonFormatter().format(record))

    root = logging.getLogger()
    handler, cu = Thu(), root.level
    root.addHandler(handler)
    root.setLevel(logging.INFO)
    yield lambda: [json.loads(x) for x in lines]
    root.removeHandler(handler)
    root.setLevel(cu)
    xoa_ngu_canh_job()


def test_nhan_job_mang_request_id_va_ngu_canh_cho_dong_sau(dong_log):
    log_job_claimed(
        {
            "id": "job-1",
            "request_id": "req-12345678",
            "organization_id": "org-1",
            "feature": "vision.analyze",
            "payload": {"so_dien_thoai": "0900000000"},
        }
    )
    logging.getLogger("vision.worker").warning("gọi nhà cung cấp chậm")

    claimed, sau = dong_log()
    assert claimed["event"] == "job.claimed"
    assert claimed["requestId"] == "req-12345678"
    assert claimed["jobId"] == "job-1"
    assert "payload" not in claimed
    assert sau == {**sau, "level": "warn", "event": "vision.worker", "requestId": "req-12345678", "jobId": "job-1"}


def test_job_khong_co_request_id_thi_bo_truong(dong_log):
    log_job_claimed({"id": "job-2", "request_id": None, "feature": "media.optimize"})
    assert "requestId" not in dong_log()[0]


def test_loc_khoa_nhay_cam_trong_extra(dong_log):
    logging.getLogger("media").info("gửi", extra={"recipientPhone": "0900000000", "attempt": 2})
    dong = dong_log()[0]
    assert "recipientPhone" not in dong
    assert dong["attempt"] == 2
