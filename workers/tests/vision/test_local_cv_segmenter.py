from vision.providers.local_cv_segmenter import (
    MatNaSam2,
    _bbox_xywh_chuan_hoa,
    _dien_tich_giao,
    _loc_chong_lap,
    _loc_va_chuan_hoa,
    _ty_le_b_nam_trong_a,
)


class TestBboxXywhChuanHoa:
    def test_chuan_hoa_dung_ty_le(self):
        # Ảnh rộng 1000 cao 2000 (px). Khung XYWH: gốc (100, 400), rộng 100 cao 200.
        assert _bbox_xywh_chuan_hoa((100, 400, 100, 200), rong=1000, cao=2000) == (
            0.1,
            0.2,
            0.2,
            0.3,
        )

    def test_anh_kich_thuoc_0_tra_khung_rong(self):
        assert _bbox_xywh_chuan_hoa((0, 0, 10, 10), rong=0, cao=0) == (0.0, 0.0, 0.0, 0.0)

    def test_khong_vuot_bien_0_1(self):
        assert _bbox_xywh_chuan_hoa((-50, -50, 2000, 2000), rong=1000, cao=1000) == (
            0.0,
            0.0,
            1.0,
            1.0,
        )

    def test_phai_khong_bao_gio_nho_hon_trai(self):
        # bw/bh âm bất thường (dữ liệu hỏng) vẫn không được đảo ngược khung.
        trai, tren, phai, duoi = _bbox_xywh_chuan_hoa((500, 500, -100, -100), rong=1000, cao=1000)
        assert phai >= trai
        assert duoi >= tren


class TestDienTichGiaoVaTyLeChua:
    def test_hai_khung_khong_cham_nhau_tra_0(self):
        assert _dien_tich_giao((0.0, 0.0, 0.2, 0.2), (0.5, 0.5, 0.7, 0.7)) == 0.0

    def test_khung_giao_dung_dien_tich(self):
        # Giao của (0,0,0.5,0.5) và (0.3,0.3,0.8,0.8) là (0.3,0.3,0.5,0.5) = 0.2*0.2.
        assert abs(_dien_tich_giao((0.0, 0.0, 0.5, 0.5), (0.3, 0.3, 0.8, 0.8)) - 0.04) < 1e-9

    def test_b_nam_tron_trong_a_tra_1(self):
        assert _ty_le_b_nam_trong_a((0.0, 0.0, 1.0, 1.0), (0.1, 0.1, 0.3, 0.3)) == 1.0

    def test_b_khong_cham_a_tra_0(self):
        assert _ty_le_b_nam_trong_a((0.0, 0.0, 0.2, 0.2), (0.5, 0.5, 0.7, 0.7)) == 0.0

    def test_b_dien_tich_0_tra_0_khong_chia_cho_khong(self):
        assert _ty_le_b_nam_trong_a((0.0, 0.0, 1.0, 1.0), (0.5, 0.5, 0.5, 0.5)) == 0.0


