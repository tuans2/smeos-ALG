"""`VisionIdentityVerifier` — hiện thực cổng `IdentityVerifier` bằng chính
Vision Analysis của M01 (M04 mục 6: *"Dùng lại Vision Analysis của module M01
làm nền cho fingerprint — chỉ qua provider đã đăng ký trong registry của
M01"*).

Đây là nơi thực thi `YC-N4` / ràng buộc V1.2 của M04:

    Identity Guard phải dùng CÙNG MỘT provider và CÙNG MỘT model version cho
    cả hai lần phân tích của một job.

Vì sao ràng buộc đó là thật chứ không phải hình thức: điểm so sánh trước/sau
chỉ có nghĩa khi hai lượt đọc ảnh bằng cùng một thước. Hai model khác nhau
đọc cùng một tấm ảnh vẫn cho khác nhau đôi chút, và cái khác đó sẽ bị Guard
tính thành "AI đã làm sai lệch sản phẩm" — cổng an toàn báo động vì chính bộ
đo của nó, không phải vì ảnh.

`compare()` giữ ĐÚNG một instance provider cho cả hai lượt, nên không có
đường nào lọt hai model khác nhau. Ngoài ra nó còn ghi lại provider và
model_version đã dùng để phía TS ghi vào metadata asset (V2 mục 8).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from media_ai.guard.compare import so_sanh


class ViPhamRangBuocProvider(RuntimeError):
    """Ném khi hai lượt phân tích của một job không cùng provider/model —
    lỗi lập trình, không phải phán quyết. Hỏng to và hỏng sớm còn hơn cho ra
    một điểm số vô nghĩa mà trông vẫn hợp lệ."""


@dataclass
class VisionIdentityVerifier:
    """`analyzer` là một `VisionAnalyzer` của M01 (`vision/providers/base.py`).

    Nhận nguyên đối tượng provider, không nhận hai `dict` kết quả rời — chính
    vì thế mà `YC-N4` được bảo đảm bằng CẤU TRÚC chứ không bằng kỷ luật của
    người viết mã sau này.
    """

    analyzer: Any

    @property
    def provider_name(self) -> str:
        return getattr(self.analyzer, "name", "khong-ro")

    @property
    def model_version(self) -> str:
        return getattr(self.analyzer, "model_version", "khong-ro")

    def phan_tich(self, image: bytes, context: dict) -> dict:
        """Một lượt phân tích. Tách ra để pipeline gọi được lượt "trước" mà
        vẫn đi qua đúng instance provider này."""
        return self.analyzer.analyze(image, context)

    def compare(
        self,
        original_fingerprint: dict,
        enhanced_image: bytes,
        context: dict | None = None,
    ) -> dict:
        """Phân tích lại ảnh SAU tăng cường rồi so với dấu vân TRƯỚC.

        `original_fingerprint` phải là kết quả của `self.phan_tich(...)` trên
        chính ảnh gốc trong CÙNG job — nếu nó đến từ một lượt phân tích cũ
        (ví dụ dòng `product_analyses` do M01 ghi từ tháng trước), provider có
        thể đã khác và điểm so sánh mất nghĩa. Người gọi bảo đảm điều đó;
        `jobs/worker.py` làm đúng vậy — nó luôn chạy lượt "trước" ngay trong
        cùng job.
        """
        phan_tich_sau = self.phan_tich(enhanced_image, context or {})
        ket_qua = so_sanh(original_fingerprint, phan_tich_sau)

        khoi = ket_qua.to_dict()
        # Ghi lại thước đo đã dùng — để phía TS lưu vào metadata asset và để
        # sau này còn đối chiếu được điểm số của hai lượt chạy khác thời điểm.
        khoi["provider"] = self.provider_name
        khoi["model_version"] = self.model_version
        return khoi
