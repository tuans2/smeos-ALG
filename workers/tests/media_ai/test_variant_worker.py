"""Cổng Subject Integrity của M04b — phép đo phải BẮT được việc vẽ đè.

Ca thử ở đây không chạm Postgres: `dung_bien_the` và `_do_lo_chu_the` tách
khỏi vòng đời job đúng để có thể khoá bằng test thuần, cùng lý do
`optimization-rules.ts` không import Prisma.
"""

from __future__ import annotations

from io import BytesIO

import time

import numpy as np
import pytest
from PIL import Image, ImageFilter

from media_ai.jobs.variant_worker import (
    NGUONG_TU_CHOI,
    RATIO_PRESETS,
    _ap_dung_auto_enhance,
    _dan_lai_chu_the,
    _doan_chu_the,
    _dong_khung,
    _do_lo_chu_the,
    _mat_na_iopaint,
    _sang_bytes,
    dung_bien_the,
)


def _anh_mau(w: int = 240, h: int = 240) -> Image.Image:
    """Một khối màu CÓ KẾT CẤU, gieo cố định nên ca thử lặp lại được.

    Vân kết cấu không phải để cho đẹp. Ảnh chỉ có dải chuyển màu tuyến tính
    là bất biến dưới phép làm mờ Gauss — dùng nó làm mẫu thì ca thử "phát
    hiện vẽ đè" sẽ XANH ngay cả khi phép đo hỏng hoàn toàn. Bó hoa thật có
    vân cánh; mẫu thử phải có thứ tương đương.
    """
    rng = np.random.default_rng(20260917)
    arr = np.zeros((h, w, 3), dtype=np.int16)
    arr[:, :, 0] = np.linspace(0, 255, w, dtype=np.int16)[None, :]
    arr[:, :, 1] = np.linspace(0, 255, h, dtype=np.int16)[:, None]
    arr[:, :, 2] = 128
    arr += rng.integers(-40, 41, size=(h, w, 3), dtype=np.int16)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode="RGB")


def _mat_na(w: int = 240, h: int = 240) -> Image.Image:
    """Chủ thể là hình tròn giữa khung."""
    m = Image.new("L", (w, h), 0)
    from PIL import ImageDraw

    ImageDraw.Draw(m).ellipse([w * 0.2, h * 0.2, w * 0.8, h * 0.8], fill=255)
    return m


class TestDoLoChuThe:
    def test_sao_chep_nguyen_khoi_thi_trung_khit_tuyet_doi(self):
        master = _anh_mau()
        alpha = _mat_na()
        ket_qua = master.copy().convert("RGBA")
        ket_qua.putalpha(alpha)

        assert _do_lo_chu_the(master, ket_qua, alpha) == 1.0

    def test_doi_vien_khong_lam_sut_diem(self):
        """Làm mềm viền là bước CỐ Ý của M04b — nó không được kêu báo động."""
        master = _anh_mau()
        alpha = _mat_na()
        ket_qua = master.copy().convert("RGBA")
        # Chỉ đụng vào phần alpha ở rìa, giữ nguyên RGB của lõi.
        ket_qua.putalpha(alpha.filter(ImageFilter.GaussianBlur(2)))

        assert _do_lo_chu_the(master, ket_qua, alpha) == 1.0

    def test_ve_de_len_lo_lam_sut_diem_xuong_duoi_nguong(self):
        """Đây là lỗi mà cổng này sinh ra để bắt: một bộ lọc quét cả chủ thể."""
        master = _anh_mau()
        alpha = _mat_na()
        ket_qua = master.filter(ImageFilter.GaussianBlur(3)).convert("RGBA")
        ket_qua.putalpha(alpha)

        diem = _do_lo_chu_the(master, ket_qua, alpha)
        assert diem < NGUONG_TU_CHOI

    def test_lech_mot_muc_xam_cung_bi_tinh_la_doi(self):
        """Ngưỡng là sai khác 0 tuyệt đối — nới thành 'gần đúng' là tự bịt mắt."""
        master = _anh_mau()
        alpha = _mat_na()
        arr = np.array(master, dtype=np.int16)
        arr[:, :, 2] = np.clip(arr[:, :, 2] + 1, 0, 255)
        ket_qua = Image.fromarray(arr.astype(np.uint8), mode="RGB").convert("RGBA")
        ket_qua.putalpha(alpha)

        assert _do_lo_chu_the(master, ket_qua, alpha) == 0.0

    def test_mat_na_rong_la_tu_choi_chu_khong_phai_diem_dep(self):
        master = _anh_mau()
        alpha_rong = Image.new("L", master.size, 0)
        ket_qua = master.copy().convert("RGBA")

        assert _do_lo_chu_the(master, ket_qua, alpha_rong) == 0.0


