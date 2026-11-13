"""Test cho Product Identity Guard (M04a, P9) — cổng cứng chặn ảnh bị AI
làm sai lệch sản phẩm thật.

Toàn bộ ở đây là test THUẦN: đầu vào là hai `dict` kết quả Vision, không đọc
ảnh, không gọi mạng, không chạm cơ sở dữ liệu.
"""

import copy

import pytest

from media_ai.guard.compare import (
    GOOD,
    NGUONG_AN_TOAN,
    NGUONG_TU_CHOI,
    REJECTED,
    SAFE,
    WARNING,
    phan_quyet,
    so_sanh,
)
from media_ai.guard.fingerprint import rut_dau_van


def phan_tich(**doi):
    """Một kết quả Vision tối thiểu nhưng đúng hình dạng hợp đồng."""
    goc = {
        "identity": {
            "category": "Bó hoa",
            "shape": "Tròn",
            "facing": "Một mặt",
            "container": "Giấy gói",
        },
        "bom": {
            "flowers": [
                {"name": "Cẩm chướng", "color": "Hồng đậm", "quantity": 30,
                 "bloom_diameter_ratio": 0.1},
            ],
            "foliage": [{"name": "Lá bạc", "color": "Xanh bạc", "quantity": 8}],
            "accessories": [{"name": "Nơ ruy băng", "color": "Trắng", "quantity": 1}],
            "wrapping": [{"material": "Giấy kraft", "color": "Nâu", "layer": 1}],
        },
    }
    goc.update(doi)
    return goc


class TestKhongDoiGiThiSafe:
    def test_so_voi_chinh_no_ra_safe(self):
        # Đây chính là phép thử của `PassthroughEnhancer`: không sửa một pixel
        # thì Guard PHẢI nói SAFE. Guard nói khác là Guard hỏng.
        r = so_sanh(phan_tich(), phan_tich())
        assert r.result == SAFE
        assert r.diem_thap_nhat == 1.0
        assert r.ly_do == ()

    def test_khac_hoa_thuong_khong_tinh_la_sai_lech(self):
        # Hai lượt của cùng một model vẫn có thể trả "Hồng đậm" và "hồng đậm".
        sau = phan_tich()
        sau["bom"]["flowers"][0]["color"] = "  HỒNG ĐẬM  "
        assert so_sanh(phan_tich(), sau).result == SAFE


class TestDoiNhanDang:
    def test_doi_phan_loai_bi_tu_choi(self):
        sau = phan_tich()
        sau["identity"]["category"] = "Giỏ hoa"
        r = so_sanh(phan_tich(), sau)
        # 3/4 ô nhận dạng còn khớp = 0,75 < 0,90
        assert r.identity_score == 0.75
        assert r.result == REJECTED
        assert any("Phân loại đổi" in ly for ly in r.ly_do)

    def test_doi_vat_chua_bi_tu_choi(self):
        sau = phan_tich()
        sau["identity"]["container"] = "Giỏ mây"
        assert so_sanh(phan_tich(), sau).result == REJECTED


class TestDoiMau:
    def test_doi_mau_mot_trong_bon_thanh_phan_bi_tu_choi(self):
        sau = phan_tich()
        sau["bom"]["foliage"][0]["color"] = "Xanh lá"
        r = so_sanh(phan_tich(), sau)
        assert r.color_score == 0.75
        assert r.result == REJECTED  # 0,75 < 0,90 — màu là chiều nhạy nhất
        assert any("Màu của lá bạc đổi" in ly for ly in r.ly_do)

    def test_diem_mau_khong_phat_hai_lan_khi_thanh_phan_bi_mat(self):
        # Mất một thành phần là lỗi của `component_consistency`. Nếu điểm màu
        # cũng tính nó thì một lỗi bị phạt hai chiều.
        sau = phan_tich()
        sau["bom"]["foliage"] = []
        r = so_sanh(phan_tich(), sau)
        assert r.color_score == 1.0
        assert r.component_consistency < 1.0
        assert any("Mất thành phần" in ly for ly in r.ly_do)

    def test_xanh_la_va_xanh_dam_duoc_coi_la_cung_he_mau_khong_bi_tu_choi(self):
        # Tránh lỗi false positive: AI đọc ảnh gốc là "Xanh lá", ảnh sau tăng cường là "Xanh đậm"
        truoc = phan_tich()
        truoc["bom"]["foliage"][0]["color"] = "Xanh lá"
        sau = phan_tich()
        sau["bom"]["foliage"][0]["color"] = "Xanh đậm"
        r = so_sanh(truoc, sau)
        assert r.color_score == 1.0
        assert r.result in (SAFE, GOOD, WARNING)
        assert r.result != REJECTED


