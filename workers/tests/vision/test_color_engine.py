"""Test cho get_color_name_from_hex() (color_engine.py, E6, thu hoạch từ
FloraOS v1). Chỉ kiểm suy luận tên màu từ HEX — không kiểm extract_palette()
vì cần ảnh thật (chờ bộ ảnh vàng).
"""

from vision.analyzer.color_engine import get_color_name_from_hex


def test_do():
    assert get_color_name_from_hex("#FF0000") == "Đỏ"


def test_vang():
    assert get_color_name_from_hex("#FFFF00") == "Vàng"


def test_xanh_la():
    assert get_color_name_from_hex("#00FF00") == "Xanh lá"


def test_xanh_duong():
    assert get_color_name_from_hex("#0000FF") == "Xanh dương"


def test_trang():
    assert get_color_name_from_hex("#FFFFFF") == "Trắng"


def test_den():
    assert get_color_name_from_hex("#000000") == "Đen"


def test_xam():
    assert get_color_name_from_hex("#808080") == "Xám"


def test_khong_can_dau_thang():
    # chấp nhận cả có và không có dấu "#" ở đầu
    assert get_color_name_from_hex("FF0000") == "Đỏ"


def test_chuoi_loi_tra_ve_mau_khac():
    assert get_color_name_from_hex("khong-phai-hex") == "Màu khác"
