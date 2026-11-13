from vision.providers.local_cv import (
    CONFIDENCE_KHONG_CO_DANH_MUC,
    TEN_CHUA_XAC_DINH,
    LocalCvProvider,
    _nhom_theo_nhan,
    lap_rap,
)


class _MatNaGia:
    def __init__(self, dien_tich=0.1):
        self._dt = dien_tich

    @property
    def bbox(self):
        return (0.0, 0.0, 1.0, 1.0)

    @property
    def dien_tich(self):
        return self._dt


class _TachGia:
    def __init__(self, so_thuc_the):
        self._n = so_thuc_the

    def tach(self, image):
        return [_MatNaGia() for _ in range(self._n)]


class _GoiTenGia:
    def __init__(self, nhan_lan_luot):
        self._nhan = list(nhan_lan_luot)
        self.calls = 0

    def goi_ten(self, image, mat_na):
        nhan = self._nhan[self.calls % len(self._nhan)]
        self.calls += 1
        return nhan


class TestNhomTheoNhan:
    def test_xep_dung_bon_khoang(self):
        assert _nhom_theo_nhan("yellow tulip") == "flowers"
        assert _nhom_theo_nhan("eucalyptus leaf") == "foliage"
        assert _nhom_theo_nhan("kraft paper wrapping") == "wrapping"
        assert _nhom_theo_nhan("champagne ribbon") == "accessories"

    def test_khong_biet_thi_xep_vao_hoa(self):
        """Hoa là khoang đông nhất; xếp nhầm ở đó người soát sửa một lần bấm."""
        assert _nhom_theo_nhan("something odd") == "flowers"