class TestThanhPhan:
    def test_them_thanh_phan_khong_co_o_anh_goc(self):
        # Đây đúng là thứ Q8/Q33 sợ nhất: AI "vẽ thêm" hoa vào ảnh.
        sau = phan_tich()
        sau["bom"]["flowers"].append({"name": "Hồng", "color": "Đỏ", "quantity": 5})
        r = so_sanh(phan_tich(), sau)
        assert r.result == REJECTED
        assert any("Thêm thành phần không có ở ảnh gốc: hồng" in ly for ly in r.ly_do)

    def test_lech_so_luong_cang_lon_phan_quyet_cang_nang(self):
        """Số lượng là tín hiệu CÓ MỨC ĐỘ, không phải đúng/sai — nên nó được
        trung bình cùng ba thành phần kia trong `component_consistency`, khác
        với thêm/mất thành phần (xem ca dưới) vốn là thay đổi cấu trúc.

        Bốn thành phần, ba cái không đổi (1,0), nên một dòng lệch d cho điểm
        `(3 + d) / 4` — chính vì thế lệch nhỏ không phá cổng còn lệch lớn thì
        có. Đây là lựa chọn có chủ đích: đếm hoa vốn có dải không chắc chắn
        (M01 trả `dem_tung_vung`/`confidence`), coi mọi sai lệch đếm là chặn
        cứng sẽ chặn nhầm rất nhiều ảnh đúng.
        """
        it_hon = phan_tich()
        it_hon["bom"]["flowers"][0]["quantity"] = 29  # d ≈ 0,967 → (3+0,967)/4 ≈ 0,992
        assert so_sanh(phan_tich(), it_hon).result == GOOD

        vua = phan_tich()
        vua["bom"]["flowers"][0]["quantity"] = 20  # d ≈ 0,667 → ≈ 0,917
        assert so_sanh(phan_tich(), vua).result == WARNING

        nhieu = phan_tich()
        nhieu["bom"]["flowers"][0]["quantity"] = 12  # d = 0,4 → 0,85
        assert so_sanh(phan_tich(), nhieu).result == REJECTED


class TestHinhHoc:
    def test_doi_dang_khoi_bi_tu_choi(self):
        sau = phan_tich()
        sau["identity"]["shape"] = "Thác đổ"
        r = so_sanh(phan_tich(), sau)
        # Dáng khối vào cả `identity_score` lẫn `geometry_score` — đúng, vì nó
        # vừa là nhận dạng vừa là hình học.
        assert r.geometry_score < NGUONG_TU_CHOI
        assert r.result == REJECTED

    def test_ty_le_duong_kinh_doi_nhe_khong_pha_cong(self):
        sau = phan_tich()
        sau["bom"]["flowers"][0]["bloom_diameter_ratio"] = 0.101
        assert so_sanh(phan_tich(), sau).result in (GOOD, SAFE)