class TestLocChongLap:
    def test_bo_khung_bo_hoa_giu_tung_bong_con(self):
        # Nợ #60: bó hoa (khung gần hết ảnh) chứa trọn hai bông con nhỏ hơn nhiều.
        bo_hoa = MatNaSam2(bbox=(0.0, 0.0, 1.0, 1.0), dien_tich=0.9)
        bong_1 = MatNaSam2(bbox=(0.1, 0.1, 0.3, 0.3), dien_tich=0.04)
        bong_2 = MatNaSam2(bbox=(0.5, 0.5, 0.7, 0.7), dien_tich=0.04)
        kq = _loc_chong_lap(
            [bo_hoa, bong_1, bong_2], nguong_chua_toi_thieu=0.85, ty_le_lon_hon_toi_thieu=1.5
        )
        assert bo_hoa not in kq
        assert bong_1 in kq
        assert bong_2 in kq

    def test_hai_mat_na_ngang_co_chong_mot_phan_khong_bi_loc(self):
        # SAM2 tách đôi cùng vật thể ở biên mờ — không phải ca "chứa trọn",
        # cố tình không xử lý ở đây (xem docstring `_loc_chong_lap`).
        a = MatNaSam2(bbox=(0.0, 0.0, 0.5, 0.5), dien_tich=0.25)
        b = MatNaSam2(bbox=(0.3, 0.3, 0.8, 0.8), dien_tich=0.25)
        kq = _loc_chong_lap([a, b], nguong_chua_toi_thieu=0.85, ty_le_lon_hon_toi_thieu=1.5)
        assert len(kq) == 2

    def test_mat_na_lon_khong_du_lon_thi_khong_loc(self):
        lon_nhe = MatNaSam2(bbox=(0.0, 0.0, 1.0, 1.0), dien_tich=0.05)
        nho = MatNaSam2(bbox=(0.1, 0.1, 0.3, 0.3), dien_tich=0.04)
        kq = _loc_chong_lap([lon_nhe, nho], nguong_chua_toi_thieu=0.85, ty_le_lon_hon_toi_thieu=1.5)
        assert len(kq) == 2

    def test_khong_chua_du_nguong_thi_khong_loc(self):
        lon = MatNaSam2(bbox=(0.0, 0.0, 0.5, 0.5), dien_tich=0.9)
        # nho chi mot phan nho nam trong lon
        nho = MatNaSam2(bbox=(0.45, 0.45, 0.65, 0.65), dien_tich=0.04)
        kq = _loc_chong_lap([lon, nho], nguong_chua_toi_thieu=0.85, ty_le_lon_hon_toi_thieu=1.5)
        assert len(kq) == 2

    def test_danh_sach_mot_phan_tu_tra_nguyen(self):
        a = MatNaSam2(bbox=(0.0, 0.0, 0.5, 0.5), dien_tich=0.25)
        assert _loc_chong_lap([a], 0.85, 1.5) == [a]

    def test_danh_sach_rong_tra_rong(self):
        assert _loc_chong_lap([], 0.85, 1.5) == []


