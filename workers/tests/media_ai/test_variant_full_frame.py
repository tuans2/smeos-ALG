"""Đợt 1 nâng cấp chất lượng ảnh biến thể (24/09/2026) — khung đúng tỉ lệ đích.

Đo gốc trên 72 ảnh thật (`scripts/cham-bien-the.py`): 31,9% diện tích khung là
dải màu đệm. Test khoá bằng dữ liệu thuần (không Postgres, không mạng):

1. `tinh_bo_cuc`: khung đúng tỉ lệ, bó hoa nằm trọn trong khung, cỡ theo `shot`.
2. `fill_mode="full_frame"`: không còn dải đệm; hậu cảnh xin ĐÚNG tỉ lệ đích.
3. Subject Integrity vẫn 1,0 ở mọi bố cục (đo trên vùng căn lại toạ độ gốc).
4. `fill_mode="pad"` giữ hành vi cũ.
5. Adapter Stability: aspect_ratio = tỉ lệ đích, luôn gửi + trả seed, prompt
   mang ánh sáng/cỡ cảnh/bảng màu dịch sang tiếng Anh; màu không dịch được bị
   ghi vào `bo_qua`, không âm thầm bỏ.
"""

from __future__ import annotations

from io import BytesIO

import httpx
import numpy as np
import pytest
from PIL import Image

from media_ai.image.composition import tinh_bo_cuc
from media_ai.jobs import variant_worker
from media_ai.jobs.variant_worker import RATIO_PRESETS, dung_bien_the
from media_ai.providers.background.base import BackgroundRequest, dich_mau, dung_prompt_hau_canh
from media_ai.providers.background.local_studio import LocalStudioBackground
from media_ai.providers.background.stability_background import StabilityBackgroundProvider


def _anh_bytes(anh: Image.Image, fmt: str = "PNG") -> bytes:
    buf = BytesIO()
    anh.save(buf, format=fmt)
    return buf.getvalue()


@pytest.fixture
def khong_tach_that(monkeypatch):
    """Master 200×200 nền xám, "bó hoa" 100×100 có hoạ tiết ở (50..150)."""
    master = Image.new("RGB", (200, 200), (128, 128, 128))
    arr = np.array(master)
    for y in range(50, 150):
        for x in range(50, 150):
            arr[y, x] = (200 + (x % 40), 20 + (y % 30), 40)
    master = Image.fromarray(arr)
    a = np.zeros((200, 200), dtype=np.uint8)
    a[50:150, 50:150] = 255
    alpha = Image.fromarray(a)
    rgba = master.convert("RGBA")
    rgba.putalpha(alpha)
    monkeypatch.setattr(variant_worker, "_doan_chu_the", lambda *_a, **_k: (rgba, alpha))
    return master


def _hang_phang(anh: Image.Image, hang: int) -> bool:
    a = np.asarray(anh.convert("RGB")).astype(np.int16)[hang]
    return int((a.max(axis=0) - a.min(axis=0)).max()) <= 2


# ─── 1. Bố cục ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize("ratio", ["1:1", "4:5", "9:16", "16:9"])
@pytest.mark.parametrize("shot", ["close", "medium", "wide"])
def test_bo_cuc_dung_ti_le_va_bo_hoa_nam_tron(ratio: str, shot: str):
    bc = tinh_bo_cuc(300, 420, ratio, shot=shot)
    rw, rh = (int(x) for x in ratio.split(":"))
    assert abs(bc.rong / bc.cao - rw / rh) < 0.01
    assert 0 <= bc.x and bc.x + 300 <= bc.rong
    assert 0 <= bc.y and bc.y + 420 <= bc.cao


def test_shot_can_canh_lam_bo_hoa_chiem_nhieu_khung_hon():
    ty_le = {s: 420 / tinh_bo_cuc(300, 420, "9:16", shot=s).cao for s in ("close", "medium", "wide")}
    assert ty_le["close"] > ty_le["medium"] > ty_le["wide"]


def test_placement_mot_phan_ba():
    trai = tinh_bo_cuc(100, 300, "16:9", shot="wide", placement="left_third")
    phai = tinh_bo_cuc(100, 300, "16:9", shot="wide", placement="right_third")
    assert trai.x + 50 < trai.rong / 2 < phai.x + 50


@pytest.mark.parametrize("shot", ["close", "medium", "wide"])
def test_tran_phong_khong_qua_2_lan(shot: str):
    # Bó hoa gốc nhỏ (200 px) vào khung xuất 9:16 cao 1920.
    bc = tinh_bo_cuc(150, 200, "9:16", shot=shot, cao_xuat=1920)
    assert 1920 / bc.cao <= 2.0 + 1e-9
    assert abs(bc.rong / bc.cao - 9 / 16) < 0.01


