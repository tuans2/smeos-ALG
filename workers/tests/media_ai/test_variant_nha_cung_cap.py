"""Luồng NHÀ CUNG CẤP TRỌN GÓI (PO 25/09/2026).

Khoá bằng test:
- phép đo hình dáng + cấu trúc + màu: ảnh giữ nguyên / chỉnh sáng nhẹ → đạt;
  vẽ lại bó hoa, dời chỗ, không tách được → từ chối;
- nhà cung cấp vai trò tương đương: bên lỗi → bên kế tiếp; tất cả lỗi → lùi cục bộ;
- adapter fal / Stability gửi đúng tham số "dùng hết tính năng" (giữ vị trí,
  giữ chủ thể, hướng sáng, tăng nét) — HTTP giả lập, không gọi mạng thật.
"""

from __future__ import annotations

import json
from io import BytesIO

import httpx
import numpy as np
import pytest
from PIL import Image

from media_ai.image.do_giu_nguyen import NGUONG, do_giu_nguyen, phan_quyet
from media_ai.jobs.variant_nha_cung_cap import TatCaNhaCungCapLoi, dung_bien_the_nha_cung_cap
from media_ai.providers.scene import registry
from media_ai.providers.scene.base import NangLucCanh, SceneProviderError, SceneResult
from media_ai.providers.scene.fal_scene import MODEL_CANH, FalSceneProvider
from media_ai.providers.scene.stability_scene import StabilitySceneProvider


def _png(anh: Image.Image) -> bytes:
    buf = BytesIO()
    anh.save(buf, format="PNG")
    return buf.getvalue()


def _bo_hoa(w: int = 200, h: int = 200) -> tuple[Image.Image, np.ndarray]:
    rng = np.random.default_rng(7)
    rgb = np.full((h, w, 3), 240, dtype=np.uint8)
    a = np.zeros((h, w), dtype=np.uint8)
    rgb[40:170, 50:150] = rng.integers(30, 230, (130, 100, 3), dtype=np.uint8)
    a[40:170, 50:150] = 255
    return Image.fromarray(np.dstack([rgb, a]), "RGBA"), a


# ─── Phép đo hình dáng + cấu trúc + màu ─────────────────────────────────────


def _ghep(rgba: Image.Image, nen=(90, 110, 130), dich=(0, 0), sang: float = 1.0) -> Image.Image:
    ra = Image.new("RGB", rgba.size, nen)
    cho = rgba.copy()
    if sang != 1.0:
        arr = np.asarray(cho).astype(np.float32)
        arr[..., :3] = np.clip(arr[..., :3] * sang, 0, 255)
        cho = Image.fromarray(arr.astype(np.uint8), "RGBA")
    ra.paste(cho, dich, cho)
    return ra


def test_giu_nguyen_thi_dat_safe():
    rgba, a = _bo_hoa()
    kd = do_giu_nguyen(rgba, _ghep(rgba), Image.fromarray(a))
    assert kd["result"] == "SAFE" and kd["structure_ssim"] > 0.99 and kd["shape_iou"] == 1.0


def test_chinh_sang_nhe_van_dat():
    rgba, a = _bo_hoa()
    kd = do_giu_nguyen(rgba, _ghep(rgba, sang=1.06), Image.fromarray(a))
    assert kd["result"] in ("SAFE", "WARNING")


def test_ve_lai_bo_hoa_bi_tu_choi():
    rgba, a = _bo_hoa()
    ve_lai = np.asarray(rgba).copy()
    ve_lai[40:170, 50:150, :3] = np.random.default_rng(99).integers(30, 230, (130, 100, 3), dtype=np.uint8)
    kd = do_giu_nguyen(rgba, _ghep(Image.fromarray(ve_lai, "RGBA")), Image.fromarray(a))
    assert kd["result"] == "REJECTED" and kd["ly_do"]


def test_doi_cho_bi_tu_choi():
    rgba, a = _bo_hoa()
    a_dich = np.roll(a, 40, axis=1)
    kd = do_giu_nguyen(rgba, _ghep(rgba, dich=(40, 0)), Image.fromarray(a_dich))
    assert kd["result"] == "REJECTED"


def test_khong_tach_duoc_anh_ra_thi_khong_duoc_bao_dat():
    rgba, _ = _bo_hoa()
    kd = do_giu_nguyen(rgba, _ghep(rgba), None)
    assert kd["shape_iou"] is None and kd["result"] == "REJECTED"


