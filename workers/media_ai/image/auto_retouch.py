"""Cân bằng sáng/tương phản tự động — AIC-14, CHỈ tác động vùng nền.

Chốt 18/09 (AskUserQuestion): "Chỉ chỉnh phông nền" — không chạm pixel bó
hoa. `tu_dong_can_bang_sang()` là một hàm THUẦN (không đọc job, không import
Postgres) áp `ImageOps.autocontrast` lên TOÀN khung được đưa vào — việc giữ
chủ thể nguyên vẹn KHÔNG phải việc của hàm này, mà là của người gọi
(`variant_worker._ap_dung_auto_enhance`): dán lại nguyên khối chủ thể gốc
(chưa qua hàm này) lên trên kết quả, cùng nguyên tắc belt-and-suspenders với
`_dan_lai_chu_the` (AIC-13). Tách bạch được nhờ đúng THỨ TỰ gọi ở nơi dùng,
không nhờ hàm này "cẩn thận" — cùng triết lý với mọi hàm thuần khác trong
`media_ai.image` (`defringe.py`, `ratio_frame.py`).
"""

from __future__ import annotations

from PIL import Image, ImageOps


def tu_dong_can_bang_sang(anh: Image.Image, cutoff: float = 1.0) -> Image.Image:
    """Tự động kéo dải tương phản (histogram stretch kiểu `autocontrast`),
    cắt `cutoff`% điểm ảnh ở mỗi đầu biểu đồ sáng trước khi kéo dải — không
    để vài điểm ảnh ngoại lai (vd một góc phản quang) kéo lệch cả khung.

    Hoạt động trên RGB; ảnh có kênh alpha bị tách alpha ra trước khi xử lý,
    rồi ghép LẠI ĐÚNG kênh alpha gốc sau đó (không tính lại) — hàm này chỉ
    đổi độ sáng/tương phản màu, không đổi hình dạng vùng trong suốt.
    """
    if not (0 <= cutoff < 50):
        raise ValueError("cutoff phải trong [0, 50)")

    co_alpha = anh.mode == "RGBA"
    kenh_alpha = anh.split()[3] if co_alpha else None

    ket_qua = ImageOps.autocontrast(anh.convert("RGB"), cutoff=cutoff)

    if co_alpha:
        ket_qua = ket_qua.convert("RGBA")
        ket_qua.putalpha(kenh_alpha)
    return ket_qua
