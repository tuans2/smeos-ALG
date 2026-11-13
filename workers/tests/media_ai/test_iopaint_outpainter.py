"""Tests cho `IOPaintExpander` (AIC-13, nợ #104, tiếp #78, 17/09).

Cùng nguyên tắc `test_expansion_router.py::ReplicateOutpainter`: PHẢI chạy
được không cần một server IOPaint thật (không có GPU/model SD-inpainting
trong môi trường viết mã này). Ba việc kiểm được một cách đáng tin cậy
ngay bây giờ:

1. Lùi về `PadExpander` khi thiếu `IOPAINT_URL` / lỗi mạng / kích thước trả
   về sai (silent no-op đã xác minh thật, xem `iopaint_outpainter.py`).
2. Hình dạng REQUEST gửi lên đúng những gì đã xác minh từ mã nguồn thật
   `iopaint==1.6.0` (endpoint, `use_extender`, `extender_*`, không gọi
   `resp.json()`).
3. `toa_do_extender()` — hàm thuần, kiểm độc lập với mạng — cho ra đúng
   `paste_offset` mà `variant_worker.py::_dan_lai_chu_the` sẽ dùng.

KHÔNG kiểm ở đây (cần GPU + model SD/SDXL-inpainting thật, ngoài phạm vi
môi trường soạn mã — xem tài liệu "Tích hợp IOPaint Outpainting vào
floraos-core", mục "Rủi ro"): chất lượng nội dung sinh thêm, giấy phép
model, độ trễ thật.
"""

from __future__ import annotations

import base64
import json
from io import BytesIO

import httpx
import pytest
from PIL import Image

from media_ai.image.ratio_frame import RATIO_PRESETS
from media_ai.providers.expansion.iopaint_outpainter import (
    IOPaintExpander,
    toa_do_extender,
)
from media_ai.providers.expansion.pad_expander import PadExpander
from media_ai.providers.expansion.router import EXPANDER_REGISTRY, resolve_expander


