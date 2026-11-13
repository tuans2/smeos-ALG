"""Test cho phần thuần (không phụ thuộc bộ ảnh vàng) của count_engine.py
(E5, thu hoạch từ FloraOS v1). Chỉ kiểm các hàm số học/logic thuần —
KHÔNG kiểm độ chính xác đếm thực tế trên ảnh thật, việc đó chờ bộ ảnh vàng
(BO_ANH_VANG.md) theo đúng quyết định đã báo cáo với anh Tony.
"""

from vision.analyzer.count_engine import chot, trung_vi


class TestTrungVi:
    def test_loc_gia_tri_khong_hop_le(self):
        # bỏ qua None, giá trị <= 0, giá trị không phải số
        assert trung_vi([5, 7, 9]) == 7.0
        assert trung_vi([5, None, 0, -1, 9]) == 7.0

    def test_rong_tra_none(self):
        assert trung_vi([]) is None
        assert trung_vi([None, 0, -3]) is None

    def test_mot_gia_tri(self):
        assert trung_vi([12]) == 12.0


class TestChot:
    def test_khong_kenh_nao_va_khong_chan(self):
        r = chot(None, None, None)
        assert r["so_luong"] is None
        assert r["cach_dem"] == "THẤT BẠI"
        assert r["do_tin_cay"] == 0

    def test_khong_kenh_nao_co_chan(self):
        r = chot(None, None, 20)
        assert r["cach_dem"] == "chỉ chặn trên"
        assert r["so_luong_min"] == 1
        assert r["so_luong_max"] == 20

    def test_mot_kenh_noi_25_phan_tram(self):
        r = chot(10, None, None)
        assert r["cach_dem"] == "một kênh, nới 25%"
        assert r["so_luong_min"] == 8   # round(10*0.75)
        assert r["so_luong_max"] == 12  # round(10*1.25) = round(12.5) -> 12 (Python bankers rounding)
        assert r["do_tin_cay"] == 45

    def test_hai_kenh_dong_thuan_ra_so_chinh_xac(self):
        # llm=10, dien_tich=11 -> lệch tương đối nhỏ, dưới ngưỡng mặc định
        r = chot(10, 11, None)
        assert r["cach_dem"] == "hai kênh đồng thuận"
        assert r["so_luong_min"] == r["so_luong_max"]
        assert r["do_tin_cay"] >= 60

    def test_hai_kenh_lech_xa_ra_khoang(self):
        r = chot(5, 20, None)
        assert r["cach_dem"] == "khoảng giữa hai kênh"
        assert r["so_luong_min"] == 5
        assert r["so_luong_max"] == 20
        assert r["do_tin_cay"] == 35

    def test_vuot_chan_tren_vat_ly_bi_bac(self):
        # llm vượt chặn trên gấp >= 4 lần thì bị loại khỏi kênh, chỉ còn dien_tich
        r = chot(100, 12, 20)
        assert any("VƯỢT CHẶN TRÊN" in c for c in r["canh_bao"])

    def test_ket_qua_tren_chan_van_bi_nen_xuong(self):
        # hai kênh đồng thuận nhưng nằm trên chặn trên vật lý -> nén xuống,
        # cảnh báo, tin cậy giảm về tối đa 40
        r = chot(30, 31, 20)
        assert r["so_luong_min"] <= 20
        assert any("TRÊN CHẶN VẬT LÝ" in c for c in r["canh_bao"])
        assert r["do_tin_cay"] <= 40
