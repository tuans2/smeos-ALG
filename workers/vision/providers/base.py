"""Cổng Vision phía Python — bản song song với `src/core/ports/vision-analyzer.ts`
(quyết định D5-c, kiến trúc V2 mục 17.1).

TS và Python KHÔNG gọi cổng này lẫn nhau qua HTTP — ranh giới D6-1 chỉ là
bảng `generation_jobs` (V2 mục 3.1). Cổng này tồn tại ở phía Python vì
chính worker (`workers/vision/jobs/worker.py`) là nơi thật sự gọi provider,
không phải TS.

`analyze()` trả một `dict` đúng hình dạng `PhanTichSanPhamHoa`
(`workers/vision/contracts/Schema.json`) — không khai lại hình dạng đó bằng
kiểu Python ở đây, cùng lý do cổng TS giữ `ProductAnalysis` là kiểu mở.
"""

from __future__ import annotations

from typing import Protocol, TypedDict


class VisionAnalysisContext(TypedDict, total=False):
    organization_id: str
    product_id: str | None
    asset_id: str


class VisionAnalyzer(Protocol):
    name: str
    model_version: str

    def analyze(self, image: bytes, context: VisionAnalysisContext) -> dict:
        """Trả `ProductAnalysis` đúng `Schema.json`. Không gọi trực tiếp ở
        module nào khác ngoài `jobs/worker.py` — mọi provider đứng sau cổng
        này (quy tắc bất di bất dịch #2, `M01_FLORAOS_VISION_CODING_AGENT_GUIDE.md`).
        """
        ...