def test_phan_quyet_theo_so_do_xau_nhat():
    tot = {"structure_ssim": 0.95, "color_delta_e": 3.0, "shape_iou": 0.97}
    assert phan_quyet(tot) == "SAFE"
    assert phan_quyet({**tot, "color_delta_e": 12.0}) == "WARNING"
    assert phan_quyet({**tot, "shape_iou": 0.5}) == "REJECTED"
    assert set(NGUONG) == {"structure_ssim", "color_delta_e", "shape_iou"}


# ─── Luồng + chuỗi nhà cung cấp tương đương ─────────────────────────────────


class _NccGia:
    """Nhà cung cấp giả: tách nền theo mặt nạ biết trước, dựng cảnh = dán bó hoa lên nền xám."""

    nang_luc = NangLucCanh(True, True, True, True, False, frozenset({"left"}), False)

    def __init__(self, name: str, alpha: np.ndarray, loi_o: str | None = None, ve_lai: bool = False) -> None:
        self.name = name
        self._alpha = alpha
        self._loi_o = loi_o
        self._ve_lai = ve_lai
        self.goi: list[str] = []

    def co_khoa(self) -> bool:
        return True

    def tach_nen(self, anh: Image.Image) -> Image.Image:
        self.goi.append("tach_nen")
        if self._loi_o == "tach_nen":
            raise SceneProviderError(f"{self.name} tách nền lỗi")
        if anh.size == (self._alpha.shape[1], self._alpha.shape[0]):
            return Image.fromarray(self._alpha)
        # ảnh ra (khung đích): tách theo chỗ không phải nền xám
        arr = np.asarray(anh.convert("RGB")).astype(np.int16)
        return Image.fromarray(((np.abs(arr - 128).max(axis=2) > 3) * 255).astype(np.uint8))

    def dung_canh(self, req) -> SceneResult:
        self.goi.append("dung_canh")
        if self._loi_o == "dung_canh":
            raise SceneProviderError(f"{self.name} HTTP 402", 402)
        khung = Image.open(BytesIO(req.chu_the_png)).convert("RGBA")
        nen = Image.new("RGB", khung.size, (128, 128, 128))
        if self._ve_lai:
            khung = Image.fromarray(np.dstack([
                np.random.default_rng(1).integers(0, 255, (khung.height, khung.width, 3), dtype=np.uint8),
                np.asarray(khung)[..., 3],
            ]), "RGBA")
        nen.paste(khung, (0, 0), khung)
        return SceneResult(anh=nen, prompt="p", seed=11, model_version=f"{self.name}-scene", bo_qua=[], tham_so={"x": 1})

    def tang_net(self, anh: Image.Image, he_so: int) -> Image.Image:
        self.goi.append("tang_net")
        return anh.resize((anh.width * he_so, anh.height * he_so), Image.LANCZOS)


def _master() -> tuple[bytes, np.ndarray]:
    rgba, a = _bo_hoa(240, 240)
    rgb = Image.new("RGB", rgba.size, (250, 250, 250))
    rgb.paste(rgba, (0, 0), rgba)
    return _png(rgb), a


Y_DINH = {"scene_prompt": "wooden table", "composition": {"shot": "medium"}, "lighting": {"direction": "left"},
          "palette": [], "seed": None, "style": "film", "quality": "standard", "upscale": "none"}


def test_nha_cung_cap_lam_tron_goi_va_dat():
    mb, a = _master()
    ncc = _NccGia("fal", a)
    kq = dung_bien_the_nha_cung_cap(mb, "wedding", "9:16", False, None, None, [ncc], Y_DINH)
    assert ncc.goi[:2] == ["tach_nen", "dung_canh"] and ncc.goi[-1] == "tach_nen"  # tách, dựng, tách ảnh ra để đo
    assert kq.khoi_do["result"] == "SAFE"
    assert kq.nguon["provider"] == "fal" and kq.nguon["ai_relit"] is True
    styled = next(b for b in kq.bien_the if b["key"] == "styled")
    assert styled["image"].size == (1080, 1920) and styled["compose_mode"] == "relight"


def test_ben_loi_thi_thu_ben_ke_tiep():
    mb, a = _master()
    loi, tot = _NccGia("stability", a, loi_o="dung_canh"), _NccGia("fal", a)
    kq = dung_bien_the_nha_cung_cap(mb, "wedding", "9:16", False, None, None, [loi, tot], Y_DINH)
    assert kq.nguon["provider"] == "fal" and "stability" in kq.loi_ben_truoc[0]


