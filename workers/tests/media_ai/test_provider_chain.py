"""Nhà cung cấp trước, cục bộ chỉ là đường lùi (PO 25/09/2026) — chuỗi M04a + Gemini Image."""

import base64
import json
from io import BytesIO

import httpx
import pytest
from PIL import Image

from media_ai.providers.enhancement._cloud_common import NhaCungCapLoi
from media_ai.providers.enhancement.chain import ProviderChainEnhancer
from media_ai.providers.enhancement.imagen_enhancer import ImagenEnhancer
from media_ai.providers.enhancement.router import resolve_enhancer
from media_ai.providers.google.gemini_image import GeminiImageClient
from media_ai.providers.scene.base import SceneRequest
from media_ai.providers.scene.imagen_scene import ImagenSceneProvider
from media_ai.providers.scene.registry import thu_tu_nha_cung_cap


def _jpeg(size=(40, 30)) -> bytes:
    buf = BytesIO()
    Image.new("RGB", size, (200, 20, 60)).save(buf, format="JPEG")
    return buf.getvalue()


def _png_b64(size=(40, 30)) -> str:
    buf = BytesIO()
    Image.new("RGB", size, (250, 250, 250)).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


@pytest.fixture(autouse=True)
def cuc_bo_gia(monkeypatch):
    goi: list = []

    class StudioGia:
        def enhance(self, image, config):
            goi.append(config)
            return {"image": image, "generated_flags": {}, "parameters": {"provider": "studio"}}

    import media_ai.providers.enhancement.studio_enhancer as se

    monkeypatch.setattr(se, "StudioEnhancer", StudioGia)
    return goi


class Ben:
    def __init__(self, name, loi=None, tu_lui=False):
        self.name, self.model_version, self.loi, self.tu_lui, self.goi = name, f"{name}-v1", loi, tu_lui, 0

    def enhance(self, image, config):
        self.goi += 1
        if self.loi:
            raise NhaCungCapLoi(self.name, self.loi)
        return {"image": image, "generated_flags": {}, "parameters": {"provider": self.name, "fallback": self.tu_lui, "fallback_reason": "PIL"}}


def test_router_co_provider_order_thi_dung_chuoi():
    e = resolve_enhancer({"provider_order": ["photoroom", "imagen"], "enhancer_provider": "studio"})
    assert isinstance(e, ProviderChainEnhancer) and e.order == ["photoroom", "imagen"]


def test_chuoi_bo_ben_loi_dung_ben_ke_tiep_va_ghi_ten_ben_that(cuc_bo_gia):
    bang = {"photoroom": Ben("photoroom", loi="HTTP 402"), "openai": Ben("openai", tu_lui=True), "imagen": Ben("imagen")}
    chuoi = ProviderChainEnhancer(["photoroom", "openai", "imagen"], dung=lambda k: bang[k])
    res = chuoi.enhance(_jpeg(), {})
    assert res["parameters"]["provider"] == "imagen"
    assert [t["provider"] for t in res["parameters"]["provider_attempts"]] == ["photoroom", "openai", "imagen"]
    assert chuoi.name == "imagen" and chuoi.model_version == "imagen-v1"
    assert cuc_bo_gia == []  # KHÔNG chạy cục bộ khi còn bên làm được


def test_moi_ben_loi_thi_lui_cuc_bo_mot_lan_va_ghi_ly_do(cuc_bo_gia):
    bang = {"photoroom": Ben("photoroom", loi="Thiếu PHOTOROOM_API_KEY"), "fal_flux": Ben("fal_flux", loi="Thiếu FAL_KEY")}
    chuoi = ProviderChainEnhancer(["photoroom", "fal_flux"], dung=lambda k: bang[k])
    res = chuoi.enhance(_jpeg(), {})
    p = res["parameters"]
    assert p["fallback"] is True and "PHOTOROOM_API_KEY" in p["fallback_reason"] and "FAL_KEY" in p["fallback_reason"]
    assert len(cuc_bo_gia) == 1 and chuoi.name == "studio"


def _gemini_client(bat, status=200, co_anh=True):
    def xu_ly(req):
        bat.append(json.loads(req.content))
        if status != 200:
            return httpx.Response(status, text="quota")
        parts = [{"inlineData": {"mimeType": "image/png", "data": _png_b64()}}] if co_anh else [{"text": "không"}]
        return httpx.Response(200, json={"candidates": [{"content": {"parts": parts}, "finishReason": "STOP"}]})

    return GeminiImageClient(api_key="k", client=httpx.Client(transport=httpx.MockTransport(xu_ly)))


def test_imagen_enhancer_goi_gemini_va_giu_kich_thuoc():
    bat: list = []
    res = ImagenEnhancer(client=_gemini_client(bat)).enhance(_jpeg((40, 30)), {})
    assert res["parameters"]["provider"] == "imagen" and res["parameters"]["bo_qua"] == ["remove_watermark"]
    assert Image.open(BytesIO(res["image"])).size == (40, 30)
    assert bat[0]["generationConfig"]["responseModalities"] == ["IMAGE"]
    assert "Do NOT add, remove" in bat[0]["contents"][0]["parts"][1]["text"]


def test_imagen_trong_chuoi_nem_de_thu_ben_ke_tiep():
    with pytest.raises(NhaCungCapLoi):
        ImagenEnhancer(client=_gemini_client([], status=429), lui_cuc_bo=False).enhance(_jpeg(), {})
    with pytest.raises(NhaCungCapLoi):
        ImagenEnhancer(client=_gemini_client([], co_anh=False), lui_cuc_bo=False).enhance(_jpeg(), {})


def test_imagen_scene_dung_canh_ghi_bo_qua_trung_thuc():
    buf = BytesIO()
    Image.new("RGBA", (40, 30), (0, 0, 0, 0)).save(buf, format="PNG")
    kq = ImagenSceneProvider(client=_gemini_client([])).dung_canh(
        SceneRequest(chu_the_png=buf.getvalue(), ratio="4:3", rong=40, cao=30, scene_prompt="bàn gỗ", seed=3)
    )
    assert kq.anh.size == (40, 30)
    assert "tach_nen:alg" in kq.bo_qua and "seed" in kq.bo_qua
    assert ImagenSceneProvider.nang_luc.tach_nen is False and ImagenSceneProvider.nang_luc.dung_canh is True


def test_registry_theo_thu_tu_tiem_va_bo_ben_thieu_khoa(monkeypatch):
    monkeypatch.setenv("FAL_KEY", "x")
    monkeypatch.setenv("GEMINI_API_KEY", "y")
    monkeypatch.delenv("STABILITY_API_KEY", raising=False)
    monkeypatch.setenv("VARIANT_PROVIDER_ORDER", "stability,fal")
    assert [p.name for p in thu_tu_nha_cung_cap(None, ["imagen", "stability", "fal"])] == ["imagen", "fal"]
    assert [p.name for p in thu_tu_nha_cung_cap("fal", ["imagen", "fal"])] == ["fal", "imagen"]


def test_khoa_worker_khop_danh_muc_ts():
    """Khoá phải khớp `src/modules/creative-production/domain/provider-catalog.ts`."""
    from media_ai.providers.scene.registry import NHA_CUNG_CAP

    assert set(NHA_CUNG_CAP) == {"fal", "stability", "imagen"}  # image_variant
    import media_ai.providers.enhancement.chain as chain

    for key in ["photoroom", "fal_flux", "imagen", "openai"]:  # image_optimize
        try:
            chain._dung(key)
        except NhaCungCapLoi as exc:  # pragma: no cover
            raise AssertionError(key) from exc
