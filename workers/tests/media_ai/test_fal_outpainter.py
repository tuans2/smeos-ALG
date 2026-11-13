"""Tests cho `FalAIOutpainter` (AIC-13, nợ #105, tiếp #78/#104, 18/09).

Cùng nguyên tắc `test_iopaint_outpainter.py`/`test_expansion_router.py`:
PHẢI chạy được không cần `FAL_KEY` thật (chốt qua AskUserQuestion 18/09 —
"chưa có key, cứ viết mã theo đúng khuôn provider có sẵn"). Việc kiểm được
một cách đáng tin cậy ngay bây giờ:

1. Lùi về `PadExpander` khi thiếu `FAL_KEY` / lỗi mạng / không bao giờ đạt
   `status == "COMPLETED"` (poll hết lượt).
2. Hình dạng REQUEST đúng lược đồ đã xác minh từ tài liệu chính thức
   fal.ai (endpoint hàng đợi, header `Authorization: Key`, các trường
   `canvas_size`/`original_image_size`/`original_image_location`).
3. `toa_do_bria()` — hàm thuần, kiểm độc lập với mạng.

KHÔNG kiểm ở đây (cần `FAL_KEY` thật, ngoài phạm vi môi trường soạn mã):
chất lượng nội dung sinh thêm, độ trễ thật, có chạm giới hạn kích thước
request khi gửi data URI cho ảnh sản phẩm lớn hay không (xem docstring
`fal_outpainter.py`, mục "Đánh đổi đã biết").
"""

from __future__ import annotations

import base64
import json
from io import BytesIO

import httpx
from PIL import Image

from media_ai.image.ratio_frame import RATIO_PRESETS
from media_ai.providers.expansion import fal_outpainter
from media_ai.providers.expansion.fal_outpainter import FalAIOutpainter, toa_do_bria
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


def test_resolve_expander_fal():
    assert "fal_bria_expand" in EXPANDER_REGISTRY
    expander = resolve_expander("fal_bria_expand")
    assert isinstance(expander, FalAIOutpainter)
    assert expander.name == "fal_bria_expand"
    assert expander.model_version == "fal-ai/bria/expand"


def test_resolve_expander_fal_tra_instance_moi_moi_lan():
    a = resolve_expander("fal_bria_expand")
    b = resolve_expander("fal_bria_expand")
    assert a is not b


# ─── Lùi về Pad ─────────────────────────────────────────────────────────


def test_fal_lui_ve_pad_khi_thieu_key():
    expander = FalAIOutpainter(api_key=None)
    ket_qua = expander.expand(_anh_mau_bytes(), "9:16")
    anh_ra = Image.open(BytesIO(ket_qua["image"]))
    assert anh_ra.size == RATIO_PRESETS["9:16"]
    assert ket_qua["generated_flags"]["generative_fill_used"] is False
    assert expander.muc_dung_lan_cuoi is None


def test_fal_lui_ve_pad_khi_mang_loi(monkeypatch):
    expander = FalAIOutpainter(api_key="key-gia-de-test")

    def _goi_loi(self, image_url, canvas_size, original_image_size, original_image_location):
        raise RuntimeError("giả lập lỗi mạng/schema")

    monkeypatch.setattr(FalAIOutpainter, "_goi_queue", _goi_loi)

    ket_qua = expander.expand(_anh_mau_bytes(), "1:1")
    anh_ra = Image.open(BytesIO(ket_qua["image"]))
    assert anh_ra.size == RATIO_PRESETS["1:1"]
    assert ket_qua["generated_flags"]["generative_fill_used"] is False
    assert expander.muc_dung_lan_cuoi is None


