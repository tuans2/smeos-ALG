import os

os.environ.setdefault("OPENAI_API_KEY", "test-key-khong-that")

import pytest  # noqa: E402

from vision.providers import registry  # noqa: E402


class TestRegistry:
    def test_ba_khoa_khop_tung_chu_voi_phia_ts(self):
        """`VISION_ENGINES` ở `domain/vision-engine.ts` phải khớp đúng ba khoá
        này. Hai bên không có nguồn sự thật chung, y như `notify_channel_for`."""
        assert registry.KHOA_BO_MAY == ("openai_structured", "openai_direct", "local_cv")

    def test_mac_dinh_la_bo_da_duoc_do(self):
        """Mặc định là `openai_structured` — bộ duy nhất mang trạng thái
        `san_xuat` ở `MO_TA_BO_MAY` phía TS.

        Một bộ `thu_nghiem` làm mặc định là đưa mọi tổ chức mới vào đường
        chưa ai đo, vì tổ chức mới theo định nghĩa là tổ chức chưa chọn gì.
        Đổi lại chỉ bằng số đo trên bộ ảnh vàng (D5-c), không bằng lập luận
        rẻ hơn hay nhanh hơn — PRD mục 9: Accuracy > Quality > Cost > Speed.
        """
        assert registry.MAC_DINH == "openai_structured"
        assert registry.MAC_DINH in registry.KHOA_BO_MAY

    def test_khoa_la_roi_ve_mac_dinh_khong_nem_loi(self, monkeypatch):
        """Dòng job cũ ghi tên bộ máy đã bỏ vẫn phải chạy được."""
        goi = []
        monkeypatch.setattr(registry, "_DA_DUNG", {})
        monkeypatch.setitem(registry._XUONG, registry.MAC_DINH, lambda: goi.append(1) or "gia")
        assert registry.lay_provider("bo-may-khong-ton-tai") == "gia"
        assert registry.lay_provider(None) == "gia"

    def test_dung_luoi_va_giu_lai(self, monkeypatch):
        """Dựng cả ba lúc khởi động sẽ bắt tổ chức chỉ dùng bộ gọn phải có GPU."""
        so_lan = []
        monkeypatch.setattr(registry, "_DA_DUNG", {})
        monkeypatch.setitem(registry._XUONG, "openai_direct", lambda: so_lan.append(1) or "gia")
        registry.lay_provider("openai_direct")
        registry.lay_provider("openai_direct")
        assert len(so_lan) == 1

    def test_bo_cuc_bo_bao_thieu_gi_thay_vi_tra_provider_gia(self, monkeypatch):
        """Ép cấu hình `local_cv` thiếu khoá bất kể máy chạy test đã cài
        `torch`/`sam2` và trọng số thật hay chưa. Trước đây ca thử này gọi
        thẳng `registry.lay_provider` không monkeypatch gì thêm — chỉ đỏ nhờ
        máy chạy test thiếu `torch`; trên máy đã cài đủ và đã điền
        `sam2_checkpoint` thật (như máy đã dựng `.venv-local-cv`), việc dựng
        provider thật sự thành công nên không còn ném lỗi, và ca thử mất tác
        dụng đúng lúc cần nó nhất. Xoá lệ thuộc vào môi trường bằng cách bắt
        `nap_json` trả cấu hình rỗng — thiếu `sam2_checkpoint` luôn ném
        `ValueError` trước khi code kịp đụng tới `torch`/`sam2`."""
        monkeypatch.setattr(registry, "_DA_DUNG", {})
        monkeypatch.setattr("vision.providers.chung.nap_json", lambda ten: {})
        with pytest.raises(NotImplementedError) as loi:
            registry.lay_provider("local_cv")
        assert "SAM2" in str(loi.value)


