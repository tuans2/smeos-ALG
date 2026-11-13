import math

import numpy as np
from PIL import Image

from vision.providers.local_cv_labeler import (
    _anh_da_ap_mat_na,
    _cat_bbox_co_dem,
    _do_chac_tu_diem_chuyen,
    _don_ma_caption,
    _no_rong_mat_na,
    _tinh_ban_kinh_no_px,
)


class TestDonMaCaption:
    def test_cat_dau_cham_va_khoang_trang(self):
        assert _don_ma_caption("  a bouquet of yellow tulips. ") == "a bouquet of yellow tulips"

    def test_chuoi_rong_tra_chuoi_rong(self):
        assert _don_ma_caption("   ") == ""

    def test_khong_dong_bang_neu_khong_co_dau_cham_cuoi(self):
        assert _don_ma_caption("a single rose") == "a single rose"


class TestDoChacTuDiemChuyen:
    def test_danh_sach_rong_tra_0(self):
        assert _do_chac_tu_diem_chuyen([]) == 0

    def test_log_xac_suat_0_tuong_duong_100(self):
        # log(1.0) == 0.0 -> xác suất 1.0 -> 100.
        assert _do_chac_tu_diem_chuyen([0.0, 0.0]) == 100

    def test_log_xac_suat_am_ha_do_chac(self):
        diem = [math.log(0.5), math.log(0.5)]
        assert _do_chac_tu_diem_chuyen(diem) == 50

    def test_khong_vuot_100_du_diem_duong_bat_thuong(self):
        assert _do_chac_tu_diem_chuyen([5.0]) == 100

    def test_khong_am_du_diem_am_rat_lon(self):
        assert _do_chac_tu_diem_chuyen([-50.0]) == 0


class TestCatBboxCoDem:
    def test_cat_dung_khung_khong_dem(self):
        khung = _cat_bbox_co_dem((1000, 2000), (0.1, 0.2, 0.3, 0.4), ty_le_dem=0.0)
        assert khung == (100, 400, 300, 800)

    def test_dem_mo_rong_khung_ca_bon_canh(self):
        khong_dem = _cat_bbox_co_dem((1000, 1000), (0.4, 0.4, 0.6, 0.6), ty_le_dem=0.0)
        co_dem = _cat_bbox_co_dem((1000, 1000), (0.4, 0.4, 0.6, 0.6), ty_le_dem=0.5)
        assert co_dem[0] < khong_dem[0]
        assert co_dem[1] < khong_dem[1]
        assert co_dem[2] > khong_dem[2]
        assert co_dem[3] > khong_dem[3]

    def test_khong_vuot_bien_anh_khi_dem_qua_lon(self):
        khung = _cat_bbox_co_dem((1000, 1000), (0.0, 0.0, 0.1, 0.1), ty_le_dem=5.0)
        assert khung[0] == 0
        assert khung[1] == 0
        assert khung[2] <= 1000
        assert khung[3] <= 1000

    def test_khung_luon_rong_va_cao_it_nhat_1px(self):
        # bbox suy biến (điểm, không phải vùng) vẫn phải cắt ra được một khung hợp lệ.
        khung = _cat_bbox_co_dem((1000, 1000), (0.5, 0.5, 0.5, 0.5), ty_le_dem=0.0)
        x0, y0, x1, y1 = khung
        assert x1 > x0
        assert y1 > y0


class TestTinhBanKinhNoPx:
    def test_ty_le_theo_canh_ngan(self):
        assert _tinh_ban_kinh_no_px((200, 100), 0.1) == 10

    def test_ty_le_0_khong_no(self):
        assert _tinh_ban_kinh_no_px((200, 100), 0.0) == 0

    def test_kich_thuoc_0_khong_no(self):
        assert _tinh_ban_kinh_no_px((0, 100), 0.1) == 0

    def test_ty_le_am_khong_no(self):
        assert _tinh_ban_kinh_no_px((200, 100), -0.1) == 0


