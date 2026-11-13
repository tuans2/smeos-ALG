import vision.providers.local_cv_species as mod
from vision.providers.local_cv_species import doan_ma_loai


class TestDoanMaLoaiVoiDanhMucThat:
    """Dùng thẳng `contracts/species_catalog.json` thật — đây là những ca
    thật sẽ gặp khi Florence-2 chạy."""

    def setup_method(self):
        mod._bang_tra_cuu.cache_clear()

    def test_khop_ro_mot_loai(self):
        assert doan_ma_loai("a bouquet of yellow tulips") == ("LH036", "Tulip")

    def test_alias_dai_hon_thang_alias_ngan_cua_loai_khac(self):
        """"spider gerbera" (LH013) không được để "gerbera" (LH012, chứa
        trong chính cụm đó) biến thành nhập nhằng hai loài."""
        assert doan_ma_loai("a close up of a spider gerbera flower") == ("LH013", "Đồng tiền tua")

    def test_khong_khop_gi_tra_none(self):
        assert doan_ma_loai("a close up of a white sheet on a bed") == (None, None)

    def test_nhan_rong_tra_none(self):
        assert doan_ma_loai("") == (None, None)


class TestDoanMaLoaiNhapNhang:
    """Danh mục giả nhỏ, cô lập khỏi tệp thật — kiểm đúng luật nhập nhằng."""

    def setup_method(self):
        mod._bang_tra_cuu.cache_clear()

    def _gia(self, monkeypatch, loai):
        monkeypatch.setattr(mod, "nap_json", lambda ten: {"loai": loai})

    def test_hai_loai_khac_nhau_cung_khop_thi_tra_none(self, monkeypatch):
        self._gia(
            monkeypatch,
            [
                {"ma_loai": "A1", "ten_chuan": "Rose", "ten_khac": []},
                {"ma_loai": "A2", "ten_chuan": "Lily", "ten_khac": []},
            ],
        )
        assert doan_ma_loai("a bunch of rose and lily") == (None, None)

    def test_alias_khong_phai_tieng_anh_bi_bo_qua(self, monkeypatch):
        self._gia(
            monkeypatch,
            [{"ma_loai": "A1", "ten_chuan": "Hồng", "ten_khac": ["hồng đỏ"]}],
        )
        assert doan_ma_loai("hồng đỏ tuoi") == (None, None)

    def test_ranh_gioi_tu_khong_khop_chuoi_con_tinh_co(self, monkeypatch):
        """"tana" là tiền tố của "tanager" (một loài chim) nhưng không có
        ranh giới từ ngay sau — không được tính là khớp."""
        self._gia(
            monkeypatch,
            [{"ma_loai": "A1", "ten_chuan": "Cúc Tana", "ten_khac": ["tana"]}],
        )
        assert doan_ma_loai("a tanager bird") == (None, None)

    def test_so_nhieu_don_gian_van_khop(self, monkeypatch):
        """Florence-2 hay tả số nhiều ("tulips") — hậu tố s/es đơn giản phải
        khớp được, không chỉ đúng số ít."""
        self._gia(monkeypatch, [{"ma_loai": "A1", "ten_chuan": "Iris", "ten_khac": []}])
        assert doan_ma_loai("a bunch of purple irises") == ("A1", "Iris")