class TestDuLieuThieuHoacHong:
    def test_phan_tich_rong_khong_nem_ma_ra_phan_quyet(self):
        # Một lượt phân tích hỏng phải cho ra REJECTED (an toàn), KHÔNG được
        # ném — ném sẽ biến phán quyết an toàn thành job FAILED, sai theo
        # M04 mục 7 ("REJECTED không phải job lỗi").
        r = so_sanh(phan_tich(), {})
        assert r.result == REJECTED

    def test_hai_ben_cung_thieu_mot_truong_van_tinh_la_khop(self):
        truoc = phan_tich()
        sau = phan_tich()
        truoc["identity"]["facing"] = None
        sau["identity"]["facing"] = None
        assert so_sanh(truoc, sau).identity_score == 1.0

    def test_thieu_ty_le_duong_kinh_o_mot_ben_khong_bi_phat(self):
        # Không có dữ liệu không phải bằng chứng sai lệch.
        sau = phan_tich()
        del sau["bom"]["flowers"][0]["bloom_diameter_ratio"]
        assert so_sanh(phan_tich(), sau).geometry_score == 1.0


class TestNguongVaPhanQuyet:
    def test_ranh_gioi_dung_bang_nguong(self):
        assert phan_quyet(NGUONG_AN_TOAN, co_thay_doi=False) == SAFE
        assert phan_quyet(NGUONG_AN_TOAN, co_thay_doi=True) == GOOD
        assert phan_quyet(NGUONG_AN_TOAN - 0.001, co_thay_doi=True) == WARNING
        assert phan_quyet(NGUONG_TU_CHOI, co_thay_doi=True) == WARNING
        assert phan_quyet(NGUONG_TU_CHOI - 0.001, co_thay_doi=True) == REJECTED

    def test_lay_diem_thap_nhat_khong_lay_trung_binh(self):
        """Ca này khoá đúng lựa chọn thiết kế: phán quyết lấy MIN của bốn
        điểm, không lấy trung bình. Dựng một trường hợp mà hai cách cho hai
        kết quả trái ngược — nếu ai đó đổi sang trung bình, ca này đỏ."""
        sau = phan_tich()
        sau["bom"]["flowers"][0]["quantity"] = 12  # d = 0,4 → thành phần 0,85
        r = so_sanh(phan_tich(), sau)

        assert r.identity_score == 1.0
        assert r.color_score == 1.0
        assert r.geometry_score == 1.0
        assert r.component_consistency == 0.85

        trung_binh = (
            r.identity_score + r.color_score + r.geometry_score + r.component_consistency
        ) / 4
        assert trung_binh > NGUONG_AN_TOAN  # 0,9625 — trung bình thì QUA cổng
        assert r.diem_thap_nhat < NGUONG_TU_CHOI  # 0,85
        assert r.result == REJECTED  # cổng lấy điểm thấp nhất nên CHẶN

    def test_to_dict_dung_hinh_dang_dac_ta_06(self):
        d = so_sanh(phan_tich(), phan_tich()).to_dict()
        assert set(d) == {
            "identity_score", "color_score", "geometry_score",
            "component_consistency", "result", "ly_do",
        }


class TestDauVan:
    def test_rut_dau_van_gop_du_bon_nhom_bom(self):
        f = rut_dau_van(phan_tich())
        assert len(f.thanh_phan) == 4
        assert {tp.nhom for tp in f.thanh_phan} == {
            "flowers", "foliage", "accessories", "wrapping",
        }

    def test_wrapping_lay_ten_tu_material(self):
        f = rut_dau_van(phan_tich())
        wrapping = [tp for tp in f.thanh_phan if tp.nhom == "wrapping"][0]
        assert wrapping.ten == "giấy kraft"

    def test_bom_khong_phai_dict_thi_dau_van_rong(self):
        assert rut_dau_van({"bom": "hỏng"}).thanh_phan == ()