def test_gia_tri_la_lui_ve_mac_dinh():
    bc = tinh_bo_cuc(100, 100, "7:x", shot="macro", placement="top")
    assert (bc.shot, bc.placement) == ("medium", "center")
    assert bc.rong == bc.cao  # tỉ lệ lạ → 1:1


# ─── 2–4. dung_bien_the ─────────────────────────────────────────────────────


def test_full_frame_khong_con_dai_dem(khong_tach_that):
    bien_the, do_trung, _ = dung_bien_the(
        _anh_bytes(khong_tach_that), "wood_minimal", "9:16",
        watermark=False, logo_bytes=None, ten_tiem=None,
    )
    styled = next(b for b in bien_the if b["key"] == "styled")
    anh = styled["image"]
    assert anh.size == RATIO_PRESETS["9:16"]
    assert not _hang_phang(anh, 0) and not _hang_phang(anh, anh.height - 1)
    assert do_trung == 1.0
    x, y, w, h = styled["subject_box"]
    assert 0 <= x and x + w <= anh.width and 0 <= y and y + h <= anh.height
    assert styled["composition"]["fill_mode"] == "full_frame"


def test_pad_giu_hanh_vi_cu(khong_tach_that):
    goi: list = []
    bien_the, _, _ = dung_bien_the(
        _anh_bytes(khong_tach_that), "wood_minimal", "9:16",
        watermark=False, logo_bytes=None, ten_tiem=None, fill_mode="pad",
        nguon_hau_canh=lambda *a: goi.append(a),
    )
    anh = next(b for b in bien_the if b["key"] == "styled")["image"]
    assert _hang_phang(anh, 0)  # dải đệm như trước
    assert goi == []  # pad không xin hậu cảnh theo khung


@pytest.mark.parametrize("ratio", ["1:1", "4:5", "9:16", "16:9"])
def test_hau_canh_xin_dung_ti_le_dich_va_phu_kin_khung(khong_tach_that, ratio: str):
    goi: list[tuple[str, int, int]] = []

    def nguon(r: str, rong: int, cao: int) -> Image.Image:
        goi.append((r, rong, cao))
        return Image.new("RGB", (64, 64), (10, 200, 30))  # nhà cung cấp trả khác kích thước

    bien_the, do_trung, _ = dung_bien_the(
        _anh_bytes(khong_tach_that), "luxury_hotel", ratio,
        watermark=False, logo_bytes=None, ten_tiem=None, nguon_hau_canh=nguon,
    )
    assert len(goi) == 1 and goi[0][0] == ratio
    rw, rh = (int(x) for x in ratio.split(":"))
    assert abs(goi[0][1] / goi[0][2] - rw / rh) < 0.01
    anh = next(b for b in bien_the if b["key"] == "styled")["image"].convert("RGB")
    for goc in [(2, 2), (anh.width - 3, 2), (2, anh.height - 3), (anh.width - 3, anh.height - 3)]:
        r, g, b = anh.getpixel(goc)
        assert g > 150 and r < 80, f"góc {goc} không phải hậu cảnh: {(r, g, b)}"
    assert do_trung == 1.0


def test_nguon_hau_canh_tra_none_thi_dung_phong_cuc_bo(khong_tach_that):
    bien_the, do_trung, _ = dung_bien_the(
        _anh_bytes(khong_tach_that), "studio_white", "4:5",
        watermark=False, logo_bytes=None, ten_tiem=None, nguon_hau_canh=lambda *_a: None,
    )
    assert do_trung == 1.0
    assert next(b for b in bien_the if b["key"] == "styled")["image"].size == RATIO_PRESETS["4:5"]


@pytest.mark.parametrize("shot", ["close", "medium", "wide"])
@pytest.mark.parametrize("placement", ["center", "left_third", "right_third"])
def test_subject_integrity_van_tuyet_doi_moi_bo_cuc(khong_tach_that, shot: str, placement: str):
    _, do_trung, _ = dung_bien_the(
        _anh_bytes(khong_tach_that), "wedding", "16:9",
        watermark=False, logo_bytes=None, ten_tiem=None,
        composition={"shot": shot, "placement": placement},
    )
    assert do_trung == 1.0


def test_huong_sang_doi_bong(khong_tach_that):
    def dung(huong: str) -> np.ndarray:
        bt, _, _ = dung_bien_the(
            _anh_bytes(khong_tach_that), "studio_white", "1:1",
            watermark=False, logo_bytes=None, ten_tiem=None, lighting={"direction": huong},
        )
        return np.asarray(next(b for b in bt if b["key"] == "styled")["image"].convert("L")).astype(int)

    trai, phai = dung("left"), dung("right")
    giua = trai.shape[1] // 2
    # Sáng từ trái → bóng nghiêng sang phải: nửa phải tối hơn so với khi sáng từ phải.
    assert trai[:, giua:].sum() < phai[:, giua:].sum()


