"""Nhánh Cloud của M04b (23/09/2026) — nhà cung cấp chỉ vẽ HẬU CẢNH.

Khoá ba điều bằng test thuần (không Postgres, không mạng):

1. Hậu cảnh do nhà cung cấp trả về được dùng làm phông, nhưng lõi chủ thể vẫn
   trùng khít TUYỆT ĐỐI với Master Image — Subject Integrity là số ĐO, không
   phải hằng gõ tay 0,98 như nhánh Cloud cũ.
2. `StabilityBackgroundProvider` ném `BackgroundProviderError` cho mọi lỗi
   (thiếu khoá, HTTP 402/429, dữ liệu không phải ảnh) — worker chỉ cần một
   nhánh lùi về phông cục bộ.
3. Lời nhắc luôn mang ràng buộc "cảnh trống", có giới hạn độ dài.
"""

from __future__ import annotations

from io import BytesIO

import httpx
import numpy as np
import pytest
from PIL import Image

from media_ai.image.studio_backdrop import StudioBackdropEngine
from media_ai.jobs import variant_worker
from media_ai.jobs.variant_worker import _do_lo_chu_the, dung_bien_the
from media_ai.providers.background.stability_background import (
    BackgroundProviderError,
    StabilityBackgroundProvider,
    chon_ty_le,
    lam_sach_prompt,
    resolve_background_provider,
)


def _anh_bytes(anh: Image.Image, fmt: str = "PNG") -> bytes:
    buf = BytesIO()
    anh.save(buf, format=fmt)
    return buf.getvalue()


def _master_va_mat_na() -> tuple[Image.Image, Image.Image, Image.Image]:
    """Master 200×200: nền xám, "bó hoa" là hình vuông đỏ có hoạ tiết ở giữa."""
    master = Image.new("RGB", (200, 200), (128, 128, 128))
    arr = np.array(master)
    for y in range(50, 150):
        for x in range(50, 150):
            arr[y, x] = (200 + (x % 40), 20 + (y % 30), 40)
    master = Image.fromarray(arr)
    alpha = Image.new("L", (200, 200), 0)
    a = np.array(alpha)
    a[50:150, 50:150] = 255
    alpha = Image.fromarray(a)
    rgba = master.convert("RGBA")
    rgba.putalpha(alpha)
    return master, rgba, alpha


@pytest.fixture
def khong_tach_that(monkeypatch):
    master, rgba, alpha = _master_va_mat_na()
    monkeypatch.setattr(variant_worker, "_doan_chu_the", lambda *_a, **_k: (rgba, alpha))
    return master


def test_hau_canh_cloud_duoc_dung_ma_loi_chu_the_nguyen_ven(khong_tach_that):
    hau_canh = Image.new("RGB", (512, 256), (10, 200, 30))  # xanh lá, tỷ lệ khác master
    bien_the, do_trung, _ = dung_bien_the(
        _anh_bytes(khong_tach_that),
        "luxury_hotel",
        "1:1",
        watermark=False,
        logo_bytes=None,
        ten_tiem=None,
        hau_canh_bytes=_anh_bytes(hau_canh),
    )
    assert do_trung == 1.0
    styled = next(b for b in bien_the if b["key"] == "styled")["image"].convert("RGB")
    # Góc ảnh là hậu cảnh xanh của nhà cung cấp, không phải phông tự dựng.
    r, g, b = styled.resize((200, 200)).getpixel((5, 5))
    assert g > 150 and r < 80


def test_khong_co_hau_canh_thi_giu_nguyen_nhanh_local(khong_tach_that):
    bien_the, do_trung, _ = dung_bien_the(
        _anh_bytes(khong_tach_that), "studio_white", "1:1", False, None, None
    )
    assert do_trung == 1.0
    assert any(b["key"] == "styled" for b in bien_the)


def test_phep_do_van_bat_duoc_viec_ve_de_len_chu_the():
    master, rgba, alpha = _master_va_mat_na()
    ket_qua = StudioBackdropEngine().composite(
        rgba, style="clean_white", backdrop_image=Image.new("RGB", (300, 300), (0, 0, 255))
    )
    arr = np.array(ket_qua.convert("RGB"))
    arr[90:110, 90:110] = (0, 0, 0)  # giả lập mô hình vẽ đè lên bó hoa
    assert _do_lo_chu_the(master, Image.fromarray(arr).convert("RGBA"), alpha) < 0.99


def test_fit_backdrop_phu_kin_khung_khong_meo():
    anh = StudioBackdropEngine.fit_backdrop_image(Image.new("RGB", (400, 100), (1, 2, 3)), 200, 200)
    assert anh.size == (200, 200)
    assert anh.mode == "RGBA"


def test_thieu_khoa_la_loi_nha_cung_cap():
    with pytest.raises(BackgroundProviderError):
        StabilityBackgroundProvider(api_key="").sinh_hau_canh("x", 100, 100)


@pytest.mark.parametrize("status", [402, 403, 429, 500])
def test_http_loi_la_loi_nha_cung_cap(status):
    client = httpx.Client(transport=httpx.MockTransport(lambda req: httpx.Response(status, text="nope")))
    with pytest.raises(BackgroundProviderError) as exc:
        StabilityBackgroundProvider(api_key="k", client=client).sinh_hau_canh("x", 100, 100)
    assert exc.value.status_code == status


def test_tra_ve_khong_phai_anh_la_loi():
    client = httpx.Client(
        transport=httpx.MockTransport(
            lambda req: httpx.Response(200, headers={"content-type": "application/json"}, text="{}")
        )
    )
    with pytest.raises(BackgroundProviderError):
        StabilityBackgroundProvider(api_key="k", client=client).sinh_hau_canh("x", 100, 100)


def test_thanh_cong_tra_bytes_va_prompt_co_rang_buoc():
    png = _anh_bytes(Image.new("RGB", (64, 64), (5, 5, 5)))
    bat: dict = {}

    def xu_ly(req: httpx.Request) -> httpx.Response:
        bat["auth"] = req.headers.get("authorization")
        bat["body"] = req.content
        return httpx.Response(200, headers={"content-type": "image/png"}, content=png)

    client = httpx.Client(transport=httpx.MockTransport(xu_ly))
    kq = StabilityBackgroundProvider(api_key="k", client=client).sinh_hau_canh("hotel lobby", 900, 1600)
    assert kq["image"] == png
    assert kq["aspect_ratio"] == "9:16"
    assert bat["auth"] == "Bearer k"
    assert b"no flowers" in bat["body"]


def test_lam_sach_prompt_cat_do_dai_va_luon_them_rang_buoc():
    p = lam_sach_prompt("a" * 5000)
    assert "no flowers" in p
    assert len(p) < 900
    assert "no flowers" in lam_sach_prompt(None)


def test_chon_ty_le():
    assert chon_ty_le(1000, 1000) == "1:1"
    assert chon_ty_le(1600, 900) == "16:9"
    assert chon_ty_le(0, 10) == "1:1"


def test_nha_cung_cap_la_khong_duoc_am_tham_doi():
    with pytest.raises(BackgroundProviderError):
        resolve_background_provider("midjourney")
    assert resolve_background_provider(None).name == "stability_ai"
