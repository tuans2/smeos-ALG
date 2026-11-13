"""`FalAIOutpainter` — mở khung bằng `fal-ai/bria/expand` qua fal.ai
(AIC-13, nợ #105, tiếp #78/#104, 18/09).

Quyết định 18/09 (xem `docs/dac-ta/TECHNICAL_DEBT.md`, mục cập nhật nợ
#104): dừng Mức 2 (IOPaint tự host) làm đường thử tiếp theo sau khi gặp ma
sát hạ tầng thật (Python không tương thích, hết dung lượng đĩa khi tải
model — xem nợ #104) ngay ở lần thử ĐẦU TIÊN trên máy phát triển. Quay lại
đúng thứ tự API-trước mà tài liệu kiến trúc §2 khuyến nghị từ đầu, nhưng
qua fal.ai thay vì chỉ mỗi Replicate — theo kiến trúc "Image AI Gateway"
người dùng chốt hướng 18/09: `floraos-core` không quan tâm model nào chạy
bên dưới `expand()`, chỉ gọi qua cổng `ImageExpander` chung. Lớp này là
MỘT hiện thực của cổng đó — cùng khuôn `ReplicateOutpainter`/
`IOPaintExpander` đã có, KHÔNG phải một khung mới. Phạm vi đợt này CHỈ đổi
provider outpaint (chốt qua AskUserQuestion 18/09) — không đụng
upscale/remove_bg/enhance đang chạy riêng lẻ ở module khác.

**Lược đồ input/output ĐÃ XÁC MINH qua tài liệu chính thức fal.ai (đọc
trực tiếp trang API-reference của MODEL và trang API hàng đợi chung, 18/09
— không suy đoán), nhưng CHƯA gọi thử THẬT (chưa có `FAL_KEY`):**

- Endpoint: hàng đợi (queue) chuẩn của fal.ai, KHÔNG phải endpoint đồng bộ
  `fal.run` — `POST https://queue.fal.run/fal-ai/bria/expand`, header
  `Authorization: Key <FAL_KEY>` (xác nhận qua ví dụ curl thật trong tài
  liệu — KHÔNG phải `Bearer`, khác quy ước Replicate). Lượt POST trả ngay
  `request_id`/`status_url`/`response_url`, KHÔNG trả kết quả luôn — phải
  poll `GET .../requests/{request_id}/status` tới khi `status ==
  "COMPLETED"` (ba giá trị tài liệu hoá: `IN_QUEUE`/`IN_PROGRESS`/
  `COMPLETED`, không có tên trạng thái lỗi cụ thể — bất kỳ giá trị nào
  khác `COMPLETED` sau khi hết lượt poll đều coi là lỗi), rồi
  `GET .../requests/{request_id}` lấy kết quả — cùng khuôn poll đã có ở
  `ReplicateOutpainter._goi_predictions`, khác `IOPaintExpander` (đồng bộ,
  một lượt POST duy nhất).
- Input: `image_url` (BẮT BUỘC — fal.ai không có trường nhận byte ảnh trực
  tiếp trong JSON, chỉ nhận URL hoặc data URI base64), `canvas_size:
  [w, h]`, `original_image_size: [w, h]`, `original_image_location:
  [x, y]` (toạ độ góc trên-trái của ảnh gốc TRONG canvas mới — CÙNG chiều
  dương với `paste_offset` nội bộ của `floraos-core`, KHÁC `extender_x/y`
  ÂM của IOPaint — không cần đổi dấu, xem `toa_do_bria()`).
- **Đánh đổi đã biết, chưa đo được:** tài liệu fal.ai TỰ khuyến cáo data
  URI chỉ nên dùng cho ảnh vài KB (khuyến nghị upload lên CDN riêng của
  fal trước để lấy URL, nhanh và nhẹ payload hơn) — nhưng cũng TỰ tài liệu
  hoá data URI là ĐẦU VÀO HỢP LỆ, không phải suy đoán. Endpoint REST thô
  của bước tải-lên-trước đó KHÔNG được tài liệu hoá công khai ở mức ổn
  định (chỉ có SDK Python/JS chính thức che giấu bước này, tự chuyển giữa
  nhiều endpoint tải lên nội bộ) — dùng data URI trước cho ảnh sản phẩm
  thật (thường vài trăm KB tới vài MB, vượt xa "vài KB" fal khuyến nghị);
  đổi sang upload-trước khi có `FAL_KEY` thật để đo xem có chạm giới hạn
  kích thước request hay chậm bất thường không.
- Output: JSON (KHÔNG phải byte ảnh thô như IOPaint) — `image.url` là URL
  ảnh kết quả, phải tải riêng bằng một lượt GET nữa (`_tai_anh_ra`, cùng
  khuôn `ReplicateOutpainter._tai_anh_ra`).
- KHÔNG có trường mask/protect nào trong lược đồ input — giống hệt
  `bria/expand-image` trên Replicate (cùng hãng model Bria, khác hạ tầng
  chạy). `product_mask` vì vậy bị BỎ QUA có chủ đích ở đây, cùng lý do đã
  ghi ở `replicate_outpainter.py` — bảo vệ sản phẩm đến từ
  `_dan_lai_chu_the` (`variant_worker.py`) dùng `original_image_location`
  (trả qua `parameters["paste_offset"]`) để dán lại chính xác ảnh gốc,
  KHÔNG phải từ mask gửi lên.

Theo đúng khuôn `ReplicateOutpainter`/`IOPaintExpander`: viết ĐẦY ĐỦ ngay
khi chưa có `FAL_KEY` (chốt qua AskUserQuestion 18/09 — "chưa có key, cứ
viết mã theo đúng khuôn provider có sẵn"), để trống thì lùi về
`PadExpander`; mọi lỗi (thiếu key, sai lược đồ, mạng, timeout, status khác
`COMPLETED`, response thiếu `image.url`) đều lùi về `PadExpander`, không
bao giờ ném lỗi ra khỏi `expand()`.
"""