# ─── 5. Adapter nhà cung cấp ────────────────────────────────────────────────


def _client_gia(bat: list[dict]) -> httpx.Client:
    def xu_ly(req: httpx.Request) -> httpx.Response:
        bat.append({"body": req.content})
        return httpx.Response(200, content=_anh_bytes(Image.new("RGB", (90, 160), (1, 2, 3))), headers={"content-type": "image/png"})

    return httpx.Client(transport=httpx.MockTransport(xu_ly))


def test_stability_generate_gui_ti_le_dich_seed_va_prompt():
    bat: list[dict] = []
    p = StabilityBackgroundProvider(api_key="k", client=_client_gia(bat))
    kq = p.generate(
        BackgroundRequest(
            ratio="9:16", rong=500, cao=500,  # kích thước khác tỉ lệ — vẫn phải gửi 9:16
            scene_prompt="warm restaurant table at dusk", lighting_direction="right",
            palette=("đỏ", "kem", "màu lạ"), shot="wide", seed=1234,
        )
    )
    body = bat[0]["body"].decode("utf-8", "ignore")
    assert 'name="aspect_ratio"\r\n\r\n9:16' in body
    assert 'name="seed"\r\n\r\n1234' in body
    assert kq.seed == 1234 and kq.aspect_ratio == "9:16"
    assert "from the right" in kq.prompt and "red, cream" in kq.prompt and "wide" in kq.prompt
    assert "no flowers" in kq.prompt
    assert any(b.startswith("palette:") for b in kq.bo_qua)
    assert kq.anh.size == (90, 160)


def test_stability_khong_truyen_seed_thi_tu_boc_va_tra_ve():
    bat: list[dict] = []
    kq = StabilityBackgroundProvider(api_key="k", client=_client_gia(bat)).generate(
        BackgroundRequest(ratio="4:5", rong=400, cao=500)
    )
    assert kq.seed is not None and 0 <= kq.seed <= StabilityBackgroundProvider.SEED_TOI_DA
    assert f'name="seed"\r\n\r\n{kq.seed}' in bat[0]["body"].decode("utf-8", "ignore")


def test_prompt_mood_tieng_viet_bi_ghi_bo_qua():
    prompt, bo_qua = dung_prompt_hau_canh(
        BackgroundRequest(ratio="1:1", rong=10, cao=10, lighting_mood="nắng sớm ấm áp")
    )
    assert "nắng" not in prompt and "lighting_mood" in bo_qua


def test_dich_mau():
    dung, bo = dich_mau(["Đỏ", "hồng pastel", "sage green", "màu gì đó"])
    assert dung == ["red", "pastel pink", "sage green"] and bo == ["màu gì đó"]


def test_phong_cuc_bo_noi_that_ve_nang_luc():
    kq = LocalStudioBackground("clean_white").generate(
        BackgroundRequest(ratio="9:16", rong=90, cao=160, scene_prompt="x", seed=7)
    )
    assert kq.anh.size == (90, 160)
    # Đợt 2 (25/09/2026): seed có tác dụng thật với phông cục bộ (vùng sáng, bokeh).
    assert "prompt" in kq.bo_qua and "seed" not in kq.bo_qua
    assert kq.seed == 7
    assert LocalStudioBackground.nang_luc.seed is True


def test_quang_mo_khong_lam_sai_bo_cuc_va_khong_dung_loi(monkeypatch):
    """Quầng alpha mờ lác đác ở góc ảnh (mô hình tách nền) không được kéo phình hộp bố cục."""
    master = Image.new("RGB", (200, 200), (128, 128, 128))
    arr = np.array(master)
    arr[50:150, 50:150] = (220, 30, 40)
    master = Image.fromarray(arr)
    a = np.zeros((200, 200), dtype=np.uint8)
    a[50:150, 50:150] = 255
    a[2:4, 2:4] = 10  # nhiễu mờ ở góc
    alpha = Image.fromarray(a)
    rgba = master.convert("RGBA")
    rgba.putalpha(alpha)
    monkeypatch.setattr(variant_worker, "_doan_chu_the", lambda *_a, **_k: (rgba, alpha))
    bien_the, do_trung, _ = dung_bien_the(
        _anh_bytes(master), "studio_white", "1:1",
        watermark=False, logo_bytes=None, ten_tiem=None, composition={"shot": "medium"},
    )
    styled = next(b for b in bien_the if b["key"] == "styled")
    _, _, w, h = styled["subject_box"]
    anh = styled["image"]
    # Hộp theo THÂN 100×100 px, không theo nhiễu ở góc (nếu theo nhiễu: 148×148).
    bc = tinh_bo_cuc(100, 100, "1:1", shot="medium", cao_xuat=anh.height)
    assert abs(h - 100 * anh.height / bc.cao) <= 2 and abs(w - h) <= 2
    assert do_trung == 1.0
