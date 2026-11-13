"""Test cho `workers/media_ai/providers/chung.py` — phần đo chi phí thật của
M04a/M04b (nợ #71). Test thuần, không chạm Postgres/OpenAI.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from media_ai.providers.chung import (
    MucDungAnh,
    doc_muc_dung_anh,
    so_do_chi_phi_anh,
    tinh_cost_usd_anh,
)

GIA_MAU = {"gpt-image-1": {"text_vao": 5.0, "anh_vao": 10.0, "anh_ra": 40.0}}


def _response_gia(text_vao=100, anh_vao=200, anh_ra=300):
    return SimpleNamespace(
        usage=SimpleNamespace(
            input_tokens_details=SimpleNamespace(text_tokens=text_vao, image_tokens=anh_vao),
            output_tokens=anh_ra,
        )
    )


class TestDocMucDungAnh:
    def test_doc_dung_ba_truong_tach_rieng(self):
        muc_dung = doc_muc_dung_anh(_response_gia(100, 200, 300))
        assert muc_dung.text_vao == 100
        assert muc_dung.anh_vao == 200
        assert muc_dung.anh_ra == 300
        assert muc_dung.so_lan_goi == 1

    def test_khong_co_usage_thi_tra_rong_khong_bia(self):
        assert doc_muc_dung_anh(SimpleNamespace()) == MucDungAnh()

    def test_response_none_thi_cung_tra_rong(self):
        assert doc_muc_dung_anh(None) == MucDungAnh()


class TestTinhCostUsdAnh:
    def test_tinh_dung_theo_tung_loai_gia_khac_nhau(self):
        muc_dung = MucDungAnh(text_vao=1_000_000, anh_vao=1_000_000, anh_ra=1_000_000, so_lan_goi=1)
        assert tinh_cost_usd_anh("gpt-image-1", muc_dung, GIA_MAU) == 55.0

    def test_khong_co_gia_cho_model_thi_tra_none_khong_tra_khong(self):
        muc_dung = MucDungAnh(text_vao=100, anh_vao=100, anh_ra=100, so_lan_goi=1)
        assert tinh_cost_usd_anh("model-khong-ton-tai", muc_dung, GIA_MAU) is None

    def test_gop_hai_loai_input_khac_gia_khong_gop_thanh_mot_gia(self):
        """`text_vao` và `anh_vao` có giá KHÁC NHAU ($5 và $10/1M) — ca thử
        này bắt lỗi nếu ai đó lỡ gộp chung thành một cột rồi nhân một giá
        duy nhất, đúng cảnh báo trong docstring của module."""
        chi_tinh_text = tinh_cost_usd_anh(
            "gpt-image-1", MucDungAnh(text_vao=1_000_000, so_lan_goi=1), GIA_MAU
        )
        chi_tinh_anh = tinh_cost_usd_anh(
            "gpt-image-1", MucDungAnh(anh_vao=1_000_000, so_lan_goi=1), GIA_MAU
        )
        assert chi_tinh_text == 5.0
        assert chi_tinh_anh == 10.0


class TestSoDoChiPhiAnh:
    def test_provider_khong_co_thuoc_tinh_thi_tra_rong(self):
        """Studio/PIL/Passthrough — 100% cục bộ, không có `muc_dung_lan_cuoi`."""
        provider = SimpleNamespace(name="studio", model_version="studio-1")
        assert so_do_chi_phi_anh(provider) == {}

    def test_muc_dung_lan_cuoi_none_cung_tra_rong(self):
        """`None` nghĩa là "chưa tiêu tiền" (vừa reset đầu lượt, hoặc lùi PIL
        trước khi gọi thật) — khác hẳn "tiêu 0 đồng"."""
        provider = SimpleNamespace(name="openai", model_version="gpt-image-1", muc_dung_lan_cuoi=None)
        assert so_do_chi_phi_anh(provider) == {}

    def test_co_muc_dung_thi_tra_ca_muc_dung_va_cost(self, monkeypatch):
        import media_ai.providers.chung as chung

        monkeypatch.setattr(chung, "gia_token_anh", lambda: GIA_MAU)
        muc_dung = MucDungAnh(text_vao=1000, anh_vao=1000, anh_ra=1000, so_lan_goi=1)
        provider = SimpleNamespace(
            name="openai", model_version="gpt-image-1", muc_dung_lan_cuoi=muc_dung
        )

        ket_qua = so_do_chi_phi_anh(provider)

        assert ket_qua["muc_dung"] is muc_dung
        assert ket_qua["cost_usd"] == pytest.approx((5.0 + 10.0 + 40.0) * 1000 / 1_000_000)