class TestChuoiDuPhong:
    """Bộ máy chính dựng không nổi thì job phải chạy tiếp bằng bộ khác —
    trừ khi đường dự phòng phá sàn quyền riêng tư của tổ chức."""

    def test_bo_cuc_bo_khong_bao_gio_roi_ra_ngoai(self):
        """Tổ chức chọn 'Cục bộ' vì không muốn ảnh rời hạ tầng. Một đường dự
        phòng lặng lẽ gửi ảnh cho nhà cung cấp là vi phạm nặng hơn nhiều so
        với việc job hỏng và hoàn credit (D17: sàn quyền riêng tư cắt sau
        cùng)."""
        assert registry.du_phong_cho("local_cv") == ()

    def test_thac_tut_xuong_theo_thang_chat_luong(self):
        """Chủ sản phẩm chốt 09/17: hỏng thì VẪN ra kết quả, chỉ kém hơn.

        Đảo lại luật "thác chỉ leo lên" của bản trước (nợ #84). Thứ tự phải
        đúng thang — rơi từ Đầy đủ xuống Gọn trước, xuống Cục bộ sau cùng,
        chứ không nhảy thẳng xuống đáy.
        """
        assert registry.du_phong_cho("openai_structured") == ("openai_direct", "local_cv")
        assert registry.du_phong_cho("openai_direct") == ("local_cv",)

    def test_khong_bo_nao_roi_nguoc_len_thang(self):
        """Không có đường nào từ dưới leo lên — kể cả khi bộ trên còn sống.

        Nếu một ngày ai đó thêm `local_cv: ("openai_structured",)` thì tổ
        chức chọn Cục bộ sẽ bị gửi ảnh ra ngoài; ca này chặn cả hướng đó.
        """
        thang = ["openai_structured", "openai_direct", "local_cv"]
        for i, bo in enumerate(thang):
            for ke in registry.du_phong_cho(bo):
                assert thang.index(ke) > i, f"{bo} rơi NGƯỢC lên {ke}"

    def test_chay_bang_du_phong_khi_bo_chinh_khong_dung_noi(self, monkeypatch):
        monkeypatch.setattr(registry, "_DA_DUNG", {})

        def hong():
            raise NotImplementedError("thiếu trọng số")

        monkeypatch.setitem(registry._XUONG, "openai_direct", hong)
        monkeypatch.setitem(registry._XUONG, "local_cv", lambda: "bo-cuc-bo")

        provider, da_dung, da_hong = registry.lay_provider_co_du_phong("openai_direct")
        assert provider == "bo-cuc-bo"
        assert da_dung == "local_cv"
        assert da_hong == "openai_direct"

    def test_ca_chuoi_hong_thi_nem_loi_goc(self, monkeypatch):
        """Hết đường thì job FAILED thật — để credit được hoàn theo D3-b,
        chứ không treo mãi ở PROCESSING."""
        monkeypatch.setattr(registry, "_DA_DUNG", {})

        def hong():
            raise NotImplementedError("thiếu trọng số")

        # Cả thang hỏng, kể cả đáy — không còn chỗ nào tụt xuống nữa.
        monkeypatch.setitem(registry._XUONG, "openai_structured", hong)
        monkeypatch.setitem(registry._XUONG, "openai_direct", hong)
        monkeypatch.setitem(registry._XUONG, "local_cv", hong)

        with pytest.raises(NotImplementedError):
            registry.lay_provider_co_du_phong("openai_structured")

    def test_khong_du_phong_thi_giu_nguyen_bo_da_chon(self, monkeypatch):
        """Bộ Cục bộ là đáy thang — dựng được thì chạy, không có `fallback_from`."""
        monkeypatch.setattr(registry, "_DA_DUNG", {})
        monkeypatch.setitem(registry._XUONG, "local_cv", lambda: "bo-cuc-bo")
        provider, da_dung, da_hong = registry.lay_provider_co_du_phong("local_cv")
        assert (provider, da_dung, da_hong) == ("bo-cuc-bo", "local_cv", None)

    def test_day_du_hong_thi_tut_dan_qua_hai_bac(self, monkeypatch):
        """Đầy đủ hỏng, Gọn cũng hỏng → chạy bằng Cục bộ, và NÓI RA bộ đã hỏng.

        `da_hong` là thứ ba chỗ ghi nhật ký bám vào (xem chú thích ở
        `registry.py`). Mất nó là quyết định 09/17 thành một lượt hạ chất
        lượng không ai hay.
        """
        monkeypatch.setattr(registry, "_DA_DUNG", {})

        def hong():
            raise NotImplementedError("thiếu khoá API")

        monkeypatch.setitem(registry._XUONG, "openai_structured", hong)
        monkeypatch.setitem(registry._XUONG, "openai_direct", hong)
        monkeypatch.setitem(registry._XUONG, "local_cv", lambda: "bo-cuc-bo")

        provider, da_dung, da_hong = registry.lay_provider_co_du_phong("openai_structured")
        assert provider == "bo-cuc-bo"
        assert da_dung == "local_cv"
        assert da_hong == "openai_structured"
