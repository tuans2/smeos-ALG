"""`ReplicateOutpainter` — mở khung bằng model outpainting chuyên dụng
`bria/expand-image` trên Replicate (`AIC-13`, nợ #78, 17/09).

**Lược đồ INPUT CHƯA ĐƯỢC XÁC MINH ĐỘC LẬP.** Đã xác nhận qua mã nguồn một
HuggingFace Space bọc ngoài (`huggingface.co/spaces/wavespeed/bria-expand`)
rằng model nhận trường `image` và `aspect_ratio` (enum `16:9`/`9:16`/`1:1`/
`4:3`/`3:4` — KHÔNG có `4:5`, một trong bốn tỷ lệ chuẩn của M04b, xem
`ANH_XA_TY_LE` bên dưới). CHƯA gọi được thẳng
`api.replicate.com/v1/models/bria/expand-image` để lấy lược đồ gốc — mạng
ra ngoài của môi trường soạn mã này bị chặn ở cấp tổ chức (egress proxy từ
chối CONNECT). Phần khung REST (`POST .../predictions`, header
`Prefer: wait`, đọc `urls.get` để poll khi timeout) là quy ước NỀN TẢNG của
Replicate, tài liệu công khai ổn định — rủi ro thấp hơn nhiều so với tên
trường input riêng của MỘT model cụ thể, và cách gửi ảnh (data URI base64
so với upload riêng qua `files.replicate.com`) cũng chưa được xác minh.

Theo chỉ đạo của người dùng ngày 17/09 ("chuẩn bị đủ cơ chế và codebase đi
đã, khi nào có token tôi test sau"): lớp này được viết ĐẦY ĐỦ ngay bây giờ,
với `REPLICATE_API_TOKEN` để trắng trong `.env`, và tự lùi về `PadExpander`
trên BẤT KỲ lỗi nào — thiếu token, sai schema (Replicate trả 422/4xx), lỗi
mạng, hết thời gian chờ, output không đúng dạng. Một job không bao giờ
được vỡ vì lược đồ chưa xác minh của MỘT model; nó chỉ mất phần "sinh nội
dung mới ở biên" và lùi về đóng khung màu đặc, giống hệt hôm nay.

Việc còn lại khi có token thật: gọi thử, đọc lỗi 4xx (nếu có) để sửa đúng
tên trường/cách gửi ảnh trong `_goi_predictions`, rồi xoá đoạn cảnh báo
này.
"""

from __future__ import annotations

import base64
import logging
import os
import time
from typing import Any

import httpx

from media_ai.providers.base import KetQuaMoRong
from media_ai.providers.chung import MucDungLuot
from media_ai.providers.expansion.pad_expander import PadExpander

log = logging.getLogger("media_ai.providers.expansion.replicate_outpainter")

NAME = "replicate_bria_expand_image"
MODEL_VERSION = "bria/expand-image"

# `4:5` không có trong enum `aspect_ratio` của model (xác nhận qua mã nguồn
# Space bọc ngoài, KHÔNG phải lược đồ gốc) — làm tròn về `3:4`, tỷ lệ GẦN
# NHẤT có sẵn. Đây là một PHÉP XẤP XỈ đã biết trước, không phải giá trị
# đúng — ghi rõ trong `parameters` của kết quả trả về để truy được sau này
# nếu biến thể `4:5` không đúng khung y hệt yêu cầu.
ANH_XA_TY_LE: dict[str, str] = {
    "1:1": "1:1",
    "4:5": "3:4",  # xấp xỉ — model không có 4:5
    "9:16": "9:16",
    "16:9": "16:9",
}

_PREDICTIONS_URL = "https://api.replicate.com/v1/models/bria/expand-image/predictions"
_TRANG_THAI_XONG = {"succeeded", "failed", "canceled"}
_SO_LAN_POLL_TOI_DA = 30
_KHOANG_CACH_POLL_S = 2.0