class TestChuanHoaTuVungVaSacDo:
    def test_dong_nhat_ten_hoa_co_tien_to(self):
        # 'Tulip' và 'Hoa tulip' là cùng một loài, không bị phạt mất/thêm thành phần
        truoc = phan_tich()
        truoc["bom"]["flowers"][0]["name"] = "Tulip"
        sau = phan_tich()
        sau["bom"]["flowers"][0]["name"] = "Hoa tulip"
        r = so_sanh(truoc, sau)
        assert r.component_consistency == 1.0
        assert r.result == SAFE

    def test_dong_nhat_giay_va_giay_goi(self):
        # 'Giấy' và 'Giấy gói' trong wrapping là cùng một loại vật liệu
        truoc = phan_tich()
        truoc["bom"]["wrapping"][0]["material"] = "Giấy"
        sau = phan_tich()
        sau["bom"]["wrapping"][0]["material"] = "Giấy gói"
        r = so_sanh(truoc, sau)
        assert r.component_consistency == 1.0
        assert r.result == SAFE

    def test_sac_do_mau_do_anh_sang_van_dat_good(self):
        # 'Vàng' và 'Vàng nhạt' do ánh sáng phòng chụp tăng cường: màu sắc vẫn chuẩn (color_score 1.0)
        # và kết quả đạt GOOD chứ không bị REJECTED
        truoc = phan_tich()
        truoc["bom"]["accessories"][0]["name"] = "Dây lưới"
        truoc["bom"]["accessories"][0]["color"] = "Vàng"
        sau = phan_tich()
        sau["bom"]["accessories"][0]["name"] = "Dây lưới"
        sau["bom"]["accessories"][0]["color"] = "Vàng nhạt"
        r = so_sanh(truoc, sau)
        assert r.color_score == 1.0
        assert r.result == GOOD
        assert any("Sắc độ màu" in ly and "vàng → vàng nhạt" in ly for ly in r.ly_do)

    def test_doi_han_mau_hoa_van_bi_tu_choi(self):
        # 'Vàng' sang 'Đỏ' là đổi hoàn toàn màu sắc: vẫn bị REJECTED dứt khoát
        truoc = phan_tich()
        truoc["bom"]["flowers"][0]["color"] = "Vàng"
        sau = phan_tich()
        sau["bom"]["flowers"][0]["color"] = "Đỏ"
        r = so_sanh(truoc, sau)
        assert r.color_score < NGUONG_TU_CHOI
        assert r.result == REJECTED

    def test_dong_nhat_cac_loai_day_buoc_bo_hoa(self):
        # 'Dây lưới' và 'Dây thừng' đều là phụ kiện dây buộc bó hoa, không tính mất/thêm thành phần
        truoc = phan_tich()
        truoc["bom"]["accessories"][0]["name"] = "Dây lưới"
        sau = phan_tich()
        sau["bom"]["accessories"][0]["name"] = "Dây thừng"
        r = so_sanh(truoc, sau)
        assert r.component_consistency == 1.0
        assert r.result == SAFE

    def test_dung_sai_dem_hoa_nhe_van_dat_good(self):
        # Bó 10 bông so với 12 bông (lệch nhẹ do góc chụp che khuất) kết hợp dây buộc và sắc độ ánh sáng:
        # Tổng điểm đạt >= 0.95 và kết quả ra GOOD (cho phép duyệt Master Image)
        truoc = phan_tich()
        truoc["bom"]["flowers"][0]["name"] = "Tulip"
        truoc["bom"]["flowers"][0]["color"] = "Vàng"
        truoc["bom"]["flowers"][0]["quantity"] = 10
        truoc["bom"]["wrapping"][0]["material"] = "Giấy"
        truoc["bom"]["accessories"][0]["name"] = "Dây lưới"
        truoc["bom"]["accessories"][0]["color"] = "Vàng"

        sau = phan_tich()
        sau["bom"]["flowers"][0]["name"] = "Hoa tulip"
        sau["bom"]["flowers"][0]["color"] = "Vàng nhạt"
        sau["bom"]["flowers"][0]["quantity"] = 12
        sau["bom"]["accessories"][0]["name"] = "Dây thừng"
        sau["bom"]["accessories"][0]["color"] = "Vàng nhạt"
        sau["bom"]["wrapping"][0]["material"] = "Giấy gói"

        r = so_sanh(truoc, sau)
        assert r.result == GOOD
        assert r.diem_thap_nhat >= NGUONG_AN_TOAN
        assert any("Số lượng tulip đổi: 10.0 → 12.0" in ly for ly in r.ly_do)