def test_fal_lui_ve_pad_khi_khong_bao_gio_completed(monkeypatch):
    """Poll hết lượt mà status không bao giờ là `COMPLETED` — coi là lỗi,
    lùi về Pad. Rút khoảng cách poll về 0 để test không chờ thật (mặc định
    30 lần x 2s = 60s)."""
    monkeypatch.setattr(fal_outpainter, "_KHOANG_CACH_POLL_S", 0.0)

    def _luon_dang_xu_ly(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            return httpx.Response(
                200,
                json={
                    "request_id": "req-1",
                    "status_url": "http://fal.local/requests/req-1/status",
                    "response_url": "http://fal.local/requests/req-1",
                },
            )
        # Mọi lượt GET status đều còn đang xử lý, không bao giờ xong.
        return httpx.Response(200, json={"status": "IN_PROGRESS"})

    expander = FalAIOutpainter(api_key="key-gia-de-test", client=_client_gia(_luon_dang_xu_ly))
    ket_qua = expander.expand(_anh_mau_bytes(), "1:1")
    anh_ra = Image.open(BytesIO(ket_qua["image"]))
    assert anh_ra.size == RATIO_PRESETS["1:1"]
    assert ket_qua["generated_flags"]["generative_fill_used"] is False
    assert expander.muc_dung_lan_cuoi is None


def test_fal_lui_ve_pad_khi_response_thieu_image_url(monkeypatch):
    monkeypatch.setattr(fal_outpainter, "_KHOANG_CACH_POLL_S", 0.0)

    def _handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            return httpx.Response(
                200,
                json={
                    "request_id": "req-1",
                    "status_url": "http://fal.local/requests/req-1/status",
                    "response_url": "http://fal.local/requests/req-1",
                },
            )
        if str(request.url).endswith("/status"):
            return httpx.Response(200, json={"status": "COMPLETED"})
        # Kết quả cuối KHÔNG có trường `image` — lược đồ hỏng/đổi.
        return httpx.Response(200, json={"seed": 42})

    expander = FalAIOutpainter(api_key="key-gia-de-test", client=_client_gia(_handler))
    ket_qua = expander.expand(_anh_mau_bytes(), "1:1")
    assert ket_qua["generated_flags"]["generative_fill_used"] is False
    assert expander.muc_dung_lan_cuoi is None


def test_fal_reset_muc_dung_dau_moi_luot():
    expander = FalAIOutpainter(api_key=None)
    expander.muc_dung_lan_cuoi = "gia-tri-cu-con-sot-lai"  # type: ignore[assignment]
    expander.expand(_anh_mau_bytes(), "1:1")
    assert expander.muc_dung_lan_cuoi is None


# ─── Đường thành công (submit → poll → result → tải ảnh) ────────────────


def test_fal_thanh_cong_tra_dung_hinh_dang(monkeypatch):
    monkeypatch.setattr(fal_outpainter, "_KHOANG_CACH_POLL_S", 0.0)
    rong_dich, cao_dich = RATIO_PRESETS["1:1"]
    anh_ra_bytes = _png_bytes((rong_dich, cao_dich))
    goi_duoc: list[httpx.Request] = []

    def _handler(request: httpx.Request) -> httpx.Response:
        goi_duoc.append(request)
        if request.method == "POST" and str(request.url) == fal_outpainter._QUEUE_BASE:
            return httpx.Response(
                200,
                json={
                    "request_id": "req-1",
                    "status_url": f"{fal_outpainter._QUEUE_BASE}/requests/req-1/status",
                    "response_url": f"{fal_outpainter._QUEUE_BASE}/requests/req-1",
                },
            )
        if str(request.url).endswith("/requests/req-1/status"):
            return httpx.Response(200, json={"status": "COMPLETED"})
        if str(request.url).endswith("/requests/req-1"):
            return httpx.Response(
                200,
                json={
                    "image": {
                        "url": "http://fal.local/out.png",
                        "width": rong_dich,
                        "height": cao_dich,
                    },
                    "seed": 7,
                },
            )
        if str(request.url) == "http://fal.local/out.png":
            return httpx.Response(200, content=anh_ra_bytes)
        raise AssertionError(f"URL không mong đợi: {request.url}")

    expander = FalAIOutpainter(api_key="key-gia-de-test", client=_client_gia(_handler))
    ket_qua = expander.expand(
        _anh_mau_bytes((200, 150)), "1:1", product_mask=_png_bytes((200, 150), color=0)
    )

    anh_ra = Image.open(BytesIO(ket_qua["image"]))
    assert anh_ra.size == (rong_dich, cao_dich)
    assert ket_qua["generated_flags"]["generative_fill_used"] is True
    assert ket_qua["parameters"]["model"] == "fal-ai/bria/expand"
    assert ket_qua["parameters"]["product_mask_provided"] is True
    assert ket_qua["parameters"]["paste_offset"] == [
        (rong_dich - 200) // 2,
        (cao_dich - 150) // 2,
    ]
    assert expander.muc_dung_lan_cuoi is not None
    assert expander.muc_dung_lan_cuoi.so_lan_goi == 1


def test_fal_goi_dung_endpoint_va_tham_so(monkeypatch):
    """Hình dạng request đã xác minh từ tài liệu chính thức fal.ai:
    endpoint hàng đợi `queue.fal.run`, header `Authorization: Key` (KHÔNG
    phải `Bearer` như Replicate), `canvas_size`/`original_image_size`/
    `original_image_location` đúng tên trường."""
    monkeypatch.setattr(fal_outpainter, "_KHOANG_CACH_POLL_S", 0.0)
    rong_dich, cao_dich = RATIO_PRESETS["1:1"]
    goi_duoc: dict = {}

    def _handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            goi_duoc["url"] = str(request.url)
            goi_duoc["headers"] = dict(request.headers)
            goi_duoc["body"] = json.loads(request.content)
            return httpx.Response(
                200,
                json={
                    "request_id": "req-1",
                    "status_url": f"{fal_outpainter._QUEUE_BASE}/requests/req-1/status",
                    "response_url": f"{fal_outpainter._QUEUE_BASE}/requests/req-1",
                },
            )
        if str(request.url).endswith("/status"):
            return httpx.Response(200, json={"status": "COMPLETED"})
        return httpx.Response(200, json={"image": {"url": "http://fal.local/out.png"}})

    def _handler_full(request: httpx.Request) -> httpx.Response:
        if str(request.url) == "http://fal.local/out.png":
            return httpx.Response(200, content=_png_bytes((rong_dich, cao_dich)))
        return _handler(request)

    expander = FalAIOutpainter(api_key="chiakhoa-gia", client=_client_gia(_handler_full))
    expander.expand(_anh_mau_bytes((200, 150)), "1:1")

    assert goi_duoc["url"] == "https://queue.fal.run/fal-ai/bria/expand"
    assert goi_duoc["headers"]["authorization"] == "Key chiakhoa-gia"
    body = goi_duoc["body"]
    assert body["canvas_size"] == [max(rong_dich, 200), max(cao_dich, 150)]
    assert body["original_image_size"] == [200, 150]
    assert body["original_image_location"] == [
        (max(rong_dich, 200) - 200) // 2,
        (max(cao_dich, 150) - 150) // 2,
    ]
    # `image_url` gửi data URI base64 — xem "Đánh đổi đã biết" trong docstring.
    assert body["image_url"].startswith("data:image/png;base64,")
    base64.b64decode(body["image_url"].split(",", 1)[1])


# ─── `toa_do_bria` — hàm thuần ───────────────────────────────────────────


def test_toa_do_bria_dat_giua_va_khong_doi_dau():
    canvas_size, original_image_size, original_image_location = toa_do_bria(200, 150, 1024, 1024)
    dem_trai = (1024 - 200) // 2
    dem_tren = (1024 - 150) // 2

    assert canvas_size == [1024, 1024]
    assert original_image_size == [200, 150]
    # KHÔNG đổi dấu như `extender_x/y` của IOPaint — toạ độ dương thẳng.
    assert original_image_location == [dem_trai, dem_tren]


def test_toa_do_bria_khong_co_nho_hon_anh_goc():
    canvas_size, original_image_size, original_image_location = toa_do_bria(2000, 150, 1024, 1024)
    assert canvas_size[0] == 2000
    assert original_image_size == [2000, 150]
    assert original_image_location[0] == 0


# ─── `PadExpander` vẫn nhận `product_mask` (bỏ qua) ─────────────────────


def test_pad_expander_nhan_product_mask_khong_doi_hanh_vi():
    expander = PadExpander()
    ket_qua = expander.expand(_anh_mau_bytes(), "1:1", product_mask=b"khong-dung-toi")
    assert ket_qua["generated_flags"]["generative_fill_used"] is False
