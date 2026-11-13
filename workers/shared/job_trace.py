"""Nối log worker với log web bằng mã yêu cầu (ROADMAP E1.1).

Web ghi `generation_jobs.request_id` từ header `x-request-id`; khi nhận job,
worker đặt ngữ cảnh log (`shared/log_json.py`) rồi ghi sự kiện `job.claimed`
mang `requestId`, `jobId`, `organizationId`, `feature` — để lọc ngược từ một
lỗi web tới mọi dòng log worker của job đó. Không ghi payload hay dữ liệu khách.
"""

from __future__ import annotations

import logging
from typing import Any, Mapping

from shared.log_json import gan_ngu_canh_job

log = logging.getLogger("job.claimed")


def log_job_claimed(job: Mapping[str, Any]) -> None:
    gan_ngu_canh_job(job)
    log.info("nhận job")