from __future__ import annotations

import base64
import logging
import os
import time
from io import BytesIO
from typing import Any

import httpx
from PIL import Image

from media_ai.image.ratio_frame import RATIO_PRESETS
from media_ai.providers.base import KetQuaMoRong
from media_ai.providers.chung import MucDungLuot
from media_ai.providers.expansion.pad_expander import PadExpander

log = logging.getLogger("media_ai.providers.expansion.fal_outpainter")

NAME = "fal_bria_expand"
MODEL_VERSION = "fal-ai/bria/expand"

_QUEUE_BASE = "https://queue.fal.run/fal-ai/bria/expand"
_TRANG_THAI_XONG = "COMPLETED"
_SO_LAN_POLL_TOI_DA = 30
_KHOANG_CACH_POLL_S = 2.0
_TIMEOUT_S_MAC_DINH = 60.0


def toa_do_bria(
    rong_goc: int, cao_goc: int, rong_dich: int, cao_dich: int
) -> tuple[list[int], list[int], list[int]]:
    """Tính `canvas_size`/`original_image_size`/`original_image_location`
    của lược đồ `fal-ai/bria/expand` — CÙNG phép đặt-giữa-canvas với
    `toa_do_extender()` (`iopaint_outpainter.py`: canvas đích lấy
    max(preset, gốc) mỗi chiều, không co nhỏ ảnh gốc, đặt gốc vào chính
    giữa) — nhưng KHÔNG đổi dấu như IOPaint: `original_image_location` của
    Bria là toạ độ DƯƠNG góc trên-trái của ảnh gốc trong canvas mới, đúng
    ý nghĩa `paste_offset` nội bộ của `floraos-core` — dùng thẳng được ở
    `variant_worker.py::_dan_lai_chu_the` mà không cần đổi dấu.
    """
    rong_moi = max(rong_dich, rong_goc)
    cao_moi = max(cao_dich, cao_goc)
    dem_trai = (rong_moi - rong_goc) // 2
    dem_tren = (cao_moi - cao_goc) // 2
    return [rong_moi, cao_moi], [rong_goc, cao_goc], [dem_trai, dem_tren]