class ReplicateOutpainter:
    """Gọi `bria/expand-image`. Mọi lỗi (thiếu token, sai schema, mạng,
    timeout) đều lùi về `PadExpander` — xem docstring đầu file. Không bao
    giờ ném lỗi ra khỏi `expand()`."""

    name = NAME
    model_version = MODEL_VERSION

    def __init__(
        self,
        api_token: str | None = None,
        *,
        client: httpx.Client | None = None,
        timeout_s: float = 60.0,
    ) -> None:
        self._api_token = api_token if api_token is not None else os.environ.get("REPLICATE_API_TOKEN")
        self._client = client
        self._timeout_s = timeout_s
        self._pad = PadExpander()
        self.muc_dung_lan_cuoi: MucDungLuot | None = None

    def expand(
        self, image: bytes, ratio: str, product_mask: bytes | None = None
    ) -> KetQuaMoRong:
        # `product_mask` (nợ #104, tham số mới của ImageExpander) bị BỎ QUA
        # ở đây có chủ đích — KHÔNG phải một hồi quy. Đây CHÍNH là lỗ hổng
        # đã ghi nhận (xem docstring đầu file + tài liệu "Tích hợp IOPaint
        # Outpainting vào floraos-core", mục "protectMask"): `bria/expand-image`
        # không có cơ chế mask công khai để gửi, nên `ReplicateOutpainter`
        # vẫn gửi CẢ ẢNH đã ghép mà không kèm mask nào, y hệt trước đợt này.
        # `IOPaintExpander` (iopaint_outpainter.py) là hiện thực đầu tiên lấp
        # đúng lỗ hổng này bằng cơ chế mask tường minh của IOPaint.

        # Reset đầu MỖI lượt gọi — cùng nguyên tắc với `OpenAIEnhancer`
        # (nợ #71): instance có thể bị tái dùng qua nhiều job, số của lượt
        # TRƯỚC không được lọt sang lượt này.
        self.muc_dung_lan_cuoi = None

        if not self._api_token:
            log.info(
                "ReplicateOutpainter: chưa cấu hình REPLICATE_API_TOKEN — lùi về PadExpander"
            )
            return self._pad.expand(image, ratio)

        try:
            aspect_ratio = ANH_XA_TY_LE.get(ratio, "1:1")
            bat_dau = time.monotonic()
            body = self._goi_predictions(image, aspect_ratio)
            anh_ra_bytes = self._tai_anh_ra(body)
            # Chỉ đặt mức dùng SAU khi cả gọi-dự-đoán lẫn tải-ảnh-ra đều
            # thành công — một lượt nửa chừng thất bại không được tính tiền.
            self.muc_dung_lan_cuoi = MucDungLuot(so_lan_goi=1)

            return KetQuaMoRong(
                image=anh_ra_bytes,
                generated_flags={"generative_fill_used": True, "requires_reshoot_warning": False},
                parameters={
                    "ratio": ratio,
                    "method": "replicate_bria_expand_image",
                    "aspect_ratio_goi": aspect_ratio,
                    "aspect_ratio_xap_xi": ratio not in ANH_XA_TY_LE or ANH_XA_TY_LE[ratio] != ratio,
                    "latency_ms": int((time.monotonic() - bat_dau) * 1000),
                },
            )
        except Exception:  # noqa: BLE001 — lược đồ chưa xác minh, xem docstring đầu file
            log.warning(
                "ReplicateOutpainter: lỗi khi gọi bria/expand-image, lùi về PadExpander",
                exc_info=True,
            )
            self.muc_dung_lan_cuoi = None
            return self._pad.expand(image, ratio)

    # ─── Chi tiết gọi mạng — đây là phần CHƯA XÁC MINH, xem docstring ──────

    def _client_hoac_moi(self) -> httpx.Client:
        return self._client if self._client is not None else httpx.Client(timeout=self._timeout_s)

    def _goi_predictions(self, image: bytes, aspect_ratio: str) -> dict[str, Any]:
        """Gửi lượt dự đoán và đợi tới khi xong.

        Ảnh input gửi dạng data URI base64 — cách phổ biến nhất cho input
        kiểu `image` của model Replicate khi không upload qua
        `files.replicate.com` trước. Đây CŨNG là một phần chưa xác minh độc
        lập với `bria/expand-image` cụ thể — cùng mức rủi ro đã nêu ở
        docstring đầu file.
        """
        data_uri = "data:image/png;base64," + base64.b64encode(image).decode("ascii")

        client = self._client_hoac_moi()
        dong_moi = self._client is None
        try:
            resp = client.post(
                _PREDICTIONS_URL,
                headers={
                    "Authorization": f"Bearer {self._api_token}",
                    "Content-Type": "application/json",
                    "Prefer": "wait",
                },
                json={"input": {"image": data_uri, "aspect_ratio": aspect_ratio}},
            )
            resp.raise_for_status()
            body = resp.json()

            trang_thai = body.get("status")
            url_get = (body.get("urls") or {}).get("get")
            so_lan = 0
            while trang_thai not in _TRANG_THAI_XONG and url_get and so_lan < _SO_LAN_POLL_TOI_DA:
                time.sleep(_KHOANG_CACH_POLL_S)
                so_lan += 1
                poll = client.get(url_get, headers={"Authorization": f"Bearer {self._api_token}"})
                poll.raise_for_status()
                body = poll.json()
                trang_thai = body.get("status")

            if trang_thai != "succeeded":
                raise RuntimeError(f"Replicate prediction không thành công: status={trang_thai!r}")

            return body
        finally:
            if dong_moi:
                client.close()

    def _tai_anh_ra(self, body: dict[str, Any]) -> bytes:
        output = body.get("output")
        url_anh = output[0] if isinstance(output, list) and output else output
        if not isinstance(url_anh, str):
            raise RuntimeError(f"Replicate output không phải URL ảnh: {output!r}")

        client = self._client_hoac_moi()
        dong_moi = self._client is None
        try:
            resp = client.get(url_anh)
            resp.raise_for_status()
            return resp.content
        finally:
            if dong_moi:
                client.close()
