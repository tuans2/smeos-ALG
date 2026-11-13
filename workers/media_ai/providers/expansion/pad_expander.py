"""`PadExpander` — mở khung theo kiểu ĐỆM MÀU ĐẶC (không sinh pixel mới),
dùng làm mặc định (`DEFAULT_EXPANDER` ở `router.py`) và làm nơi LÙI VỀ an
toàn khi bất kỳ bộ máy sinh-nội-dung nào (vd. `ReplicateOutpainter`) lỗi.

Không có gì để "chi phí thật" ở đây — cục bộ 100%, không gọi nhà cung cấp
nào — nên lớp này KHÔNG đặt `muc_dung_lan_cuoi`; `so_do_chi_phi_luot()`
(`providers/chung.py`) đọc `getattr(provider, "muc_dung_lan_cuoi", None)`
và tự trả dict rỗng cho lớp không có thuộc tính này, giữ đúng nguyên tắc
"không đo được khác 0" của cả pipeline (nợ #71/#78).
"""

from __future__ import annotations

from io import BytesIO

from PIL import Image

from media_ai.image.ratio_frame import dong_khung
from media_ai.providers.base import KetQuaMoRong

NAME = "pad"


class PadExpander:
    """Mặc định và lưới an toàn: đóng khung bằng đệm màu đặc/alpha, không
    gọi mạng, không tốn tiền, không bao giờ lỗi vì lý do mạng/schema."""

    name = NAME
    model_version = "pad-v1"

    def expand(
        self, image: bytes, ratio: str, product_mask: bytes | None = None
    ) -> KetQuaMoRong:
        # `product_mask` (nợ #104, tham số mới của ImageExpander) bị BỎ QUA
        # có chủ đích — Pad không sinh nội dung mới, không có gì để bảo vệ.
        anh = Image.open(BytesIO(image))
        anh.load()
        da_dong_khung = dong_khung(anh, ratio)

        buf = BytesIO()
        da_dong_khung.save(buf, format="PNG")

        return KetQuaMoRong(
            image=buf.getvalue(),
            generated_flags={"generative_fill_used": False, "requires_reshoot_warning": False},
            parameters={"ratio": ratio, "method": "pad"},
        )