class FalAIOutpainter:
    """Gọi `fal-ai/bria/expand` qua fal.ai (hàng đợi REST chuẩn của
    fal.ai). Mọi lỗi lùi về `PadExpander` — xem docstring đầu file."""

    name = NAME
    model_version = MODEL_VERSION

    def __init__(
        self,
        api_key: str | None = None,
        *,
        client: httpx.Client | None = None,
        timeout_s: float | None = None,
    ) -> None:
        self._api_key = api_key if api_key is not None else os.environ.get("FAL_KEY")
        self._client = client
        self._timeout_s = (
            timeout_s
            if timeout_s is not None
            else float(os.environ.get("FAL_TIMEOUT_SECONDS") or _TIMEOUT_S_MAC_DINH)
        )
        self._pad = PadExpander()
        self.muc_dung_lan_cuoi: MucDungLuot | None = None

    def expand(
        self, image: bytes, ratio: str, product_mask: bytes | None = None
    ) -> KetQuaMoRong:
        # `product_mask` CỐ Ý bị bỏ qua — xem docstring đầu file (không
        # phải hồi quy, cùng lỗ hổng đã ghi nhận ở ReplicateOutpainter).

        # Reset đầu MỖI lượt gọi — cùng nguyên tắc ReplicateOutpainter/
        # IOPaintExpander (nợ #71): số của lượt TRƯỚC không được lọt sang.
        self.muc_dung_lan_cuoi = None

        if not self._api_key:
            log.info("FalAIOutpainter: chưa cấu hình FAL_KEY — lùi về PadExpander")
            return self._pad.expand(image, ratio)

        try:
            bat_dau = time.monotonic()
            anh_goc = Image.open(BytesIO(image))
            anh_goc.load()
            rong_goc, cao_goc = anh_goc.size
            rong_dich, cao_dich = RATIO_PRESETS.get(ratio, RATIO_PRESETS["1:1"])

            canvas_size, original_image_size, original_image_location = toa_do_bria(
                rong_goc, cao_goc, rong_dich, cao_dich
            )
            image_url = "data:image/png;base64," + base64.b64encode(image).decode("ascii")

            body = self._goi_queue(image_url, canvas_size, original_image_size, original_image_location)
            anh_ra_bytes = self._tai_anh_ra(body)

            # Chỉ đặt mức dùng SAU KHI cả gọi-hàng-đợi lẫn tải-ảnh-ra đều
            # thành công — một lượt nửa chừng thất bại không được tính tiền.
            self.muc_dung_lan_cuoi = MucDungLuot(so_lan_goi=1)

            return KetQuaMoRong(
                image=anh_ra_bytes,
                generated_flags={"generative_fill_used": True, "requires_reshoot_warning": False},
                parameters={
                    "ratio": ratio,
                    "method": "fal_bria_expand",
                    "model": self.model_version,
                    "product_mask_provided": product_mask is not None,
                    # `original_image_location` mà chính lượt gọi này đã
                    # gửi lên — `variant_worker.py` dùng để dán lại chính
                    # xác `rgba` gốc trước khi đóng khung.
                    "paste_offset": list(original_image_location),
                    "latency_ms": int((time.monotonic() - bat_dau) * 1000),
                },
            )
        except Exception:  # noqa: BLE001 — cùng nguyên tắc ReplicateOutpainter/IOPaintExpander
            log.warning(
                "FalAIOutpainter: lỗi khi gọi fal-ai/bria/expand, lùi về PadExpander",
                exc_info=True,
            )
            self.muc_dung_lan_cuoi = None
            return self._pad.expand(image, ratio)

    # ─── Chi tiết gọi mạng — lược đồ đã xác minh qua tài liệu, xem đầu file ──

    def _client_hoac_moi(self) -> httpx.Client:
        return self._client if self._client is not None else httpx.Client(timeout=self._timeout_s)

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Key {self._api_key}", "Content-Type": "application/json"}

    def _goi_queue(
        self,
        image_url: str,
        canvas_size: list[int],
        original_image_size: list[int],
        original_image_location: list[int],
    ) -> dict[str, Any]:
        """`POST .../fal-ai/bria/expand` rồi poll `.../status` tới khi
        `COMPLETED` — hàng đợi chuẩn của fal.ai, không trả kết quả ngay ở
        lượt POST đầu (khác `IOPaintExpander`, đồng bộ)."""
        client = self._client_hoac_moi()
        dong_moi = self._client is None
        try:
            resp = client.post(
                _QUEUE_BASE,
                headers=self._headers(),
                json={
                    "image_url": image_url,
                    "canvas_size": canvas_size,
                    "original_image_size": original_image_size,
                    "original_image_location": original_image_location,
                },
            )
            resp.raise_for_status()
            submit = resp.json()
            request_id = submit.get("request_id")
            if not request_id:
                raise RuntimeError(f"fal.ai không trả request_id: {submit!r}")
            status_url = submit.get("status_url") or f"{_QUEUE_BASE}/requests/{request_id}/status"
            response_url = submit.get("response_url") or f"{_QUEUE_BASE}/requests/{request_id}"

            trang_thai: str | None = None
            so_lan = 0
            while trang_thai != _TRANG_THAI_XONG and so_lan < _SO_LAN_POLL_TOI_DA:
                poll = client.get(status_url, headers=self._headers())
                poll.raise_for_status()
                trang_thai = poll.json().get("status")
                if trang_thai == _TRANG_THAI_XONG:
                    break
                so_lan += 1
                time.sleep(_KHOANG_CACH_POLL_S)

            if trang_thai != _TRANG_THAI_XONG:
                raise RuntimeError(f"fal.ai request không hoàn tất: status={trang_thai!r}")

            ket_qua = client.get(response_url, headers=self._headers())
            ket_qua.raise_for_status()
            return ket_qua.json()
        finally:
            if dong_moi:
                client.close()

    def _tai_anh_ra(self, body: dict[str, Any]) -> bytes:
        image_field = body.get("image")
        url_anh = image_field.get("url") if isinstance(image_field, dict) else None
        if not isinstance(url_anh, str):
            raise RuntimeError(f"fal.ai response không có image.url: {body!r}")

        client = self._client_hoac_moi()
        dong_moi = self._client is None
        try:
            resp = client.get(url_anh)
            resp.raise_for_status()
            return resp.content
        finally:
            if dong_moi:
                client.close()