def test_tat_ca_loi_thi_bao_de_lui_cuc_bo():
    mb, a = _master()
    with pytest.raises(TatCaNhaCungCapLoi) as e:
        dung_bien_the_nha_cung_cap(mb, "wedding", "9:16", False, None, None,
                                   [_NccGia("a", a, loi_o="tach_nen"), _NccGia("b", a, loi_o="dung_canh")], Y_DINH)
    assert len(e.value.ly_do) == 2
    with pytest.raises(TatCaNhaCungCapLoi):
        dung_bien_the_nha_cung_cap(mb, "wedding", "9:16", False, None, None, [], Y_DINH)


def test_nha_cung_cap_ve_lai_bo_hoa_bi_cong_tu_choi():
    mb, a = _master()
    kq = dung_bien_the_nha_cung_cap(mb, "wedding", "9:16", False, None, None, [_NccGia("x", a, ve_lai=True)], Y_DINH)
    assert kq.khoi_do["result"] == "REJECTED"


def test_upscale_dung_bo_tang_net_cua_nha_cung_cap():
    mb, a = _master()
    ncc = _NccGia("fal", a)
    kq = dung_bien_the_nha_cung_cap(mb, "wedding", "9:16", False, None, None, [ncc], {**Y_DINH, "upscale": "2x"})
    assert "tang_net" in ncc.goi
    styled = next(b for b in kq.bien_the if b["key"] == "styled")
    assert styled["image"].size == (2160, 3840) and styled["upscale"]["engine"] == "fal:provider"


def test_registry_thu_tu_tuong_duong(monkeypatch):
    monkeypatch.setenv("FAL_KEY", "k")
    monkeypatch.setenv("STABILITY_API_KEY", "k")
    monkeypatch.setenv("VARIANT_PROVIDER_ORDER", "stability,fal")
    assert [p.name for p in registry.thu_tu_nha_cung_cap()] == ["stability", "fal"]
    assert [p.name for p in registry.thu_tu_nha_cung_cap("fal")] == ["fal", "stability"]
    monkeypatch.delenv("STABILITY_API_KEY")
    assert [p.name for p in registry.thu_tu_nha_cung_cap("stability")] == ["fal"]  # không khoá thì không thử


# ─── Adapter fal (HTTP giả lập) ─────────────────────────────────────────────


def _fal_client(ket_qua_theo_model: dict[str, dict], anh: dict[str, Image.Image], bat: list) -> httpx.Client:
    def xu_ly(req: httpx.Request) -> httpx.Response:
        url = str(req.url)
        if req.method == "POST":
            model = url.split("queue.fal.run/")[1]
            bat.append((model, json.loads(req.content)))
            return httpx.Response(200, json={"request_id": model.replace("/", "_")})
        if url.endswith("/status"):
            return httpx.Response(200, json={"status": "COMPLETED"})
        if "queue.fal.run" in url:
            for model, body in ket_qua_theo_model.items():
                if model.replace("/", "_") in url:
                    return httpx.Response(200, json=body)
        ten = url.rsplit("/", 1)[1]
        return httpx.Response(200, content=_png(anh[ten]), headers={"content-type": "image/png"})

    return httpx.Client(transport=httpx.MockTransport(xu_ly))


def test_fal_product_shot_giu_vi_tri_va_ghi_bo_qua_seed():
    bat: list = []
    c = _fal_client({MODEL_CANH: {"images": [{"url": "https://cdn/x.png"}]}}, {"x.png": Image.new("RGB", (90, 160))}, bat)
    p = FalSceneProvider(api_key="k", client=c, khoang_poll_s=0)
    from media_ai.providers.scene.base import SceneRequest

    kq = p.dung_canh(SceneRequest(chu_the_png=_png(Image.new("RGBA", (90, 160))), ratio="9:16", rong=90, cao=160,
                                  scene_prompt="table", style="cinematic", seed=5, quality="high"))
    model, body = bat[0]
    assert model == MODEL_CANH
    assert body["placement_type"] == "original" and body["original_quality"] is True and body["fast"] is False
    assert body["image_url"].startswith("data:image/png;base64,")
    assert "cinematic" in body["scene_description"]
    assert "seed" in kq.bo_qua and kq.anh.size == (90, 160)