class TestLapRap:
    def test_du_hinh_dang_hop_dong(self):
        kq = lap_rap({("flowers", "tulip"): (12, 80)})
        for khoa in ("palette_accounting", "checklist", "identity", "bom", "confidence", "san_xuat"):
            assert khoa in kq
        assert set(kq["bom"]) == {"flowers", "foliage", "accessories", "wrapping", "materials_note"}
        assert len(kq["checklist"]) == 10

    def test_khop_duoc_alias_trong_danh_muc_thi_gan_ma(self):
        """09/11: `_dong_hoa` giờ so CHỮ với `species_catalog.json` — "tulip"
        khớp đúng một loài (`LH036`) nên được gán mã, tên đổi sang tên chuẩn
        tiếng Việt, nhãn gốc dồn về `dau_hieu_nhan_dang`."""
        kq = lap_rap({("flowers", "tulip"): (12, 95)})
        dong = kq["bom"]["flowers"][0]
        assert dong["ma"] == "LH036"
        assert dong["name"] == "Tulip"
        assert dong["dau_hieu_nhan_dang"] == "tulip"

    def test_khop_duoc_thi_dau_hieu_nhan_dang_van_la_nhan_tho_khong_phai_ten_chuan(self):
        """`dau_hieu_nhan_dang` luôn là nhãn GỐC của mô hình (bằng chứng),
        không phải tên chuẩn đã tra — hai trường khác nhau dù có khớp."""
        kq = lap_rap({("flowers", "TULIPS"): (1, 90)})
        dong = kq["bom"]["flowers"][0]
        assert dong["dau_hieu_nhan_dang"] == "TULIPS"
        assert dong["name"] != dong["dau_hieu_nhan_dang"]

    def test_khong_khop_duoc_thi_ma_null_va_ten_la_hang_so_tieng_viet(self):
        """09/11 lần hai: nhãn không trùng alias nào trong danh mục thì `ma`
        vẫn `null` như cũ (không phải bộ phân loại thị giác nên không đoán
        bừa), nhưng `name` hiển thị đổi từ nguyên câu tiếng Anh sang hằng số
        tiếng Việt `TEN_CHUA_XAC_DINH` — chủ sản phẩm yêu cầu kết quả hiển
        thị tiếng Việt. Nhãn gốc tiếng Anh KHÔNG mất, vẫn còn nguyên ở
        `dau_hieu_nhan_dang` (trước bản này chỉ giữ khi CÓ khớp)."""
        kq = lap_rap({("flowers", "a white sheet on a bed"): (1, 95)})
        dong = kq["bom"]["flowers"][0]
        assert dong["ma"] is None
        assert dong["name"] == TEN_CHUA_XAC_DINH
        assert dong["dau_hieu_nhan_dang"] == "a white sheet on a bed"

    def test_la_khong_khop_duoc_cung_hanh_vi_nhu_hoa(self):
        kq = lap_rap({("foliage", "a bare tree branch on a table"): (1, 95)})
        dong = kq["bom"]["foliage"][0]
        assert dong["ma"] is None
        assert dong["name"] == TEN_CHUA_XAC_DINH
        assert dong["dau_hieu_nhan_dang"] == "a bare tree branch on a table"

    def test_ha_confidence_xuong_duoi_nguong_low_confidence(self):
        """Ngưỡng `LOW_CONFIDENCE` của worker là 70 — mọi lượt chạy bằng bộ
        cục bộ phải vào hàng chờ duyệt có cảnh báo."""
        kq = lap_rap({("flowers", "tulip"): (12, 99)})
        assert kq["bom"]["flowers"][0]["confidence"] <= CONFIDENCE_KHONG_CO_DANH_MUC
        assert kq["confidence"] < 70

    def test_la_khong_co_so_luong_dung_quy_uoc_dem_4(self):
        kq = lap_rap({("foliage", "eucalyptus"): (7, 80)})
        assert kq["bom"]["foliage"][0]["quantity"] is None
        assert kq["flower_count"] is None

    def test_ba_tong_dem_cong_tu_bom_nhu_moi_bo_may_khac(self):
        kq = lap_rap({("flowers", "tulip"): (12, 80), ("flowers", "rose"): (3, 80)})
        assert kq["flower_count"] == 15

    def test_checklist_noi_dung_thu_may_tach_duoc_that(self):
        kq = lap_rap({("flowers", "tulip"): (1, 80), ("wrapping", "kraft paper"): (2, 70)})
        assert kq["checklist"]["hoa_chu_dao"] == "Có"
        assert kq["checklist"]["vat_lieu_goi"] == "Có"
        assert kq["checklist"]["la_nen"] == "Không có"

    def test_khong_tach_duoc_gi_van_tra_hop_dong_hop_le(self):
        kq = lap_rap({})
        assert kq["bom"]["flowers"] == []
        assert kq["flower_count"] is None


class TestLocalCvProvider:
    def test_gom_cung_nhan_thanh_mot_dong_va_cong_so_luong(self):
        provider = LocalCvProvider(_TachGia(5), _GoiTenGia([("tulip", 80)]))
        kq = provider.analyze(b"anh", {})
        assert len(kq["bom"]["flowers"]) == 1
        assert kq["bom"]["flowers"][0]["quantity"] == 5

    def test_lay_do_chac_THAP_NHAT_cua_nhom_khong_phai_trung_binh(self):
        provider = LocalCvProvider(_TachGia(3), _GoiTenGia([("tulip", 90), ("tulip", 20), ("tulip", 90)]))
        kq = provider.analyze(b"anh", {})
        assert kq["bom"]["flowers"][0]["confidence"] == 20

    def test_bo_qua_nhan_rong(self):
        provider = LocalCvProvider(_TachGia(2), _GoiTenGia([("", 80), ("  ", 80)]))
        kq = provider.analyze(b"anh", {})
        assert kq["bom"]["flowers"] == []

    def test_tach_nhan_khac_nhau_thanh_cac_dong_rieng(self):
        provider = LocalCvProvider(_TachGia(4), _GoiTenGia([("tulip", 80), ("rose", 70)]))
        kq = provider.analyze(b"anh", {})
        assert len(kq["bom"]["flowers"]) == 2
        assert kq["flower_count"] == 4
