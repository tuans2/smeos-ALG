"""Test cho phần EXTEND (E6) của tu_dien.py — chỉ phần thuần (TU_DIEN,
BANG, dinh_nghia, chu_thich), KHÔNG kiểm phần CLI phụ thuộc openpyxl/so_sach
(đã loại khỏi bản EXTEND này, xem docstring đầu file tu_dien.py).
"""

from vision.analyzer.tu_dien import BANG, TU_DIEN, chu_thich, dinh_nghia


def test_bang_khong_rong():
    b = BANG()
    assert len(b) == len(TU_DIEN)
    assert len(b) > 0


def test_bang_khoa_da_chuan_hoa():
    b = BANG()
    for k in b:
        assert k == k.strip().lower()


def test_dinh_nghia_tra_none_voi_cot_khong_ton_tai():
    assert dinh_nghia("cot-khong-ton-tai-xyz") is None


def test_dinh_nghia_tim_thay_khai_niem_that():
    # lấy khái niệm đầu tiên trong TU_DIEN để xác nhận tra cứu đúng
    ten_cot_dau = TU_DIEN[0][0]
    ket_qua = dinh_nghia(ten_cot_dau)
    assert ket_qua is not None
    assert ket_qua[0] == ten_cot_dau


def test_dong_nghia_anh_xa_ve_dung_khai_niem():
    # "số lượng" ánh xạ sang "định mức chốt" qua DONG_NGHIA
    ket_qua = dinh_nghia("số lượng")
    assert ket_qua is not None


def test_chu_thich_tra_none_khi_khong_co_khai_niem():
    assert chu_thich("cot-khong-ton-tai-xyz") is None


def test_chu_thich_co_du_cac_phan():
    ten_cot_dau = TU_DIEN[0][0]
    ghi_chu = chu_thich(ten_cot_dau)
    assert ghi_chu is not None
    assert "Đơn vị:" in ghi_chu
    assert "Cách xác định:" in ghi_chu
    assert "SỬA Ở:" in ghi_chu
