"""Đợt 3 nâng cấp chất lượng ảnh biến thể (25/09/2026).

Khoá bằng test:
- làm mờ mép cắt chỉ đụng phần HẸP chạm mép ảnh gốc (tay, cuống), không đụng
  sản phẩm bị cắt rộng; Subject Integrity vẫn 1,0 trên phần còn lại;
- `harmonize` không đụng lõi bó hoa; bóng lấy màu hậu cảnh;
- `upscale=2x`: khung xuất gấp đôi, bó hoa không qua mô hình siêu phân giải;
- Stability `quality=high` gọi Ultra, ghi đúng model;
- mô hình tách nền mặc định có giấy phép thương mại (D18);
- chấm kỹ thuật phân biệt ảnh tốt / ảnh lỗi rõ ràng.
"""

from __future__ import annotations

from io import BytesIO

import httpx
import numpy as np
import pytest
from PIL import Image

from media_ai.image.cham_tham_my import cham_ky_thuat
from media_ai.image.hoa_hop import khop_do_net_nen, mau_bong_tu_nen
from media_ai.image.mo_mep_cat import lam_mo_mep_cat
from media_ai.jobs import variant_worker
from media_ai.jobs.variant_worker import dung_bien_the
from media_ai.providers.background.base import BackgroundRequest
from media_ai.providers.background.local_studio import LocalStudioBackground
from media_ai.providers.background.stability_background import MODEL_ULTRA, StabilityBackgroundProvider
from media_ai.providers.segmentation import mo_hinh
from media_ai.providers.upscale.nen import ENGINE_DU_PHONG, tang_net_nen


def _anh_bytes(anh: Image.Image) -> bytes:
    buf = BytesIO()
    anh.save(buf, format="PNG")
    return buf.getvalue()


def _master_co_tay() -> tuple[Image.Image, Image.Image, Image.Image]:
    """Master 300×300: "bó hoa" 120×150 giữa ảnh + "cẳng tay" hẹp 30px chạy ra mép phải."""
    arr = np.full((300, 300, 3), 235, dtype=np.uint8)
    a = np.zeros((300, 300), dtype=np.uint8)
    for y in range(60, 210):
        for x in range(90, 210):
            arr[y, x] = (200 + (x % 40), 30 + (y % 30), 60)
    a[60:210, 90:210] = 255
    arr[170:200, 200:300] = (224, 172, 140)  # màu da
    a[170:200, 200:300] = 255
    master = Image.fromarray(arr)
    alpha = Image.fromarray(a)
    rgba = master.convert("RGBA")
    rgba.putalpha(alpha)
    return master, rgba, alpha


# ─── Làm mờ mép cắt ─────────────────────────────────────────────────────────


def test_mo_mep_cat_lam_mo_tay_cham_mep_phai():
    _, rgba, alpha = _master_co_tay()
    rgba2, alpha2, kq = lam_mo_mep_cat(rgba, alpha)
    a2 = np.asarray(alpha2)
    assert kq.mep == ["right"] and kq.co_da_nguoi
    assert a2[185, 299] == 0                 # sát mép: trong suốt hẳn
    assert 0 < a2[185, 290] < 255            # đang mờ dần
    assert a2[120, 150] == 255               # bó hoa không đổi
    assert (np.asarray(rgba2)[..., :3] == np.asarray(rgba)[..., :3]).all()  # chỉ đổi alpha
    assert kq.vung_mo is not None and kq.vung_mo[185, 295] and not kq.vung_mo[120, 150]


def test_mo_mep_cat_khong_dung_canh_la_tho_ra_mep():
    """Hồi quy 25/09 (giỏ GHCB0001): nhánh lá HẸP chạm mép trái là sản phẩm, không phải tay."""
    a = np.zeros((200, 200), dtype=np.uint8)
    a[40:180, 40:170] = 255
    a[90:100, 0:40] = 255  # cành lá mảnh chạm mép trái
    rgba = Image.new("RGBA", (200, 200), (40, 140, 60, 255))  # màu lá
    rgba.putalpha(Image.fromarray(a))
    _, alpha2, kq = lam_mo_mep_cat(rgba, Image.fromarray(a))
    assert kq.mep == [] and (np.asarray(alpha2) == a).all()