def _anh_mau_bytes(size: tuple[int, int] = (200, 150)) -> bytes:
    img = Image.new("RGB", size, color=(255, 0, 0))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _png_bytes(size: tuple[int, int], color=(10, 20, 30)) -> bytes:
    img = Image.new("RGB", size, color=color)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _client_gia(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


# ─── Router ─────────────────────────────────────────────────────────────


def test_resolve_expander_iopaint():
    assert "iopaint" in EXPANDER_REGISTRY
    expander = resolve_expander("iopaint")
    assert isinstance(expander, IOPaintExpander)
    assert expander.name == "iopaint"


def test_resolve_expander_iopaint_tra_instance_moi_moi_lan():
    a = resolve_expander("iopaint")
    b = resolve_expander("iopaint")
    assert a is not b


# ─── Lùi về Pad ─────────────────────────────────────────────────────────


def test_iopaint_lui_ve_pad_khi_thieu_url():
    expander = IOPaintExpander(base_url=None)
    ket_qua = expander.expand(_anh_mau_bytes(), "9:16")
    anh_ra = Image.open(BytesIO(ket_qua["image"]))
    assert anh_ra.size == RATIO_PRESETS["9:16"]
    assert ket_qua["generated_flags"]["generative_fill_used"] is False
    assert expander.muc_dung_lan_cuoi is None


def test_iopaint_lui_ve_pad_khi_mang_loi():
    def _loi(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("giả lập mất kết nối tới IOPaint", request=request)

    expander = IOPaintExpander(base_url="http://iopaint.local:8080", client=_client_gia(_loi))
    ket_qua = expander.expand(_anh_mau_bytes(), "1:1")
    anh_ra = Image.open(BytesIO(ket_qua["image"]))
    assert anh_ra.size == RATIO_PRESETS["1:1"]
    assert ket_qua["generated_flags"]["generative_fill_used"] is False
    assert expander.muc_dung_lan_cuoi is None


def test_iopaint_phat_hien_silent_no_op_lui_ve_pad():
    """Đã xác minh THẬT (xem docstring `iopaint_outpainter.py`):
    `use_extender=true` trên model không hỗ trợ outpainting (vd LaMa) trả
    `200 OK` nhưng KHÔNG mở rộng canvas — ảnh ra vẫn đúng kích thước ảnh
    vào. `expand()` phải tự bắt được ca này, không được tin HTTP 200."""

    def _tra_anh_khong_mo_rong(request: httpx.Request) -> httpx.Response:
        # Trả về ĐÚNG kích thước ảnh gốc (200x150) — mô phỏng model sai.
        return httpx.Response(200, content=_png_bytes((200, 150)))

    expander = IOPaintExpander(
        base_url="http://iopaint.local:8080",
        model="lama",
        client=_client_gia(_tra_anh_khong_mo_rong),
    )
    ket_qua = expander.expand(_anh_mau_bytes(), "1:1")
    anh_ra = Image.open(BytesIO(ket_qua["image"]))
    # Lùi về Pad thật sự — đúng kích thước preset, không sinh nội dung mới.
    assert anh_ra.size == RATIO_PRESETS["1:1"]
    assert ket_qua["generated_flags"]["generative_fill_used"] is False
    assert expander.muc_dung_lan_cuoi is None


# ─── Đường thành công (canvas mở rộng đúng) ─────────────────────────────


def test_iopaint_thanh_cong_tra_dung_hinh_dang():
    rong_dich, cao_dich = RATIO_PRESETS["1:1"]

    def _tra_anh_mo_rong(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=_png_bytes((rong_dich, cao_dich)))

    expander = IOPaintExpander(
        base_url="http://iopaint.local:8080",
        model="stable-diffusion-inpainting",
        client=_client_gia(_tra_anh_mo_rong),
    )
    ket_qua = expander.expand(_anh_mau_bytes((200, 150)), "1:1", product_mask=_png_bytes((200, 150), color=0))

    anh_ra = Image.open(BytesIO(ket_qua["image"]))
    assert anh_ra.size == (rong_dich, cao_dich)
    assert ket_qua["generated_flags"]["generative_fill_used"] is True
    assert ket_qua["parameters"]["model"] == "stable-diffusion-inpainting"
    assert ket_qua["parameters"]["product_mask_provided"] is True
    assert ket_qua["parameters"]["paste_offset"] == [
        (rong_dich - 200) // 2,
        (cao_dich - 150) // 2,
    ]
    assert expander.muc_dung_lan_cuoi is not None
    assert expander.muc_dung_lan_cuoi.so_lan_goi == 1


def test_iopaint_goi_dung_endpoint_va_tham_so():
    """Hình dạng request đã xác minh thật từ mã nguồn `iopaint==1.6.0`:
    endpoint `POST /api/v1/inpaint`, `use_extender=true` +
    `extender_x/y/width/height`, KHÔNG có bọc `input`/`version` kiểu
    Replicate."""
    rong_dich, cao_dich = RATIO_PRESETS["1:1"]
    goi_duoc: dict = {}

    def _bat_request(request: httpx.Request) -> httpx.Response:
        goi_duoc["url"] = str(request.url)
        goi_duoc["body"] = json.loads(request.content)
        return httpx.Response(200, content=_png_bytes((rong_dich, cao_dich)))

    expander = IOPaintExpander(
        base_url="http://iopaint.local:8080/",
        client=_client_gia(_bat_request),
    )
    expander.expand(_anh_mau_bytes((200, 150)), "1:1")

    assert goi_duoc["url"] == "http://iopaint.local:8080/api/v1/inpaint"
    body = goi_duoc["body"]
    assert body["use_extender"] is True
    assert body["extender_width"] == max(rong_dich, 200)
    assert body["extender_height"] == max(cao_dich, 150)
    assert "image" in body and "mask" in body
    # `image`/`mask` gửi base64 — không phải data URI kiểu Replicate.
    base64.b64decode(body["image"])
    base64.b64decode(body["mask"])


# ─── `toa_do_extender` — hàm thuần, đối chiếu công thức đã xác minh ─────


def test_toa_do_extender_dat_giua_va_paste_offset_dung():
    extender, paste_offset = toa_do_extender(200, 150, 1024, 1024)
    dem_trai = (1024 - 200) // 2
    dem_tren = (1024 - 150) // 2

    assert extender["extender_x"] == -dem_trai
    assert extender["extender_y"] == -dem_tren
    assert extender["extender_width"] == 1024
    assert extender["extender_height"] == 1024
    assert paste_offset == (dem_trai, dem_tren)


def test_toa_do_extender_khong_co_nho_hon_anh_goc():
    # Ảnh gốc lớn hơn preset đích ở một chiều — không được co nhỏ ảnh gốc.
    extender, paste_offset = toa_do_extender(2000, 150, 1024, 1024)
    assert extender["extender_width"] == 2000
    assert paste_offset[0] == 0


# ─── `PadExpander`/`ReplicateOutpainter` vẫn nhận `product_mask` (bỏ qua) ──


def test_pad_expander_nhan_product_mask_khong_doi_hanh_vi():
    expander = PadExpander()
    ket_qua = expander.expand(_anh_mau_bytes(), "1:1", product_mask=b"khong-dung-toi")
    assert ket_qua["generated_flags"]["generative_fill_used"] is False


def test_replicate_outpainter_nhan_product_mask_khong_doi_hanh_vi():
    from media_ai.providers.expansion.replicate_outpainter import ReplicateOutpainter

    expander = ReplicateOutpainter(api_token=None)
    ket_qua = expander.expand(_anh_mau_bytes(), "1:1", product_mask=b"khong-dung-toi")
    assert ket_qua["generated_flags"]["generative_fill_used"] is False