def test_fal_tach_nen_lay_mat_na():
    bat: list = []
    mask = Image.new("L", (40, 40), 200)
    c = _fal_client({"fal-ai/birefnet/v2": {"image": {"url": "https://cdn/i.png"}, "mask_image": {"url": "https://cdn/m.png"}}},
                    {"m.png": mask, "i.png": Image.new("RGBA", (40, 40))}, bat)
    a = FalSceneProvider(api_key="k", client=c, khoang_poll_s=0).tach_nen(Image.new("RGB", (80, 80)))
    assert a.size == (80, 80) and bat[0][1]["output_mask"] is True


def test_fal_thieu_khoa_la_loi_nha_cung_cap():
    with pytest.raises(SceneProviderError):
        FalSceneProvider(api_key="").tach_nen(Image.new("RGB", (8, 8)))


# ─── Adapter Stability (HTTP giả lập) ───────────────────────────────────────


def _stab_client(bat: list, trang_thai_dung: int = 200) -> httpx.Client:
    lan = {"poll": 0}

    def xu_ly(req: httpx.Request) -> httpx.Response:
        url = str(req.url)
        bat.append((req.method, url, req.content))
        if url.endswith("/replace-background-and-relight"):
            if trang_thai_dung != 200:
                return httpx.Response(trang_thai_dung, text="no credit")
            return httpx.Response(200, json={"id": "abc"})
        if "/results/abc" in url:
            lan["poll"] += 1
            if lan["poll"] < 2:
                return httpx.Response(202, json={"status": "in-progress"})
            return httpx.Response(200, content=_png(Image.new("RGB", (90, 160))), headers={"content-type": "image/png"})
        if url.endswith("/remove-background"):
            return httpx.Response(200, content=_png(Image.new("RGBA", (40, 40), (1, 2, 3, 200))), headers={"content-type": "image/png"})
        if url.endswith("/upscale/fast"):
            return httpx.Response(200, content=_png(Image.new("RGB", (360, 640))), headers={"content-type": "image/png"})
        return httpx.Response(404)

    return httpx.Client(transport=httpx.MockTransport(xu_ly))


def test_stability_relight_giu_chu_the_huong_sang_va_hoi_ket_qua():
    from media_ai.providers.scene.base import SceneRequest

    bat: list = []
    p = StabilitySceneProvider(api_key="k", client=_stab_client(bat), khoang_poll_s=0)
    kq = p.dung_canh(SceneRequest(chu_the_png=_png(Image.new("RGBA", (90, 160))), ratio="9:16", rong=90, cao=160,
                                  lighting_direction="right", seed=42, style="film"))
    body = bat[0][2].decode("utf-8", "ignore")
    assert 'name="preserve_original_subject"\r\n\r\n0.95' in body
    assert 'name="light_source_direction"\r\n\r\nright' in body
    assert 'name="seed"\r\n\r\n42' in body
    assert kq.seed == 42 and kq.anh.size == (90, 160)
    assert sum(1 for m, u, _ in bat if "/results/" in u) == 2  # 202 rồi 200


def test_stability_huong_sang_truoc_mat_khong_co_tham_so_thi_ghi_bo_qua():
    from media_ai.providers.scene.base import SceneRequest

    bat: list = []
    kq = StabilitySceneProvider(api_key="k", client=_stab_client(bat), khoang_poll_s=0).dung_canh(
        SceneRequest(chu_the_png=_png(Image.new("RGBA", (9, 16))), ratio="9:16", rong=9, cao=16, lighting_direction="front")
    )
    assert "lighting_direction:front" in kq.bo_qua


def test_stability_het_credit_la_loi_nha_cung_cap():
    from media_ai.providers.scene.base import SceneRequest

    with pytest.raises(SceneProviderError) as e:
        StabilitySceneProvider(api_key="k", client=_stab_client([], 402), khoang_poll_s=0).dung_canh(
            SceneRequest(chu_the_png=b"x", ratio="1:1", rong=8, cao=8)
        )
    assert e.value.status_code == 402 and "hết credit" in str(e.value)


def test_stability_tach_nen_va_tang_net():
    p = StabilitySceneProvider(api_key="k", client=_stab_client([]))
    assert p.tach_nen(Image.new("RGB", (80, 80))).size == (80, 80)
    assert p.tang_net(Image.new("RGB", (90, 160)), 2).size == (180, 320)