def test_mo_mep_cat_khong_dung_ruy_bang_kem_hong():
    """Hồi quy 25/09 (BHSK0001): đuôi ruy băng kem/hồng chạm mép dưới không phải tay."""
    for mau in [(240, 220, 200), (230, 150, 170)]:
        a = np.zeros((200, 200), dtype=np.uint8)
        a[20:160, 40:160] = 255
        a[160:200, 95:110] = 255  # đuôi ruy băng mảnh chạm mép dưới
        arr = np.full((200, 200, 4), 255, dtype=np.uint8)
        arr[..., :3] = (60, 140, 60)
        arr[160:200, 95:110, :3] = mau
        arr[..., 3] = a
        _, alpha2, kq = lam_mo_mep_cat(Image.fromarray(arr, "RGBA"), Image.fromarray(a))
        assert kq.mep == [], mau


def test_mo_mep_cat_tay_dai_thi_mo_dai():
    _, rgba, alpha = _master_co_tay()  # cẳng tay dài 100 px từ mép phải
    _, alpha2, kq = lam_mo_mep_cat(rgba, alpha)
    assert kq.dai_mo_px >= 60


def test_mo_mep_cat_khong_dung_san_pham_bi_cat_rong():
    """Bông hoa bị ảnh gốc cắt RỘNG ở mép trên = chính sản phẩm → không làm mờ."""
    a = np.zeros((200, 200), dtype=np.uint8)
    a[0:150, 30:170] = 255  # chạm mép trên 140/140 = rộng
    alpha = Image.fromarray(a)
    rgba = Image.new("RGBA", (200, 200), (10, 200, 10, 255))
    rgba.putalpha(alpha)
    _, alpha2, kq = lam_mo_mep_cat(rgba, alpha)
    assert kq.mep == [] and (np.asarray(alpha2) == a).all()


def test_full_frame_co_tay_van_trung_khit_va_ghi_edge_fade(monkeypatch):
    master, rgba, alpha = _master_co_tay()
    monkeypatch.setattr(variant_worker, "_doan_chu_the", lambda *_a, **_k: (rgba, alpha))
    bien_the, do_trung, _ = dung_bien_the(
        _anh_bytes(master), "wood_minimal", "9:16", watermark=False, logo_bytes=None, ten_tiem=None,
    )
    styled = next(b for b in bien_the if b["key"] == "styled")
    assert do_trung == 1.0
    assert styled["edge_fade"]["edges"] == ["right"]
    # Bản tách nền trong suốt giữ nguyên cẳng tay (chủ tiệm có thể cần).
    trong_suot = next(b for b in bien_the if b["key"] == "transparent")
    assert trong_suot["image"].getchannel("A").getextrema()[1] == 255


# ─── Harmonize ──────────────────────────────────────────────────────────────


def test_harmonize_khong_dung_loi_va_ghi_thong_tin(monkeypatch):
    master, rgba, alpha = _master_co_tay()
    monkeypatch.setattr(variant_worker, "_doan_chu_the", lambda *_a, **_k: (rgba, alpha))
    nen = Image.new("RGB", (400, 700), (40, 90, 160))  # nền xanh đậm
    bien_the, do_trung, _ = dung_bien_the(
        _anh_bytes(master), "wood_minimal", "9:16", watermark=False, logo_bytes=None, ten_tiem=None,
        nguon_hau_canh=lambda *_a: nen, compose_mode="harmonize",
    )
    styled = next(b for b in bien_the if b["key"] == "styled")
    assert do_trung == 1.0
    assert styled["compose_mode"] == "harmonize"
    r, g, b = styled["harmonize"]["shadow_color"]
    assert b > r  # bóng ngả theo nền xanh, không còn nâu cố định


