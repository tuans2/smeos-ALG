"""Enhancer nhà cung cấp M04a — Photoroom & fal (25/09/2026).

Khoá ba điều: (1) gửi đúng tham số cho từng năng lực người dùng chọn,
(2) năng lực nhà cung cấp không có thì ghi `bo_qua`, không âm thầm bỏ,
(3) mọi lỗi nhà cung cấp → lùi luồng cục bộ (`StudioEnhancer`) và GHI RÕ lý do.
"""

from io import BytesIO

import httpx
import pytest
from PIL import Image

from media_ai.providers.enhancement import _cloud_common
from media_ai.providers.enhancement.fal_enhancer import FalEnhancer
from media_ai.providers.enhancement.photoroom_enhancer import ENDPOINT, PhotoroomEnhancer
from media_ai.providers.enhancement.router import resolve_enhancer
from media_ai.providers.scene.base import SceneProviderError, SceneResult


def _jpeg(size=(64, 48), color=(200, 30, 60)) -> bytes:
    buf = BytesIO()
    Image.new("RGB", size, color).save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture(autouse=True)
def cuc_bo_gia(monkeypatch):
    """Luồng cục bộ thật nạp rembg — thay bằng bản ghi nhận để test nhanh, không mạng."""
    goi: list = []

    class StudioGia:
        def enhance(self, image, config):
            goi.append(config)
            return {"image": image, "generated_flags": {}, "parameters": {"provider": "studio"}}

    import media_ai.providers.enhancement.studio_enhancer as se

    monkeypatch.setattr(se, "StudioEnhancer", StudioGia)
    return goi


def test_router_nhan_ma_giao_dien():
    assert isinstance(resolve_enhancer({"enhancer_provider": "photoroom"}), PhotoroomEnhancer)
    assert isinstance(resolve_enhancer({"enhancer_provider": "fal_flux"}), FalEnhancer)
    assert isinstance(resolve_enhancer({"enhancer_provider": "fal"}), FalEnhancer)


# ── Photoroom ───────────────────────────────────────────────────────────────


def _pr_client(bat: list, status=200, content=None):
    def xu_ly(req: httpx.Request) -> httpx.Response:
        bat.append(req)
        if status != 200:
            return httpx.Response(status, text="quota exceeded")
        return httpx.Response(200, content=content or _jpeg((64, 48), (250, 250, 250)), headers={"content-type": "image/jpeg"})

    return httpx.Client(transport=httpx.MockTransport(xu_ly))


def test_photoroom_gui_du_tham_so_va_ghi_bo_qua():
    bat: list = []
    res = PhotoroomEnhancer(api_key="k", client=_pr_client(bat)).enhance(_jpeg(), {})
    req = bat[0]
    assert str(req.url) == ENDPOINT and req.headers["x-api-key"] == "k"
    body = req.read().decode("latin-1")
    for truong, gia_tri in [
        ("removeBackground", "true"), ("background.color", "FFFFFF"), ("shadow.mode", "ai.soft"),
        ("lighting.mode", "ai.auto"), ("upscale.mode", "ai.fast"),
        ("referenceBox", "originalImage"), ("outputSize", "originalImage"),
    ]:
        assert f'name="{truong}"\r\n\r\n{gia_tri}' in body
    assert 'name="imageFile"' in body
    p = res["parameters"]
    assert p["fallback"] is False and p["provider"] == "photoroom"
    assert p["bo_qua"] == ["remove_watermark"]
    assert Image.open(BytesIO(res["image"])).format == "JPEG"


def test_photoroom_khong_chon_tach_nen_thi_giu_nen():
    bat: list = []
    PhotoroomEnhancer(api_key="k", client=_pr_client(bat)).enhance(
        _jpeg(), {"mode": "custom", "selected_capabilities": ["enhance_lighting"]}
    )
    body = bat[0].read().decode("latin-1")
    assert 'name="removeBackground"\r\n\r\nfalse' in body
    assert "background.color" not in body and "upscale.mode" not in body


