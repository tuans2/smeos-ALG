"""Expander Router & Registry — chọn `ImageExpander` theo tên (`AIC-13`,
nợ #78, 17/09), cùng khuôn với `providers/enhancement/router.py` của M04a.

Tên đến từ NGOÀI (`payload.get("expand_provider")` ở
`jobs/variant_worker.py`), tra trong `EXPANDER_REGISTRY`, không import
trực tiếp một lớp cụ thể vào `jobs/`.

`DEFAULT_EXPANDER = "pad"`: KHÔNG tự động gọi Replicate khi job không yêu
cầu rõ ràng — sinh nội dung mới ở biên tốn tiền thật (khi có token) và đổi
hành vi mặc định mà không ai yêu cầu là đúng thứ nợ #80 vừa chỉ ra là nguy
hiểm (âm thầm tốn tiền, không ai kiểm soát được).
"""

from __future__ import annotations

from media_ai.providers.base import ImageExpander
from media_ai.providers.expansion.fal_outpainter import FalAIOutpainter
from media_ai.providers.expansion.iopaint_outpainter import IOPaintExpander
from media_ai.providers.expansion.pad_expander import PadExpander
from media_ai.providers.expansion.replicate_outpainter import ReplicateOutpainter

DEFAULT_EXPANDER = "pad"

EXPANDER_REGISTRY: dict[str, type] = {
    "pad": PadExpander,
    "replicate_bria_expand_image": ReplicateOutpainter,
    # Mức 2 tự host (nợ #104, tiếp #78) — dừng làm đường thử tiếp theo
    # 18/09 sau ma sát hạ tầng thật (xem TECHNICAL_DEBT.md), NHƯNG giữ
    # nguyên ở đây, không xoá — bật lại bất kỳ lúc nào khi có VPS GPU thật.
    # `IOPAINT_URL` để trống thì tự lùi về PadExpander bên trong, giống hệt
    # ReplicateOutpainter thiếu token; không cần kiểm tồn tại biến môi
    # trường ở đây.
    "iopaint": IOPaintExpander,
    # Đường API-trước mới, 18/09 (nợ #105, tiếp #78/#104) — `fal-ai/bria/expand`
    # qua fal.ai, cùng model Bria với `replicate_bria_expand_image` nhưng
    # khác hạ tầng chạy. `FAL_KEY` để trống thì tự lùi về PadExpander, cùng
    # nguyên tắc hai provider trên.
    "fal_bria_expand": FalAIOutpainter,
}


def resolve_expander(ten: str | None) -> ImageExpander:
    """Trả về instance MỚI cho mỗi lượt gọi — không giữ instance dùng
    chung giữa các job, để `muc_dung_lan_cuoi` không bao giờ lẫn giữa hai
    job khác nhau (cùng bài học nợ #71)."""
    lop = EXPANDER_REGISTRY.get((ten or DEFAULT_EXPANDER).strip().lower(), EXPANDER_REGISTRY[DEFAULT_EXPANDER])
    return lop()