def test_mau_bong_theo_nen_va_khop_do_net_chi_lam_mo_nen():
    a = np.zeros((100, 100), dtype=np.uint8)
    a[20:70, 30:70] = 255
    nen = Image.new("RGB", (100, 100), (200, 150, 100))
    assert mau_bong_tu_nen(nen, Image.fromarray(a), (1, 1, 1)) == (44, 33, 22)

    rng = np.random.default_rng(0)
    nen_sac = Image.fromarray(rng.integers(0, 255, (100, 100, 3), dtype=np.uint8))
    chu_the = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
    chu_the.paste(Image.new("RGBA", (40, 50), (180, 60, 60, 255)), (30, 20))
    nen_moi, ban_kinh = khop_do_net_nen(nen_sac, chu_the)
    assert ban_kinh > 0 and nen_moi.size == nen_sac.size


# ─── Tăng nét 2× ────────────────────────────────────────────────────────────


def test_upscale_2x_khung_gap_doi_nen_nho_duoc_tang_net(monkeypatch):
    master, rgba, alpha = _master_co_tay()
    monkeypatch.setattr(variant_worker, "_doan_chu_the", lambda *_a, **_k: (rgba, alpha))
    nen_nho = Image.new("RGB", (90, 160), (120, 110, 100))
    bien_the, do_trung, _ = dung_bien_the(
        _anh_bytes(master), "wood_minimal", "9:16", watermark=False, logo_bytes=None, ten_tiem=None,
        nguon_hau_canh=lambda *_a: nen_nho, upscale="2x",
    )
    styled = next(b for b in bien_the if b["key"] == "styled")
    assert styled["image"].size == (2160, 3840)
    assert do_trung == 1.0
    assert styled["upscale"]["subject_engine"] == "lanczos"  # bó hoa không qua mô hình siêu phân giải
    assert styled["upscale"]["background_engine"] is not None


def test_tang_net_nen_lui_ve_lanczos_va_noi_that():
    anh, cach = tang_net_nen(Image.new("RGB", (50, 40), (1, 2, 3)), 2)
    assert anh.size == (100, 80)
    assert cach == ENGINE_DU_PHONG  # worker chưa cài Real-ESRGAN thật


# ─── Stability Ultra ────────────────────────────────────────────────────────


def _client_gia(bat: list[httpx.Request]) -> httpx.Client:
    def xu_ly(req: httpx.Request) -> httpx.Response:
        bat.append(req)
        return httpx.Response(200, content=_anh_bytes(Image.new("RGB", (90, 160))), headers={"content-type": "image/png"})

    return httpx.Client(transport=httpx.MockTransport(xu_ly))


def test_quality_high_goi_ultra_va_ghi_model():
    bat: list[httpx.Request] = []
    kq = StabilityBackgroundProvider(api_key="k", client=_client_gia(bat)).generate(
        BackgroundRequest(ratio="9:16", rong=90, cao=160, quality="high", style="film")
    )
    assert str(bat[0].url).endswith("/generate/ultra")
    assert kq.model_version == MODEL_ULTRA
    assert "style" in kq.bo_qua and b'name="style_preset"' not in bat[0].content


def test_quality_standard_goi_core():
    bat: list[httpx.Request] = []
    kq = StabilityBackgroundProvider(api_key="k", client=_client_gia(bat)).generate(
        BackgroundRequest(ratio="1:1", rong=64, cao=64)
    )
    assert str(bat[0].url).endswith("/generate/core")
    assert kq.model_version == StabilityBackgroundProvider.model_version


def test_phong_cuc_bo_khong_co_bac_chat_luong_cao():
    kq = LocalStudioBackground("clean_white").generate(BackgroundRequest(ratio="1:1", rong=32, cao=32, quality="high"))
    assert "quality" in kq.bo_qua