def test_photoroom_thieu_khoa_lui_cuc_bo_ghi_ly_do(cuc_bo_gia):
    res = PhotoroomEnhancer(api_key="").enhance(_jpeg(), {})
    assert res["parameters"]["fallback"] is True
    assert "PHOTOROOM_API_KEY" in res["parameters"]["fallback_reason"]
    assert res["parameters"]["requested_provider"] == "photoroom"
    assert len(cuc_bo_gia) == 1


def test_photoroom_http_loi_lui_cuc_bo(cuc_bo_gia):
    res = PhotoroomEnhancer(api_key="k", client=_pr_client([], status=402)).enhance(_jpeg(), {})
    assert res["parameters"]["fallback"] is True and "HTTP 402" in res["parameters"]["fallback_reason"]


def test_photoroom_anh_hong_lui_cuc_bo(cuc_bo_gia):
    res = PhotoroomEnhancer(api_key="k", client=_pr_client([], content=b"not-an-image")).enhance(_jpeg(), {})
    assert res["parameters"]["fallback"] is True and "không đọc được" in res["parameters"]["fallback_reason"]


# ── fal ─────────────────────────────────────────────────────────────────────


class FalGia:
    def __init__(self, khoa=True, loi_o=None):
        self.khoa, self.loi_o, self.goi = khoa, loi_o, []

    def co_khoa(self):
        return self.khoa

    def tach_nen(self, anh):
        self.goi.append("tach_nen")
        if self.loi_o == "tach_nen":
            raise SceneProviderError("HTTP 403")
        return Image.new("L", anh.size, 255)

    def dung_canh(self, req):
        self.goi.append(("dung_canh", req.rong, req.cao, req.quality))
        return SceneResult(anh=Image.new("RGB", (req.rong, req.cao), (240, 240, 240)), prompt="p", seed=None,
                           model_version="bria", bo_qua=["seed"] if req.seed is not None else [])

    def tang_net(self, anh, he_so):
        self.goi.append(("tang_net", he_so))
        if self.loi_o == "tang_net":
            raise SceneProviderError("hết credit")
        return anh.resize((anh.width * he_so, anh.height * he_so))


def test_fal_lam_tron_cac_buoc():
    p = FalGia()
    res = FalEnhancer(provider=p).enhance(_jpeg((64, 48)), {})
    assert p.goi == ["tach_nen", ("dung_canh", 64, 48, "high"), ("tang_net", 2)]
    prm = res["parameters"]
    assert prm["fallback"] is False and prm["bo_qua"] == ["remove_watermark"]
    assert Image.open(BytesIO(res["image"])).size == (128, 96)
    assert res["generated_flags"]["generative_fill_used"] is True


def test_fal_chi_tang_net_khi_chi_chon_tang_net():
    p = FalGia()
    FalEnhancer(provider=p).enhance(_jpeg(), {"mode": "custom", "selected_capabilities": ["upscale_clarity"]})
    assert p.goi == [("tang_net", 2)]


def test_fal_loi_giua_chung_lui_toan_bo_ve_cuc_bo(cuc_bo_gia):
    res = FalEnhancer(provider=FalGia(loi_o="tang_net")).enhance(_jpeg(), {})
    assert res["parameters"]["fallback"] is True and "hết credit" in res["parameters"]["fallback_reason"]
    assert len(cuc_bo_gia) == 1


def test_fal_thieu_khoa_lui_cuc_bo(cuc_bo_gia):
    res = FalEnhancer(provider=FalGia(khoa=False)).enhance(_jpeg(), {})
    assert "FAL_KEY" in res["parameters"]["fallback_reason"]


def test_lui_cuc_bo_giu_nguyen_config(cuc_bo_gia):
    cfg = {"mode": "custom", "selected_capabilities": ["remove_background"]}
    _cloud_common.lui_ve_cuc_bo(_jpeg(), cfg, "fal", "x")
    assert cuc_bo_gia == [cfg]
