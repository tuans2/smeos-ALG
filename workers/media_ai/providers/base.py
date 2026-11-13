"""Cổng nhà cung cấp của M04a (M04 mục 6) — bản song song với
`workers/vision/providers/base.py` của M01.

Nguyên tắc giống hệt M01: không luật nghiệp vụ nào được phụ thuộc trực tiếp
vào một model cụ thể. Đổi từ model mã nguồn mở sang API thương mại rồi sang
model riêng của ALG chỉ được phép chạm vào `providers/`, không chạm pipeline.

Năm cổng theo đúng M04 mục 6. Bản này (P9 đợt một) mới hiện thực hai:
`ImageEnhancer` (bằng `PassthroughEnhancer`) và `IdentityVerifier` — ba cổng
còn lại khai ở đây để pipeline gọi đúng tên ngay từ đầu, hiện thực sau.
"""

from __future__ import annotations

from typing import Protocol, TypedDict


class KetQuaTangCuong(TypedDict, total=False):
    """Đầu ra của một lượt tăng cường ảnh.

    `generated_flags` KHÔNG có giá trị mặc định ngầm (`YC-A5`): provider phải
    khai rõ có dùng generative fill hay không. Một adapter quên khai sẽ bị
    `assets` từ chối ở phía TS chứ không âm thầm ghi `false`.
    """

    image: bytes
    generated_flags: dict
    parameters: dict
    variants: dict[str, bytes]


class ImageEnhancer(Protocol):
    name: str
    model_version: str

    def enhance(self, image: bytes, config: dict) -> KetQuaTangCuong: ...


class Segmenter(Protocol):
    """Tách sản phẩm khỏi nền. M04 mục 6 gợi ý tái dùng SAM2 của M01."""

    name: str
    model_version: str

    def segment(self, image: bytes) -> dict: ...


class BackgroundProcessor(Protocol):
    name: str
    model_version: str

    def process(self, image: bytes, mask: dict, config: dict) -> bytes: ...


class Upscaler(Protocol):
    name: str
    model_version: str

    def upscale(self, image: bytes, target_resolution: tuple[int, int]) -> bytes: ...


class IdentityVerifier(Protocol):
    """Cổng cứng. `compare` trả đúng khối `identity_guard` của đặc tả 06 mục 8.

    Ràng buộc V1.2 của M04 (`YC-N4`): hai lượt phân tích của MỘT job phải
    dùng cùng provider và cùng model version. Cổng này nhận nguyên
    `VisionAnalyzer` chứ không nhận hai `dict` rời, để chỗ hiện thực còn có
    thể tự bảo đảm ràng buộc đó — xem `media_ai/guard/verifier.py`.
    """

    def compare(self, original_fingerprint: dict, enhanced_image: bytes) -> dict: ...


class KetQuaMoRong(TypedDict, total=False):
    """Đầu ra của một lượt mở rộng khung ảnh (outpainting/expansion, AIC-13,
    nợ #78, 17/09).

    Cùng khuôn với `KetQuaTangCuong`: `generated_flags` không có giá trị mặc
    định ngầm — bộ máy mở rộng LUÔN sinh pixel mới ở phần biên (đó là chính
    việc nó làm), nhưng vẫn phải khai rõ trong từng lượt trả về chứ không
    suy ra từ tên provider.
    """

    image: bytes
    generated_flags: dict
    parameters: dict


class ImageExpander(Protocol):
    """Mở khung ảnh ra đúng tỷ lệ đích bằng nội dung sinh thêm ở biên
    (outpainting), thay vì chỉ đệm màu đặc như `dong_khung`
    (`media_ai/image/ratio_frame.py`).

    Nợ #78, 17/09: cổng có từ đợt này. Ba hiện thực: `PadExpander` (lùi
    thẳng về đóng khung cũ, không sinh gì mới — mặc định), `ReplicateOutpainter`
    (gọi `bria/expand-image` qua Replicate, Mức 1 quản lý) và `IOPaintExpander`
    (nợ #104, tiếp theo #78 — IOPaint tự host, Mức 2 trọng số mở, xem tài
    liệu "Tích hợp IOPaint Outpainting vào floraos-core"). Mọi lượt `expand`
    lỗi phải tự lùi về `PadExpander` — xem `providers/expansion/*.py` — không
    được ném lỗi lên job đang chạy.

    `product_mask` (nợ #104): tham số MỚI, tuỳ chọn, lùi về tương thích
    ngược — cùng khuôn `protectMask` đã đặc tả ở `ImageProvider.edit()`
    (`src/core/ports/image-provider.ts`, §6.2 `docs/dac-ta/10-ai-orchestration.md`):
    vùng KHÔNG được đổi vì đó là sản phẩm. `PadExpander`/`ReplicateOutpainter`
    bỏ qua tham số này (không sửa gì, hành vi giữ nguyên); `IOPaintExpander`
    là hiện thực đầu tiên thật sự dùng tới nó.
    """

    name: str
    model_version: str

    def expand(
        self, image: bytes, ratio: str, product_mask: bytes | None = None
    ) -> KetQuaMoRong: ...