class TestDongKhung:
    @pytest.mark.parametrize("ratio", list(RATIO_PRESETS))
    def test_dung_kich_thuoc_tung_ty_le(self, ratio: str):
        khung = _dong_khung(_anh_mau(300, 200), ratio)
        assert khung.size == RATIO_PRESETS[ratio]

    def test_dem_chu_khong_cat_nen_giu_tron_bo_hoa(self):
        """Ảnh rất ngang đưa về 9:16 phải còn nguyên chiều ngang, chỉ thêm đệm."""
        goc = _anh_mau(400, 100)
        khung = _dong_khung(goc, "9:16")
        rong, cao = RATIO_PRESETS["9:16"]
        assert khung.size == (rong, cao)
        # Tỷ lệ cạnh của phần ảnh thật giữ nguyên: cao/rộng gốc = 1/4.
        ty_le_that = (goc.height / goc.width)
        cao_that = round(rong * ty_le_that)
        giua = np.array(khung.convert("RGB"))[cao // 2]
        # Hàng giữa phải là ảnh thật trên toàn chiều rộng, không phải đệm.
        assert cao_that > 0
        assert not np.all(giua == giua[0])

    def test_giu_kenh_alpha_cho_ban_tach_nen(self):
        rgba = _anh_mau(120, 120).convert("RGBA")
        rgba.putalpha(_mat_na(120, 120))
        khung = _dong_khung(rgba, "1:1")
        assert khung.mode == "RGBA"
        # Góc khung phải trong suốt — đó là điều làm nên bản PNG tách nền.
        assert khung.getpixel((0, 0))[3] == 0


class TestXuatTep:
    def test_con_alpha_thi_xuat_png(self):
        rgba = _anh_mau(60, 60).convert("RGBA")
        data, mime, duoi = _sang_bytes(rgba)
        assert mime == "image/png" and duoi == "png"
        assert Image.open(BytesIO(data)).mode == "RGBA"

    def test_nen_dac_thi_xuat_jpeg(self):
        data, mime, duoi = _sang_bytes(_anh_mau(60, 60))
        assert mime == "image/jpeg" and duoi == "jpg"
        assert Image.open(BytesIO(data)).mode == "RGB"


class TestMatNaIOPaint:
    """`_mat_na_iopaint` (nợ #104, tiếp #78) — dựng `product_mask` từ CHÍNH
    alpha đã có, không chạy segmentation lần hai."""

    def test_loi_la_0_con_lai_la_255(self):
        alpha = _mat_na(120, 120)
        mask_bytes = _mat_na_iopaint(alpha)
        mask = Image.open(BytesIO(mask_bytes))

        assert mask.mode == "L"
        assert mask.size == alpha.size
        arr = np.array(mask)
        # Tâm hình tròn (chắc chắn trong lõi đã co-biên) phải là 0.
        assert arr[60, 60] == 0
        # Góc ảnh (chắc chắn ngoài chủ thể) phải là 255.
        assert arr[0, 0] == 255

    def test_khong_co_chu_the_thi_toan_255(self):
        alpha_rong = Image.new("L", (80, 80), 0)
        mask = Image.open(BytesIO(_mat_na_iopaint(alpha_rong)))
        assert np.all(np.array(mask) == 255)


class TestDanLaiChuThe:
    """`_dan_lai_chu_the` (nợ #104) — belt-and-suspenders, dán đúng vị trí."""

    def test_dan_dung_vi_tri_giu_nguyen_pixel(self):
        chu_the = _anh_mau(100, 80).convert("RGBA")
        chu_the.putalpha(255)
        nen = Image.new("RGB", (300, 240), color=(200, 200, 200))
        offset = (50, 40)

        ket_qua = _dan_lai_chu_the(nen, chu_the, offset)

        assert ket_qua.size == nen.size
        vung_dan = np.array(ket_qua.convert("RGB"))[40:120, 50:150]
        vung_goc = np.array(chu_the.convert("RGB"))
        assert np.array_equal(vung_dan, vung_goc)
        # Ngoài vùng dán vẫn là nền cũ, không bị đụng vào.
        assert tuple(np.array(ket_qua.convert("RGB"))[0, 0]) == (200, 200, 200)


class TestDungBienTheVoiExpander:
    """Tích hợp `dung_bien_the()` ↔ một `ImageExpander` giả lập (nợ #104) —
    khoá đúng đường nối product_mask → expand() → paste-back → dong_khung,
    không cần IOPaint/GPU thật."""

    class _ExpanderGiaLap:
        name = "gia_lap"
        model_version = "gia_lap-v1"

        def __init__(self) -> None:
            self.muc_dung_lan_cuoi: object | None = None
            self.nhan_duoc_product_mask = False

        def expand(self, image: bytes, ratio: str, product_mask: bytes | None = None):
            self.nhan_duoc_product_mask = product_mask is not None
            rong, cao = RATIO_PRESETS[ratio]
            nen = Image.new("RGB", (rong, cao), color=(9, 9, 9))
            buf = BytesIO()
            nen.save(buf, format="PNG")

            goc = Image.open(BytesIO(image))
            dem_trai = (rong - goc.width) // 2
            dem_tren = (cao - goc.height) // 2
            self.muc_dung_lan_cuoi = object()

            return {
                "image": buf.getvalue(),
                "generated_flags": {"generative_fill_used": True, "requires_reshoot_warning": False},
                "parameters": {"paste_offset": [dem_trai, dem_tren]},
            }

    def test_paste_offset_duoc_dung_de_dan_lai_chu_the(self, monkeypatch):
        gia_lap = self._ExpanderGiaLap()
        monkeypatch.setattr(
            "media_ai.jobs.variant_worker.resolve_expander", lambda ten: gia_lap
        )

        master = _anh_mau(200, 150)
        # Cố định mặt nạ chủ thể (25/09/2026): ca này khoá đường nối expander →
        # paste-back, không khoá chất lượng tách nền. Để mô hình thật tách một
        # ảnh nhiễu thì kết quả phụ thuộc mô hình mặc định — từ khi mặc định
        # đổi sang `isnet-general-use` (Đợt 3), mặt nạ của ảnh nhiễu gần rỗng
        # (alpha tối đa ~69), dán lại chỉ là điểm ảnh trong suốt và ca đỏ dù
        # paste-back chạy đúng.
        alpha = _mat_na(200, 150)
        rgba = master.convert("RGBA")
        rgba.putalpha(alpha)
        monkeypatch.setattr(
            "media_ai.jobs.variant_worker._doan_chu_the_tho", lambda *_a, **_k: (rgba, alpha)
        )
        buf = BytesIO()
        master.convert("RGB").save(buf, format="PNG")

        bien_the, do_trung, expander_dung = dung_bien_the(
            buf.getvalue(),
            preset="studio_white",
            ratio="1:1",
            watermark=False,
            logo_bytes=None,
            ten_tiem=None,
            expand_provider="gia_lap",
            # Mở rộng khung chỉ có nghĩa ở chế độ đệm cũ; `full_frame` (mặc định
            # từ 24/09/2026) dựng khung đúng tỉ lệ nên không cần expander.
            fill_mode="pad",
        )

        styled = next(b for b in bien_the if b["key"] == "styled")
        assert styled["image"].size == RATIO_PRESETS["1:1"]
        # Engine giả lập nhận được product_mask (đúng ImageExpander mới).
        assert gia_lap.nhan_duoc_product_mask is True
        # Chạy thật (không tự lùi về Pad) — expander_dung phải khác None.
        assert expander_dung is gia_lap
        # Vùng đã dán lại KHÔNG còn là nền phẳng (9,9,9) của engine giả lập
        # — nếu paste-back không chạy, cả khung sẽ toàn màu (9,9,9).
        arr = np.array(styled["image"].convert("RGB"))
        rong, cao = RATIO_PRESETS["1:1"]
        giua = arr[cao // 2, rong // 2]
        assert tuple(giua) != (9, 9, 9)


class TestAutoEnhance:
    """`_ap_dung_auto_enhance` (AIC-14, chốt 18/09: "Chỉ chỉnh phông nền")
    — cân bằng sáng/tương phản KHÔNG được đụng một pixel nào của chủ thể."""

    def test_chu_the_giu_nguyen_pixel_tuyet_doi_sau_khi_tang_sang(self):
        chu_the = _anh_mau(100, 80).convert("RGBA")
        chu_the.putalpha(_mat_na(100, 80))
        # Nền phẳng tương phản thấp — chắc chắn autocontrast phải đổi nó.
        nen = Image.new("RGB", (100, 80), color=(120, 120, 120)).convert("RGBA")
        nen.putalpha(255)

        ket_qua = _ap_dung_auto_enhance(nen, chu_the)

        assert ket_qua.mode == "RGB"
        assert ket_qua.size == nen.size

        mask = np.array(chu_the.split()[3]) > 0
        vung_ket_qua = np.array(ket_qua.convert("RGB"))[mask]
        vung_goc = np.array(chu_the.convert("RGB"))[mask]
        assert np.array_equal(vung_ket_qua, vung_goc)

    def test_nen_thuc_su_doi_khi_bat_auto_enhance(self):
        # Nền dải xám hẹp (100–150) — autocontrast phải kéo dải ra rộng hơn.
        dai = np.linspace(100, 150, 80, dtype=np.uint8)
        arr = np.tile(dai, (80, 1))
        nen_hep = Image.fromarray(np.stack([arr, arr, arr], axis=-1), mode="RGB").convert("RGBA")
        nen_hep.putalpha(255)
        # Chủ thể rỗng (alpha toàn 0) — không dán gì đè lên, đo nguyên nền.
        chu_the_rong = Image.new("RGBA", (80, 80), (0, 0, 0, 0))

        ket_qua = _ap_dung_auto_enhance(nen_hep, chu_the_rong)

        arr_ket_qua = np.array(ket_qua.convert("L"))
        assert int(arr_ket_qua.max()) - int(arr_ket_qua.min()) > (150 - 100)


class _SegmenterGiaLap:
    """Thay `RembgSegmenter` thật (mô hình nặng) bằng một phép tách giả —
    ca thử ở đây khoá HÀNH VI CACHE của `_doan_chu_the`, không khoá chất
    lượng segmentation (đã có `RembgSegmenter` thật kiểm ở nơi khác)."""

    def __init__(self, model_name: str = "bria-rmbg") -> None:
        pass

    def extract_subject(self, master_rgb: Image.Image):
        _SO_LAN_TACH["n"] += 1
        rgba = master_rgb.convert("RGBA")
        alpha = Image.new("L", master_rgb.size, 255)
        return rgba, alpha


class _EdgeDefringerGiaLap:
    def __init__(self, *args, **kwargs) -> None:
        pass

    def defringe(self, rgba: Image.Image) -> Image.Image:
        return rgba


_SO_LAN_TACH = {"n": 0}


class TestDoanChuThe:
    """`_doan_chu_the` (nợ #108) — cache tách chủ thể theo đĩa, khoá bằng
    `master_asset_id`, cho một lượt chạy lô nhiều tổ hợp preset×ratio trên
    CÙNG một Master Image."""

    def setup_method(self):
        _SO_LAN_TACH["n"] = 0

    def _gia_lap(self, monkeypatch):
        monkeypatch.setattr("media_ai.jobs.variant_worker.RembgSegmenter", _SegmenterGiaLap)
        monkeypatch.setattr("media_ai.jobs.variant_worker.EdgeDefringer", _EdgeDefringerGiaLap)

    def test_khong_cache_khi_thieu_tham_so(self, monkeypatch):
        self._gia_lap(monkeypatch)
        master = _anh_mau(40, 40)

        _doan_chu_the(master, None, None)
        _doan_chu_the(master, None, None)

        assert _SO_LAN_TACH["n"] == 2

    def test_cache_khi_du_master_asset_id_va_cache_dir(self, monkeypatch, tmp_path):
        self._gia_lap(monkeypatch)
        master = _anh_mau(40, 40)

        rgba1, _ = _doan_chu_the(master, "asset-abc", tmp_path)
        rgba2, _ = _doan_chu_the(master, "asset-abc", tmp_path)

        assert _SO_LAN_TACH["n"] == 1
        assert np.array_equal(np.array(rgba1.convert("RGBA")), np.array(rgba2.convert("RGBA")))

    def test_master_khac_nhau_khong_dung_chung_cache(self, monkeypatch, tmp_path):
        self._gia_lap(monkeypatch)
        master = _anh_mau(40, 40)

        _doan_chu_the(master, "asset-abc", tmp_path)
        _doan_chu_the(master, "asset-khac", tmp_path)

        assert _SO_LAN_TACH["n"] == 2


class _SegmenterTreoGiaLap:
    """Mô phỏng rembg/onnxruntime bị kẹt (nợ #112) — `extract_subject` ngủ
    lâu hơn hạn giờ để khoá đúng hành vi: quá hạn phải ném `TimeoutError`
    rõ ràng, không được treo vô thời hạn."""

    def __init__(self, model_name: str = "bria-rmbg") -> None:
        pass

    def extract_subject(self, master_rgb: Image.Image):
        time.sleep(5)
        rgba = master_rgb.convert("RGBA")
        alpha = Image.new("L", master_rgb.size, 255)
        return rgba, alpha


class TestDoanChuTheTimeout:
    """`_doan_chu_the` (nợ #112, 18/09) — hạn giờ cho bước tách chủ thể."""

    def test_qua_han_nem_timeout_error_ro_rang(self, monkeypatch):
        monkeypatch.setattr("media_ai.jobs.variant_worker.RembgSegmenter", _SegmenterTreoGiaLap)
        monkeypatch.setattr("media_ai.jobs.variant_worker.EdgeDefringer", _EdgeDefringerGiaLap)
        monkeypatch.setenv("VARIANT_SEGMENTATION_TIMEOUT_SECONDS", "1")
        master = _anh_mau(40, 40)

        with pytest.raises(TimeoutError, match="vượt quá 1 giây"):
            _doan_chu_the(master, None, None)

    def test_khong_qua_han_van_tra_ket_qua_binh_thuong(self, monkeypatch):
        monkeypatch.setattr("media_ai.jobs.variant_worker.RembgSegmenter", _SegmenterGiaLap)
        monkeypatch.setattr("media_ai.jobs.variant_worker.EdgeDefringer", _EdgeDefringerGiaLap)
        monkeypatch.setenv("VARIANT_SEGMENTATION_TIMEOUT_SECONDS", "5")
        master = _anh_mau(40, 40)

        rgba, alpha = _doan_chu_the(master, None, None)

        assert rgba.size == master.size


def test_lo_i_alpha_254_cua_mo_hinh_tach_nen_van_duoc_dan_nguyen_khoi(monkeypatch):
    """Hồi quy 24/09/2026: `bria-rmbg` trả alpha lõi ≈ 254 (ảnh thật: 506.601
    điểm 254, 3.256 điểm 255). Trước khi chốt lõi đặc, 1/255 màu phông lọt vào
    mọi điểm lõi và cổng chấm ~0,82 → TỪ CHỐI mọi biến thể thật. Mẫu thử cũ
    dùng alpha 255 nên không bắt được."""
    from media_ai.jobs import variant_worker as vw

    master = _anh_mau(240, 240)
    a = np.zeros((240, 240), dtype=np.uint8)
    a[40:200, 40:200] = 254  # lõi "gần đặc" như mô hình thật trả về
    a[36:40, 40:200] = 120  # viền mềm
    alpha = Image.fromarray(a, mode="L")
    rgba = master.convert("RGBA")
    rgba.putalpha(alpha)
    monkeypatch.setattr(vw, "_doan_chu_the_tho", lambda *_a, **_k: (rgba, alpha))

    buf = BytesIO()
    master.save(buf, format="PNG")
    _bien_the, do_trung, _ = dung_bien_the(buf.getvalue(), "luxury_hotel", "1:1", False, None, None)
    assert do_trung >= NGUONG_TU_CHOI
    assert do_trung == 1.0


def test_than_hoa_ban_trong_suot_duoc_lam_dac_bang_diem_anh_goc(monkeypatch):
    """Hồi quy 24/09/2026 ("ảnh sản phẩm bị xoá nhoà"): mô hình tách nền trả
    ~75% đầu hoa ở alpha 128–244. Trước bản sửa, `EdgeDefringer` tô đè cả vùng
    đó và khi ghép thì phông lọt qua thân hoa, còn cổng chỉ đo phần alpha ≥ 250
    nên vẫn báo 100%. Nay thân (alpha ≥ 128) phải được dán NGUYÊN điểm ảnh gốc."""
    from media_ai.jobs import variant_worker as vw

    master = _anh_mau(240, 240)
    a = np.zeros((240, 240), dtype=np.uint8)
    a[30:210, 30:210] = 180  # thân "không chắc" như bria-rmbg trả về
    a[26:30, 30:210] = 60
    alpha = Image.fromarray(a, mode="L")
    rgba = master.convert("RGBA")
    rgba.putalpha(alpha)
    monkeypatch.setattr(vw, "_doan_chu_the_tho", lambda *_a, **_k: (rgba, alpha))

    buf = BytesIO()
    master.save(buf, format="PNG")
    bien_the, do_trung, _ = dung_bien_the(buf.getvalue(), "luxury_hotel", "1:1", False, None, None)
    assert do_trung == 1.0

    # Giữa thân hoa phải đúng điểm ảnh gốc, không bị pha màu phông.
    rgba_dac, alpha_dac = vw._doan_chu_the(master, None, None)
    assert np.array(alpha_dac)[120, 120] == 255
    assert tuple(np.array(rgba_dac)[120, 120, :3]) == tuple(np.array(master)[120, 120])


def test_cong_tu_choi_khi_loi_do_qua_nho_so_voi_san_pham():
    """Lõi đo chỉ phủ một phần nhỏ sản phẩm = không kiểm được → không được báo đạt."""
    master = _anh_mau(240, 240)
    a = np.zeros((240, 240), dtype=np.uint8)
    a[20:220, 20:220] = 200  # thân rộng, bán trong suốt
    a[100:130, 100:130] = 255  # lõi đặc rất nhỏ
    alpha = Image.fromarray(a, mode="L")
    assert _do_lo_chu_the(master, master.convert("RGBA"), alpha) < NGUONG_TU_CHOI
