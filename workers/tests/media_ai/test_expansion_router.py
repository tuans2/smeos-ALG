"""Tests cho Expander Router & `ImageExpander` (AIC-13, nợ #78, 17/09).

Toàn bộ file này PHẢI chạy được KHÔNG cần `REPLICATE_API_TOKEN` thật — cùng
nguyên tắc với `test_enhancer_router.py::test_replicate_enhancer_fallback_without_token`:
lược đồ `bria/expand-image` chưa xác minh (xem docstring
`replicate_outpainter.py`), nên bài test duy nhất có thể viết một cách
đáng tin cậy ngay bây giờ là "không có token / lỗi mạng thì LÙI VỀ
`PadExpander`, không ném lỗi" — không phải "gọi đúng và ra ảnh đúng".
"""

from io import BytesIO

import pytest
from PIL import Image

from media_ai.image.ratio_frame import RATIO_PRESETS, dong_khung
from media_ai.providers.expansion.pad_expander import PadExpander
from media_ai.providers.expansion.replicate_outpainter import ANH_XA_TY_LE, ReplicateOutpainter
from media_ai.providers.expansion.router import DEFAULT_EXPANDER, resolve_expander


def _anh_mau_bytes(mode: str = "RGB", size: tuple[int, int] = (200, 150)) -> bytes:
    mau = (255, 0, 0) if mode == "RGB" else (255, 0, 0, 255)
    img = Image.new(mode, size, color=mau)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ─── Router ─────────────────────────────────────────────────────────────


def test_default_expander_is_pad():
    assert DEFAULT_EXPANDER == "pad"
    expander = resolve_expander(None)
    assert isinstance(expander, PadExpander)
    assert expander.name == "pad"


def test_resolve_expander_ten_khong_co_trong_registry_lui_ve_mac_dinh():
    expander = resolve_expander("mot-ten-khong-ton-tai")
    assert isinstance(expander, PadExpander)


def test_resolve_expander_replicate():
    expander = resolve_expander("replicate_bria_expand_image")
    assert isinstance(expander, ReplicateOutpainter)
    assert expander.model_version == "bria/expand-image"


def test_resolve_expander_tra_instance_moi_moi_lan():
    # Không giữ instance dùng chung — `muc_dung_lan_cuoi` không được lẫn
    # giữa hai job (nợ #71).
    a = resolve_expander("replicate_bria_expand_image")
    b = resolve_expander("replicate_bria_expand_image")
    assert a is not b


# ─── PadExpander ────────────────────────────────────────────────────────


def test_pad_expander_dung_kich_thuoc_preset():
    expander = PadExpander()
    for ratio, (rong, cao) in RATIO_PRESETS.items():
        ket_qua = expander.expand(_anh_mau_bytes(), ratio)
        anh_ra = Image.open(BytesIO(ket_qua["image"]))
        assert anh_ra.size == (rong, cao)


def test_pad_expander_khong_sinh_noi_dung_moi():
    expander = PadExpander()
    ket_qua = expander.expand(_anh_mau_bytes(), "1:1")
    assert ket_qua["generated_flags"]["generative_fill_used"] is False


def test_pad_expander_khong_co_muc_dung_lan_cuoi():
    # `so_do_chi_phi_luot` (`providers/chung.py`) đọc thuộc tính này qua
    # `getattr(..., None)` — `PadExpander` không đặt nó, đúng ý "cục bộ,
    # không tiêu tiền nhà cung cấp nào".
    expander = PadExpander()
    assert getattr(expander, "muc_dung_lan_cuoi", None) is None


# ─── ReplicateOutpainter — luôn lùi về Pad khi không có token/lỗi ──────


def test_replicate_outpainter_lui_ve_pad_khi_thieu_token():
    expander = ReplicateOutpainter(api_token=None)
    ket_qua = expander.expand(_anh_mau_bytes(), "9:16")
    anh_ra = Image.open(BytesIO(ket_qua["image"]))
    assert anh_ra.size == RATIO_PRESETS["9:16"]
    # Lùi về Pad thật sự — không sinh nội dung mới.
    assert ket_qua["generated_flags"]["generative_fill_used"] is False
    assert expander.muc_dung_lan_cuoi is None


def test_replicate_outpainter_lui_ve_pad_khi_api_loi(monkeypatch):
    expander = ReplicateOutpainter(api_token="token-gia-de-test")

    def _goi_loi(self, image, aspect_ratio):
        raise RuntimeError("giả lập lỗi mạng/schema")

    monkeypatch.setattr(ReplicateOutpainter, "_goi_predictions", _goi_loi)

    ket_qua = expander.expand(_anh_mau_bytes(), "1:1")
    anh_ra = Image.open(BytesIO(ket_qua["image"]))
    assert anh_ra.size == RATIO_PRESETS["1:1"]
    assert ket_qua["generated_flags"]["generative_fill_used"] is False
    assert expander.muc_dung_lan_cuoi is None


def test_replicate_outpainter_reset_muc_dung_dau_moi_luot():
    # Nợ #71: instance có thể tái dùng qua nhiều job — số của lượt TRƯỚC
    # không được lọt sang lượt sau. Không có token nên cả hai lượt đều lùi
    # về Pad, nhưng thuộc tính vẫn phải bị reset đầu MỖI lượt gọi.
    expander = ReplicateOutpainter(api_token=None)
    expander.muc_dung_lan_cuoi = "gia-tri-cu-con-sot-lai"  # type: ignore[assignment]
    expander.expand(_anh_mau_bytes(), "1:1")
    assert expander.muc_dung_lan_cuoi is None


def test_anh_xa_ty_le_khong_co_4_5():
    # `bria/expand-image` không có `4:5` trong enum `aspect_ratio` (xác
    # nhận qua mã nguồn Space bọc ngoài, KHÔNG phải lược đồ gốc — xem
    # docstring `replicate_outpainter.py`). `4:5` phải được ánh xạ sang một
    # giá trị KHÁC ratio gốc — nếu ai đó "sửa" cho khớp thì test này vỡ,
    # đúng ý định: buộc phải sửa lại docstring/ghi chú xấp xỉ cùng lúc.
    assert "4:5" in ANH_XA_TY_LE
    assert ANH_XA_TY_LE["4:5"] != "4:5"
    for ratio in ("1:1", "9:16", "16:9"):
        assert ANH_XA_TY_LE[ratio] == ratio


# ─── `ratio_frame` — vẫn đúng sau khi tách khỏi `variant_worker.py` ─────


def test_dong_khung_giu_ty_le_khong_cat():
    anh = Image.new("RGB", (300, 100), color=(10, 20, 30))
    da_dong = dong_khung(anh, "1:1")
    assert da_dong.size == RATIO_PRESETS["1:1"]


def test_dong_khung_ratio_khong_ro_lui_ve_1_1():
    anh = Image.new("RGB", (50, 50), color=(0, 0, 0))
    da_dong = dong_khung(anh, "ratio-khong-ton-tai")
    assert da_dong.size == RATIO_PRESETS["1:1"]
