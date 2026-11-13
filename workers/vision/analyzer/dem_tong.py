"""Ba tổng đếm của một sản phẩm, suy từ `bom` theo `QUY_UOC_DEM.md`.

Bộ ảnh vàng chấm điểm trên `flower_count` (`BO_ANH_VANG.md` mục 9) nhưng hợp
đồng Vision khai số lượng theo từng dòng `bom`, không có tổng. Không có tổng
thì máy và thước đo không chia sẻ trường nào để so, và không phép đo nào
chạy được.

Ba tổng này KHÔNG hỏi mô hình. Chúng cộng từ chính những con số mô hình đã
khai, ngay sau khi nhận đáp ứng. Lý do: hỏi mô hình một con số suy được từ
các con số khác nó vừa trả là mở đường cho hai giá trị bất đồng trong cùng
một bản ghi, và khi đó không ai biết bên nào đúng.

Đơn vị là ĐƠN VỊ ĐẾM CỦA TỪNG LOÀI (`dvt_dem`), không quy về một đơn vị
chung. Quy ước đếm 3 tính hoa chùm theo cành, và cột `ĐVT đếm` của danh mục
đã mang đúng nghĩa đó cho từng loài — `Cành` cho baby, cẩm chướng chùm, cúc
chùm; `Bông` cho loài một bông một cành. Cộng thẳng vì vậy là cộng đúng thứ
quy ước muốn đếm.

Tệp thuần: không đọc đĩa, không gọi mạng, không import phần còn lại của
`vision/`.
"""

from __future__ import annotations

from typing import Any


def _so_nguyen(value: Any) -> int | None:
    """`True` là `int` trong Python — loại bool ra, nếu không một trường khai
    nhầm kiểu sẽ lặng lẽ cộng thành 1."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    return None


def _cong(rows: list[dict], khoa: str) -> int | None:
    """Cộng một trường qua các dòng. Trả `None` khi KHÔNG dòng nào khai được
    số — khác hẳn với `0`, vốn nghĩa là đã nhìn và không thấy gì. Bộ chấm
    điểm phải phân biệt được hai thứ đó, nếu không thì mọi ảnh mô hình bó tay
    sẽ vào sổ như một ảnh đếm được 0 và kéo sai số xuống một cách giả tạo.
    """
    co_so = False
    tong = 0
    for row in rows:
        gia_tri = _so_nguyen(row.get(khoa))
        if gia_tri is None:
            continue
        co_so = True
        tong += gia_tri
    return tong if co_so else None


def _danh_sach(bom: Any, khoa: str) -> list[dict]:
    if not isinstance(bom, dict):
        return []
    rows = bom.get(khoa)
    if not isinstance(rows, list):
        return []
    return [r for r in rows if isinstance(r, dict)]


def dem_tong(ket_qua: Any) -> dict[str, int | None]:
    """Ba tổng theo `QUY_UOC_DEM.md`:

    `flower_count`  tổng `quantity` của `bom.flowers` — số đơn vị hoa nhìn
                    thấy trong ảnh, theo đơn vị đếm của từng loài. Không gồm
                    nụ (quy ước 1) và không gồm lá (quy ước 4).
    `bud_count`     tổng `so_nu`, đếm riêng, không cộng vào `flower_count`.
    `damaged_count` tổng `so_hong`, ĐÃ NẰM TRONG `flower_count` (quy ước 6).

    `order_count` không có ở đây và sẽ không bao giờ có: nó là số trên đơn
    hàng, thứ máy không nhìn thấy trong ảnh. Nó vào bản ghi từ dữ liệu đơn,
    và `BO_ANH_VANG.md` mục 6 loại nó khỏi phép chấm điểm vì đúng lý do đó.
    """
    bom = ket_qua.get("bom") if isinstance(ket_qua, dict) else None
    flowers = _danh_sach(bom, "flowers")
    return {
        "flower_count": _cong(flowers, "quantity"),
        "bud_count": _cong(flowers, "so_nu"),
        "damaged_count": _cong(flowers, "so_hong"),
    }
