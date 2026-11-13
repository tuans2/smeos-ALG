"""Đợt 2 nâng cấp chất lượng ảnh biến thể (25/09/2026) — phong cách + phương án.

- `style` là Ý ĐỊNH ALG; adapter Stability dịch sang `style_preset`, giá trị
  lạ không bao giờ được gửi thẳng (enum lạ = HTTP 400) mà ghi `bo_qua`.
- Phông cục bộ không làm được phong cách → nói thật (`bo_qua`).
- Hằng `PHONG_CACH` khớp `VARIANT_STYLES` phía TS (test TS đọc file này).
"""

from __future__ import annotations

from io import BytesIO

import httpx
from PIL import Image

from media_ai.providers.background.base import PHONG_CACH, BackgroundRequest
from media_ai.providers.background.local_studio import LocalStudioBackground
from media_ai.providers.background.stability_background import (
    STYLE_PRESETS,
    STYLE_SANG_PRESET,
    StabilityBackgroundProvider,
)


def _client_gia(bat: list[bytes]) -> httpx.Client:
    def xu_ly(req: httpx.Request) -> httpx.Response:
        bat.append(req.content)
        buf = BytesIO()
        Image.new("RGB", (90, 160), (1, 2, 3)).save(buf, format="PNG")
        return httpx.Response(200, content=buf.getvalue(), headers={"content-type": "image/png"})

    return httpx.Client(transport=httpx.MockTransport(xu_ly))


def test_moi_phong_cach_deu_co_preset_hop_le():
    assert set(STYLE_SANG_PRESET) == set(PHONG_CACH)
    assert set(STYLE_SANG_PRESET.values()) <= STYLE_PRESETS


def test_stability_dich_phong_cach_sang_style_preset():
    bat: list[bytes] = []
    kq = StabilityBackgroundProvider(api_key="k", client=_client_gia(bat)).generate(
        BackgroundRequest(ratio="9:16", rong=90, cao=160, style="film", seed=5)
    )
    body = bat[0].decode("utf-8", "ignore")
    assert 'name="style_preset"\r\n\r\nanalog-film' in body
    assert "style:film" not in kq.bo_qua


def test_phong_cach_la_khong_gui_ma_ghi_bo_qua():
    bat: list[bytes] = []
    kq = StabilityBackgroundProvider(api_key="k", client=_client_gia(bat)).generate(
        BackgroundRequest(ratio="1:1", rong=64, cao=64, style="anime")
    )
    assert 'name="style_preset"' not in bat[0].decode("utf-8", "ignore")
    assert "style:anime" in kq.bo_qua


def test_khong_chon_phong_cach_thi_khong_gui():
    bat: list[bytes] = []
    StabilityBackgroundProvider(api_key="k", client=_client_gia(bat)).generate(
        BackgroundRequest(ratio="1:1", rong=64, cao=64)
    )
    assert 'name="style_preset"' not in bat[0].decode("utf-8", "ignore")


def test_phong_cuc_bo_noi_that_khong_lam_duoc_phong_cach():
    kq = LocalStudioBackground("clean_white").generate(BackgroundRequest(ratio="1:1", rong=32, cao=32, style="cinematic"))
    assert "style" in kq.bo_qua
    assert LocalStudioBackground.nang_luc.style is False
    assert StabilityBackgroundProvider.nang_luc.style is True


# ─── Phương án cục bộ khác nhau thật (seed phông + hướng sáng) ────────────────

import numpy as np  # noqa: E402

from media_ai.image.studio_backdrop import StudioBackdropEngine  # noqa: E402


def _khac(a: Image.Image, b: Image.Image) -> float:
    return float(np.abs(np.asarray(a.convert("RGB"), dtype=np.float32) - np.asarray(b.convert("RGB"), dtype=np.float32)).mean())


def test_phong_mac_dinh_khong_doi_so_voi_truoc():
    e = StudioBackdropEngine()
    for style in ("warm_gray", "boutique_bokeh", "wood_warm"):
        assert _khac(e.create_backdrop(120, 200, style=style), e.create_backdrop(120, 200, style=style, light_direction="left", seed=None)) == 0


def test_seed_lam_phong_khac_nhau_va_tai_tao_duoc():
    e = StudioBackdropEngine()
    for style in ("boutique_bokeh", "soft_ambient"):
        a = e.create_backdrop(200, 360, style=style, seed=1)
        b = e.create_backdrop(200, 360, style=style, seed=2)
        a2 = e.create_backdrop(200, 360, style=style, seed=1)
        assert _khac(a, b) > 0.3
        assert _khac(a, a2) == 0


def test_vung_sang_cua_phong_theo_huong_sang():
    e = StudioBackdropEngine()
    phai = np.asarray(e.create_backdrop(200, 200, style="wood_warm", with_grain=False, light_direction="right").convert("L"), dtype=np.float32)
    trai = np.asarray(e.create_backdrop(200, 200, style="wood_warm", with_grain=False, light_direction="left").convert("L"), dtype=np.float32)
    # sáng phải → nửa phải sáng hơn nửa trái; sáng trái thì ngược lại
    assert phai[:, 100:].mean() > phai[:, :100].mean()
    assert trai[:, :100].mean() > trai[:, 100:].mean()


def test_phong_cuc_bo_dung_seed_thi_ghi_lai_seed():
    kq = LocalStudioBackground("boutique_bokeh").generate(BackgroundRequest(ratio="9:16", rong=90, cao=160, seed=9))
    assert kq.seed == 9 and "seed" not in kq.bo_qua
