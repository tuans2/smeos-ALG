"""Test cho `VisionIdentityVerifier` — phần thực thi `YC-N4` (cùng provider,
cùng model version cho cả hai lượt phân tích của một job) và
`PassthroughEnhancer`.

Provider giả, không gọi mạng.
"""

import pytest

from media_ai.guard.compare import REJECTED, SAFE
from media_ai.guard.verifier import VisionIdentityVerifier
from media_ai.providers.enhancement.passthrough import PassthroughEnhancer


def phan_tich_mau(category="Bó hoa"):
    return {
        "identity": {
            "category": category,
            "shape": "Tròn",
            "facing": "Một mặt",
            "container": "Giấy gói",
        },
        "bom": {"flowers": [{"name": "Cẩm chướng", "color": "Hồng đậm", "quantity": 30}]},
    }


class AnalyzerGia:
    """Trả kết quả theo byte ảnh — đủ để phân biệt 'ảnh gốc' với 'ảnh khác'."""

    def __init__(self, name="gia", model_version="v1"):
        self.name = name
        self.model_version = model_version
        self.so_luot = 0

    def analyze(self, image: bytes, context: dict) -> dict:
        self.so_luot += 1
        if image == b"anh-da-bi-doi-san-pham":
            return phan_tich_mau(category="Giỏ hoa")
        return phan_tich_mau()


class TestPassthrough:
    def test_tra_dung_byte_dua_vao(self):
        anh = b"byte-anh-goc"
        ra = PassthroughEnhancer().enhance(anh, {})
        assert ra["image"] is anh

    def test_khai_ro_khong_sinh_anh(self):
        # `YC-A5` — không mặc định ngầm. Ảnh không qua khâu sinh nào thì phải
        # nói ra là `false`, không phải để trống.
        flags = PassthroughEnhancer().enhance(b"x", {})["generated_flags"]
        assert flags == {"generative_fill_used": False, "requires_reshoot_warning": False}


class TestRangBuocCungProvider:
    def test_hai_luot_dung_dung_mot_instance_provider(self):
        # Đây là cách `YC-N4` được bảo đảm: verifier giữ MỘT analyzer, cả
        # lượt trước lẫn lượt sau đều đi qua nó. Không có đường nào truyền
        # vào một provider thứ hai.
        analyzer = AnalyzerGia()
        v = VisionIdentityVerifier(analyzer=analyzer)

        truoc = v.phan_tich(b"anh-goc", {})
        v.compare(truoc, b"anh-goc", {})

        assert analyzer.so_luot == 2

    def test_ghi_lai_thuoc_do_da_dung(self):
        v = VisionIdentityVerifier(analyzer=AnalyzerGia(name="openai", model_version="gpt-x"))
        khoi = v.compare(phan_tich_mau(), b"anh-goc")
        assert khoi["provider"] == "openai"
        assert khoi["model_version"] == "gpt-x"

    def test_analyzer_khong_khai_ten_van_khong_vo(self):
        class Tho:
            def analyze(self, image, context):
                return phan_tich_mau()

        khoi = VisionIdentityVerifier(analyzer=Tho()).compare(phan_tich_mau(), b"x")
        assert khoi["provider"] == "khong-ro"
        assert khoi["model_version"] == "khong-ro"


class TestPassthroughQuaCong:
    def test_khong_sua_pixel_thi_guard_phai_noi_safe(self):
        """Phép thử có đáp án biết trước — lý do `PassthroughEnhancer` tồn tại."""
        analyzer = AnalyzerGia()
        v = VisionIdentityVerifier(analyzer=analyzer)
        anh = b"anh-goc"

        truoc = v.phan_tich(anh, {})
        ra_tang_cuong = PassthroughEnhancer().enhance(anh, {})
        khoi = v.compare(truoc, ra_tang_cuong["image"], {})

        assert khoi["result"] == SAFE
        assert khoi["identity_score"] == 1.0
        assert khoi["color_score"] == 1.0
        assert khoi["geometry_score"] == 1.0
        assert khoi["component_consistency"] == 1.0
        assert khoi["ly_do"] == []

    def test_anh_bi_doi_san_pham_thi_guard_chan(self):
        v = VisionIdentityVerifier(analyzer=AnalyzerGia())
        truoc = v.phan_tich(b"anh-goc", {})
        khoi = v.compare(truoc, b"anh-da-bi-doi-san-pham", {})
        assert khoi["result"] == REJECTED
        assert any("Phân loại đổi" in ly for ly in khoi["ly_do"])
