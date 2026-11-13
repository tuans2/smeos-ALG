"""Đoán mã danh mục loài từ nhãn tiếng Anh của Florence-2 bằng cách so khớp
CHỮ với `species_catalog.json` (trích xuất `01_NHAP-LIEU.xlsx` sheet "02 Danh
mục loại" ngày 2026-09-11 — xem khoá `nguon`/`ghi_chu` trong chính tệp đó).

## Đây KHÔNG phải bộ phân loại thị giác — nợ #56 CHƯA trả hết

Đây là một phỏng đoán rẻ tiền dựa trên đúng CHỮ Florence-2 nhả ra (ví dụ câu
"a bouquet of yellow tulips" khớp alias tiếng Anh "tulip" của loài `LH036`
trong danh mục) — không nhìn lại ảnh, không có mô hình thị giác nào so khớp
hình dạng/màu sắc thật. Khi Florence-2 mô tả sai hẳn chủ thể (ví dụ tả nhầm
ảnh hoa thành "a white sheet on a bed"), hàm này không sửa được điều đó và
vẫn trả `(None, None)`, đúng như hành vi cũ.

## Vì sao khớp phải RÕ RÀNG mới nhận

Nhiều alias trong danh mục là chữ ngắn, chung chung ("rossi", "tana") — nếu
khớp kiểu chứa chuỗi con thì dễ khớp nhầm vào một từ tình cờ trùng trong câu
Florence-2 không hề liên quan tới loài đó. Vì vậy:

1. Chỉ nhận alias THUẦN chữ La-tinh không dấu (đúng thứ Florence-2 nhả ra —
   caption của nó luôn là tiếng Anh).
2. So khớp theo TỪ/CỤM TRỌN VẸN (ranh giới từ), không phải chuỗi con bất kỳ.
3. Alias DÀI hơn xét trước và "chiếm" đúng đoạn ký tự nó khớp — một alias
   ngắn hơn của loài KHÁC rơi trọn trong đoạn đã bị chiếm thì bị bỏ qua
   (`"gerbera"` không được tính thêm khi câu đã khớp `"spider gerbera"`).
4. Sau khi loại các khớp bị "nuốt" ở bước 3, nếu vẫn còn từ HAI loài khác
   nhau trở lên cùng khớp một câu thì KHÔNG đoán — thà bỏ trắng còn hơn gắn
   nhầm một mã trông như thật, đúng tinh thần "Chốt với chủ sản phẩm 09/11:
   trả thật, không chặn" đã ghi trong `local_cv.py`.

Chưa dùng tới sheet "08 Cặp dễ nhầm" (`cap_de_nham` trong tệp danh mục) —
dữ liệu đó mô tả dấu hiệu THỊ GIÁC để tách hai loài, không giúp được gì cho
một bước chỉ đọc CHỮ như tệp này. Để dành cho lúc có bộ phân loại thị giác
thật.
"""

from __future__ import annotations

import re
from functools import lru_cache

from vision.providers.chung import nap_json

TEN_TAP_TIN = "species_catalog.json"

_MAU_ALIAS_HOP_LE = re.compile(r"^[A-Za-z][A-Za-z ]*$")


@lru_cache(maxsize=1)
def _bang_tra_cuu() -> tuple[tuple[re.Pattern[str], str, str], ...]:
    """`(mẫu regex ranh-giới-từ, mã loài, tên chuẩn)` — alias DÀI nhất trước.

    Nạp và biên dịch một lần, cache lại — bảng tra cứu không đổi trong vòng
    đời worker (đúng quy tắc #6: không nạp lại tài nguyên tĩnh mỗi job).
    """
    du_lieu = nap_json(TEN_TAP_TIN)
    muc: list[tuple[str, str, str]] = []
    for loai in du_lieu.get("loai", []):
        ma = loai.get("ma_loai")
        ten_chuan = loai.get("ten_chuan")
        if not ma or not ten_chuan:
            continue
        cac_alias = [ten_chuan, *loai.get("ten_khac", [])]
        for alias in cac_alias:
            alias = (alias or "").strip()
            if not alias or not _MAU_ALIAS_HOP_LE.match(alias):
                continue  # chỉ nhận alias thuần tiếng Anh — caption của Florence-2 là tiếng Anh
            muc.append((alias.lower(), ma, ten_chuan))
    muc.sort(key=lambda m: len(m[0]), reverse=True)
    # Caption của Florence-2 hầu như luôn ở số nhiều ("tulips", "roses") vì
    # SAM2 có thể gộp nhiều bông vào một mặt nạ. Cho phép hậu tố "s"/"es" sau
    # alias số ít — không đổi số ký tự đủ để phá luật ranh giới từ ở trên, chỉ
    # nới đúng phần đuôi. Số nhiều bất quy tắc (lily → lilies) không khớp
    # được bằng cách này — giới hạn đã biết, không phải lỗi.
    return tuple(
        (re.compile(r"\b" + re.escape(alias) + r"(?:es|s)?\b"), ma, ten_chuan) for alias, ma, ten_chuan in muc
    )


def doan_ma_loai(nhan: str) -> tuple[str | None, str | None]:
    """Trả `(ma_loai, ten_chuan)` nếu ĐÚNG MỘT loài khớp `nhan`, ngược lại `(None, None)`."""
    thap = nhan.lower()
    da_chiem: list[tuple[int, int]] = []
    khop: dict[str, tuple[str, str]] = {}
    for mau, ma, ten_chuan in _bang_tra_cuu():
        for m in mau.finditer(thap):
            bat_dau, ket_thuc = m.span()
            if any(bat_dau >= a and ket_thuc <= b for a, b in da_chiem):
                continue  # đã bị một alias DÀI HƠN của loài khác chiếm đúng đoạn này
            da_chiem.append((bat_dau, ket_thuc))
            khop[ma] = (ma, ten_chuan)
    if len(khop) != 1:
        return None, None
    return next(iter(khop.values()))