# ─── Giấy phép mô hình tách nền (D18) ───────────────────────────────────────


def test_mo_hinh_mac_dinh_dung_duoc_thuong_mai(monkeypatch):
    monkeypatch.delenv("VARIANT_SEGMENTATION_MODEL", raising=False)
    ten = mo_hinh.mo_hinh_tach_nen()
    gp = mo_hinh.giay_phep(ten)
    assert gp is not None and gp.commercial_use
    assert mo_hinh.giay_phep("bria-rmbg").commercial_use is False


def test_env_van_de_duoc_mo_hinh(monkeypatch):
    monkeypatch.setenv("VARIANT_SEGMENTATION_MODEL", "u2netp")
    assert mo_hinh.mo_hinh_tach_nen() == "u2netp"


def test_cache_tach_nen_theo_ten_mo_hinh(tmp_path):
    a = variant_worker._duong_dan_cache_chu_the(tmp_path, "m-1", "u2netp")
    b = variant_worker._duong_dan_cache_chu_the(tmp_path, "m-1", "isnet-general-use")
    assert a != b


# ─── Chấm kỹ thuật ──────────────────────────────────────────────────────────


def test_cham_ky_thuat_phan_biet_anh_tot_va_anh_loi():
    rng = np.random.default_rng(1)
    h, w = 1024, 576
    mat_na = np.zeros((h, w), dtype=np.uint8)
    mat_na[300:800, 150:430] = 255
    tot = np.full((h, w, 3), 205, dtype=np.uint8)
    tot[300:800, 150:430] = rng.integers(40, 250, (500, 280, 3), dtype=np.uint8)  # hoa nhiều chi tiết
    loi = np.full((h, w, 3), 205, dtype=np.uint8)
    loi[300:800, 150:430] = 200  # "bó hoa" bệt, trùng màu nền
    loi[:200] = 30  # dải đệm tối phía trên
    d_tot = cham_ky_thuat(Image.fromarray(tot), Image.fromarray(mat_na))
    d_loi = cham_ky_thuat(Image.fromarray(loi), Image.fromarray(mat_na))
    assert d_tot["score"] > d_loi["score"] + 25
    assert set(d_tot["components"]) == {"do_net", "phoi_sang", "tach_nen", "bo_cuc", "khong_dem", "hai_hoa"}
    assert 0 <= d_loi["score"] <= 100 and d_tot["version"]


def test_styled_co_diem_tham_my(monkeypatch):
    master, rgba, alpha = _master_co_tay()
    monkeypatch.setattr(variant_worker, "_doan_chu_the", lambda *_a, **_k: (rgba, alpha))
    bien_the, _, _ = dung_bien_the(_anh_bytes(master), "studio_white", "4:5", watermark=False, logo_bytes=None, ten_tiem=None)
    styled = next(b for b in bien_the if b["key"] == "styled")
    assert 0 < styled["aesthetic"]["score"] <= 100


# ─── Mẫu số "thân đo được" của cổng Subject Integrity ───────────────────────


def test_san_pham_nhieu_chi_tiet_manh_khong_bi_coi_la_khong_kiem_duoc():
    """Hồi quy 25/09 (giỏ GHCB0001 + isnet): thân lớn + rất nhiều cành mảnh.
    Lõi trùng khít 100% và phủ hết phần thân đo được → phải đạt, không 0,52."""
    from media_ai.jobs.variant_worker import _do_lo_chu_the

    master = Image.fromarray(np.random.default_rng(3).integers(0, 255, (300, 300, 3), dtype=np.uint8))
    a = np.zeros((300, 300), dtype=np.uint8)
    a[100:220, 100:220] = 255
    for i in range(0, 300, 12):  # 25 "cành" mảnh 4 px, dài
        a[i:i + 4, 0:300] = np.maximum(a[i:i + 4, 0:300], 200)
    assert _do_lo_chu_the(master, master.convert("RGBA"), Image.fromarray(a)) == 1.0