class TestLocVaChuanHoa:
    @staticmethod
    def _mat_na_gia(area, bbox, stability=0.99, segmentation=None):
        d = {"area": area, "bbox": bbox, "stability_score": stability}
        if segmentation is not None:
            d["segmentation"] = segmentation
        return d

    def test_bo_mat_na_qua_nho(self):
        tho = [self._mat_na_gia(area=1, bbox=(0, 0, 1, 1))]
        kq = _loc_va_chuan_hoa(
            tho,
            rong=1000,
            cao=1000,
            dien_tich_toi_thieu=0.01,
            on_dinh_toi_thieu=0.9,
            so_luong_toi_da=10,
        )
        assert kq == []

    def test_bo_mat_na_khong_on_dinh(self):
        tho = [self._mat_na_gia(area=500_000, bbox=(0, 0, 900, 900), stability=0.5)]
        kq = _loc_va_chuan_hoa(
            tho,
            rong=1000,
            cao=1000,
            dien_tich_toi_thieu=0.01,
            on_dinh_toi_thieu=0.9,
            so_luong_toi_da=10,
        )
        assert kq == []

    def test_giu_mat_na_dat_nguong(self):
        tho = [self._mat_na_gia(area=500_000, bbox=(0, 0, 900, 900), stability=0.95)]
        kq = _loc_va_chuan_hoa(
            tho,
            rong=1000,
            cao=1000,
            dien_tich_toi_thieu=0.01,
            on_dinh_toi_thieu=0.9,
            so_luong_toi_da=10,
        )
        assert len(kq) == 1
        assert isinstance(kq[0], MatNaSam2)
        assert kq[0].dien_tich == 0.5

    def test_sap_giam_dan_theo_dien_tich_va_cat_theo_so_luong_toi_da(self):
        # Ba khung lồng nhau (chung gốc) cố tình dùng để kiểm sắp xếp/cắt
        # trần — KHÔNG bật lọc chồng lấp (không truyền hai tham số mới) nên
        # việc chúng lồng nhau không ảnh hưởng, giữ đúng hành vi cũ.
        tho = [
            self._mat_na_gia(area=100_000, bbox=(0, 0, 10, 10)),
            self._mat_na_gia(area=900_000, bbox=(0, 0, 900, 900)),
            self._mat_na_gia(area=500_000, bbox=(0, 0, 500, 500)),
        ]
        kq = _loc_va_chuan_hoa(
            tho, rong=1000, cao=1000, dien_tich_toi_thieu=0.0, on_dinh_toi_thieu=0.0, so_luong_toi_da=2
        )
        assert len(kq) == 2
        assert kq[0].dien_tich == 0.9
        assert kq[1].dien_tich == 0.5

    def test_thieu_area_hoac_bbox_thi_bo_qua_khong_vo(self):
        tho = [{"stability_score": 1.0}, {"area": 100}]  # thiếu bbox ở cả hai
        kq = _loc_va_chuan_hoa(
            tho,
            rong=1000,
            cao=1000,
            dien_tich_toi_thieu=0.0,
            on_dinh_toi_thieu=0.0,
            so_luong_toi_da=10,
        )
        assert kq == []

    def test_so_luong_toi_da_0_nghia_la_khong_gioi_han(self):
        tho = [self._mat_na_gia(area=100_000, bbox=(0, 0, 10, 10)) for _ in range(5)]
        kq = _loc_va_chuan_hoa(
            tho,
            rong=1000,
            cao=1000,
            dien_tich_toi_thieu=0.0,
            on_dinh_toi_thieu=0.0,
            so_luong_toi_da=0,
        )
        assert len(kq) == 5

    def test_danh_sach_rong_tra_danh_sach_rong(self):
        assert (
            _loc_va_chuan_hoa(
                [], rong=1000, cao=1000, dien_tich_toi_thieu=0.0, on_dinh_toi_thieu=0.0, so_luong_toi_da=10
            )
            == []
        )

    def test_khong_truyen_tham_so_chong_lap_thi_tat_loc(self):
        # Bó hoa (0,0,1000,1000) chứa trọn bông con (100,100,200,200) — KHÔNG
        # bật lọc chồng lấp (mặc định None) thì cả hai đều được giữ.
        tho = [
            self._mat_na_gia(area=900_000, bbox=(0, 0, 1000, 1000)),
            self._mat_na_gia(area=40_000, bbox=(100, 100, 200, 200)),
        ]
        kq = _loc_va_chuan_hoa(
            tho, rong=1000, cao=1000, dien_tich_toi_thieu=0.0, on_dinh_toi_thieu=0.0, so_luong_toi_da=10
        )
        assert len(kq) == 2

    def test_bat_loc_chong_lap_bo_khung_bo_hoa(self):
        tho = [
            self._mat_na_gia(area=900_000, bbox=(0, 0, 1000, 1000)),  # bó hoa nguyên khung
            self._mat_na_gia(area=40_000, bbox=(100, 100, 200, 200)),  # bông 1
            self._mat_na_gia(area=40_000, bbox=(500, 500, 200, 200)),  # bông 2
        ]
        kq = _loc_va_chuan_hoa(
            tho,
            rong=1000,
            cao=1000,
            dien_tich_toi_thieu=0.0,
            on_dinh_toi_thieu=0.0,
            so_luong_toi_da=10,
            nguong_chua_toi_thieu=0.85,
            ty_le_lon_hon_toi_thieu=1.5,
        )
        assert len(kq) == 2
        assert all(abs(mn.dien_tich - 0.04) < 1e-9 for mn in kq)

    def test_segmentation_duoc_giu_lai_trong_mat_na_nhi_phan(self):
        tho = [self._mat_na_gia(area=500_000, bbox=(0, 0, 500, 500), segmentation="FAKE_MASK")]
        kq = _loc_va_chuan_hoa(
            tho, rong=1000, cao=1000, dien_tich_toi_thieu=0.0, on_dinh_toi_thieu=0.0, so_luong_toi_da=10
        )
        assert kq[0].mat_na_nhi_phan == "FAKE_MASK"

    def test_khong_co_segmentation_thi_mat_na_nhi_phan_la_none(self):
        tho = [self._mat_na_gia(area=500_000, bbox=(0, 0, 500, 500))]
        kq = _loc_va_chuan_hoa(
            tho, rong=1000, cao=1000, dien_tich_toi_thieu=0.0, on_dinh_toi_thieu=0.0, so_luong_toi_da=10
        )
        assert kq[0].mat_na_nhi_phan is None
