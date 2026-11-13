"""`tu_dong_can_bang_sang` (AIC-14) — hàm THUẦN, không biết gì về chủ thể/
mặt nạ. An toàn cho bó hoa đến từ CÁCH GỌI ở `variant_worker._ap_dung_auto_enhance`
(xem `test_variant_worker.py::TestAutoEnhance`), không phải từ chính hàm này."""

from __future__ import annotations

import numpy as np
import pytest
from PIL import Image

from media_ai.image.auto_retouch import tu_dong_can_bang_sang


def _anh_dai_xam_hep(w: int = 80, h: int = 80, thap: int = 100, cao: int = 150) -> Image.Image:
    dai = np.linspace(thap, cao, w, dtype=np.uint8)
    arr = np.tile(dai, (h, 1))
    return Image.fromarray(np.stack([arr, arr, arr], axis=-1), mode="RGB")


class TestTuDongCanBangSang:
    def test_keo_rong_dai_tuong_phan(self):
        anh = _anh_dai_xam_hep(thap=100, cao=150)
        ket_qua = tu_dong_can_bang_sang(anh, cutoff=0)

        arr = np.array(ket_qua.convert("L"))
        assert int(arr.max()) - int(arr.min()) > 50

    def test_giu_nguyen_kich_thuoc_va_mode_rgb(self):
        anh = _anh_dai_xam_hep()
        ket_qua = tu_dong_can_bang_sang(anh)
        assert ket_qua.size == anh.size
        assert ket_qua.mode == "RGB"

    def test_anh_rgba_giu_nguyen_kenh_alpha_khong_tinh_lai(self):
        anh = _anh_dai_xam_hep().convert("RGBA")
        mat_na = Image.new("L", anh.size, 0)
        mat_na.paste(255, (10, 10, 40, 40))
        anh.putalpha(mat_na)

        ket_qua = tu_dong_can_bang_sang(anh)

        assert ket_qua.mode == "RGBA"
        assert np.array_equal(np.array(ket_qua.split()[3]), np.array(mat_na))

    def test_cutoff_ngoai_khoang_nem_loi(self):
        anh = _anh_dai_xam_hep()
        with pytest.raises(ValueError):
            tu_dong_can_bang_sang(anh, cutoff=-1)
        with pytest.raises(ValueError):
            tu_dong_can_bang_sang(anh, cutoff=50)
