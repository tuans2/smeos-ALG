from vision.analyzer.dem_tong import dem_tong


def _bom(flowers):
    return {"bom": {"flowers": flowers, "foliage": [], "accessories": [], "wrapping": []}}


class TestDemTong:
    def test_cong_quantity_qua_cac_loai(self):
        ket_qua = _bom([{"quantity": 12}, {"quantity": 5}])
        assert dem_tong(ket_qua)["flower_count"] == 17

    def test_nu_dem_rieng_khong_cong_vao_so_hoa(self):
        ket_qua = _bom([{"quantity": 17, "so_nu": 3}])
        tong = dem_tong(ket_qua)
        assert tong["flower_count"] == 17
        assert tong["bud_count"] == 3

    def test_don_vi_hong_da_nam_trong_so_hoa(self):
        ket_qua = _bom([{"quantity": 17, "so_hong": 1}])
        tong = dem_tong(ket_qua)
        assert tong["flower_count"] == 17
        assert tong["damaged_count"] == 1

    def test_vi_du_cua_quy_uoc_dem(self):
        """Bó hồng đỏ ở `QUY_UOC_DEM.md`: 17 cành nở, 3 nụ, 1 cành gãy cổ."""
        ket_qua = _bom([{"quantity": 17, "so_nu": 3, "so_hong": 1}])
        assert dem_tong(ket_qua) == {"flower_count": 17, "bud_count": 3, "damaged_count": 1}

    def test_khong_dong_nao_khai_duoc_thi_tra_none_chu_khong_phai_khong(self):
        ket_qua = _bom([{"quantity": None}, {"quantity": None}])
        assert dem_tong(ket_qua)["flower_count"] is None

    def test_so_khong_khac_none(self):
        assert dem_tong(_bom([{"quantity": 5, "so_nu": 0}]))["bud_count"] == 0
        assert dem_tong(_bom([{"quantity": 5}]))["bud_count"] is None

    def test_bo_qua_dong_khai_sai_kieu(self):
        ket_qua = _bom([{"quantity": 10}, {"quantity": "muoi"}, {"quantity": True}])
        assert dem_tong(ket_qua)["flower_count"] == 10

    def test_la_khong_tham_gia_phep_dem(self):
        ket_qua = {
            "bom": {
                "flowers": [{"quantity": 8}],
                "foliage": [{"quantity": 99}, {"quantity": None}],
            }
        }
        assert dem_tong(ket_qua)["flower_count"] == 8

    def test_bom_thieu_hoac_sai_hinh_dang_khong_lam_vo(self):
        assert dem_tong({})["flower_count"] is None
        assert dem_tong({"bom": None})["flower_count"] is None
        assert dem_tong({"bom": {"flowers": "khong-phai-mang"}})["flower_count"] is None
        assert dem_tong(None)["flower_count"] is None