class TestNoRongMatNa:
    def test_ban_kinh_0_khong_doi(self):
        mat_na = np.zeros((11, 11), dtype=bool)
        mat_na[5, 5] = True
        assert np.array_equal(_no_rong_mat_na(mat_na, 0), mat_na)

    def test_no_1px_them_bon_lang_gieng(self):
        mat_na = np.zeros((11, 11), dtype=bool)
        mat_na[5, 5] = True
        no1 = _no_rong_mat_na(mat_na, 1)
        assert no1.sum() == 5
        assert no1[4, 5] and no1[6, 5] and no1[5, 4] and no1[5, 6]

    def test_ban_kinh_lon_hon_no_rong_hon(self):
        mat_na = np.zeros((21, 21), dtype=bool)
        mat_na[10, 10] = True
        no1 = _no_rong_mat_na(mat_na, 1)
        no3 = _no_rong_mat_na(mat_na, 3)
        assert no3.sum() > no1.sum()


class TestAnhDaApMatNa:
    def _anh_mau_dong(self):
        return Image.new("RGB", (20, 20), (10, 20, 30))

    def test_khong_co_mat_na_tra_nguyen_crop(self):
        anh = self._anh_mau_dong()
        crop = _anh_da_ap_mat_na(anh, None, (0, 0, 20, 20), ty_le_no_mat_na=0.1)
        assert np.array_equal(np.array(crop), np.array(anh))

    def test_trong_mat_na_giu_nguyen_mau_ngoai_bi_to_nen(self):
        anh = self._anh_mau_dong()
        mat_na = np.zeros((20, 20), dtype=bool)
        mat_na[7:13, 7:13] = True
        crop = _anh_da_ap_mat_na(anh, mat_na, (0, 0, 20, 20), ty_le_no_mat_na=0.0)
        mang = np.array(crop)
        assert tuple(mang[10, 10]) == (10, 20, 30)
        assert tuple(mang[0, 0]) == (255, 255, 255)

    def test_mat_na_sai_kich_thuoc_anh_goc_tra_nguyen_crop(self):
        anh = self._anh_mau_dong()
        mat_na_sai = np.zeros((5, 5), dtype=bool)
        crop = _anh_da_ap_mat_na(anh, mat_na_sai, (0, 0, 20, 20), ty_le_no_mat_na=0.1)
        assert np.array_equal(np.array(crop), np.array(anh))

    def test_mat_na_rong_trong_vung_cat_tra_nguyen_crop(self):
        anh = self._anh_mau_dong()
        mat_na_rong = np.zeros((20, 20), dtype=bool)
        crop = _anh_da_ap_mat_na(anh, mat_na_rong, (0, 0, 20, 20), ty_le_no_mat_na=0.1)
        assert np.array_equal(np.array(crop), np.array(anh))

    def test_no_lon_hon_giu_lai_nhieu_pixel_mau_goc_hon(self):
        anh = self._anh_mau_dong()
        mat_na = np.zeros((20, 20), dtype=bool)
        mat_na[7:13, 7:13] = True
        it_no = np.array(_anh_da_ap_mat_na(anh, mat_na, (0, 0, 20, 20), ty_le_no_mat_na=0.0))
        nhieu_no = np.array(_anh_da_ap_mat_na(anh, mat_na, (0, 0, 20, 20), ty_le_no_mat_na=0.3))
        so_pixel_it_no = (it_no == (10, 20, 30)).all(axis=-1).sum()
        so_pixel_nhieu_no = (nhieu_no == (10, 20, 30)).all(axis=-1).sum()
        assert so_pixel_nhieu_no > so_pixel_it_no

    def test_mau_nen_tuy_chinh_duoc(self):
        anh = self._anh_mau_dong()
        mat_na = np.zeros((20, 20), dtype=bool)
        mat_na[7:13, 7:13] = True
        crop = _anh_da_ap_mat_na(anh, mat_na, (0, 0, 20, 20), ty_le_no_mat_na=0.0, mau_nen=(0, 0, 0))
        assert tuple(np.array(crop)[0, 0]) == (0, 0, 0)
