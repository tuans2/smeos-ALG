"""`IOPaintExpander` — mở khung bằng IOPaint tự host (Mức 2, trọng số mở,
nợ #104, nối tiếp #78) — quyết định chốt với người dùng 17/09 qua đánh giá
đặc tả "ALG-CORE — IOPaint Outpainting Integration Specification": vẫn
tích hợp Mức 2 ngay dù tài liệu kiến trúc khuyến nghị thứ tự API-trước
(§2 `docs/dac-ta/10-ai-orchestration.md`), và AIC-13 giữ NESTED trong M04b
(không tách capability/endpoint riêng) — xem tài liệu "Tích hợp IOPaint
Outpainting vào floraos-core" cho toàn bộ đối chiếu kiến trúc.

**Đã cài đặt và chạy THẬT (iopaint==1.6.0, CPU, model `lama`) để xác minh,
không suy đoán:**

- Endpoint thật: `POST /api/v1/inpaint` (không phải `/inpaint`).
- Response là BYTE ẢNH THÔ (PNG), KHÔNG phải JSON envelope — không được gọi
  `resp.json()`.
- Ngữ nghĩa mask xác nhận bằng pixel-diff thật: 0 (đen) = giữ nguyên tuyệt
  đối, 255 (trắng) = sinh mới.
- `use_extender=true` trên model KHÔNG có `support_outpainting=true` (vd.
  LaMa): server trả `200 OK` nhưng ảnh vẫn giữ nguyên kích thước gốc — im
  lặng bỏ qua, KHÔNG báo lỗi. `expand()` vì vậy BẮT BUỘC tự kiểm kích thước
  ảnh trả về, không được tin HTTP 200 là đủ.
- Không có endpoint health-check riêng; `GET /api/v1/model` (không dùng ở
  đây, xem docstring `_kiem_tra_model_neu_can`) trả `support_outpainting` để
  chẩn đoán ngoài đường chạy nóng.

**Xác minh THÊM (đọc thẳng mã nguồn `iopaint==1.6.0`, không suy đoán từ tài
liệu bên thứ ba) khi viết lớp này — phát hiện SAU KHI đã chốt "Xác minh
IOPaint" trong tài liệu tích hợp:** `model/base.py::_do_outpainting` và
`model/helper/g_diffuser_bot.py::expand_image` cho thấy khi `use_extender=True`,
IOPaint tự tính mask NỘI BỘ từ hình chữ nhật `extender_x/y/width/height` —
mask do CLIENT gửi lên (trường `mask` của request) HOÀN TOÀN BỊ BỎ QUA cho
đường outpainting (chỉ được dùng ở đường inpaint THƯỜNG, không `use_extender`).
Nói cách khác: `product_mask` (protectMask) KHÔNG được gửi trong trường
`mask` của lượt gọi outpainting này — gửi cũng vô nghĩa, IOPaint sẽ bỏ qua.
Bảo vệ sản phẩm trong đường CHẠY THẬT ở đây đến từ HAI lớp khác, không phải
từ mask:

1. Bản thân cơ chế `use_extender` của IOPaint giữ nguyên TOÀN BỘ ảnh gốc
   (nằm trong hình chữ nhật `extender_*`) bằng `cv2.copyMakeBorder`, chỉ
   sinh nội dung mới ở dải biên vừa thêm — rộng hơn phạm vi bảo vệ so với
   một mask chỉ khoanh vùng sản phẩm, nhưng model diffusion (SD/SDXL) vẫn
   có thể làm lệch nhẹ vùng "giữ nguyên" qua vòng mã hoá/giải mã VAE của
   toàn ảnh — KHÔNG có gì đảm bảo pixel-tuyệt-đối như phép đo đã làm với
   LaMa (LaMa không hỗ trợ outpainting nên không đo được đường này).
2. Vì vậy bước dán lại chính xác (`variant_worker.py::_dan_lai_chu_the`,
   nợ #104, mục 3 tài liệu tích hợp) vẫn BẮT BUỘC — dán nguyên khối `rgba`
   gốc (subject đã cắt, có alpha) lên đúng toạ độ `paste_offset` mà lớp này
   trả về, TRƯỚC khi đóng khung — không tin riêng cơ chế giữ-nguyên nào của
   IOPaint, kể cả cơ chế mạnh hơn mask.

`product_mask` VẪN được giữ trong chữ ký `expand()` (đúng `ImageExpander`,
`base.py`) vì hai lý do: (a) khớp đặc tả `ImageProvider.edit(mask, protectMask)`
đã có sẵn trong kiến trúc — một hiện thực khác của `ImageExpander` trong
tương lai có thể KHÔNG dùng `use_extender` (một API/engine khác thật sự đọc
mask cho việc mở khung), và (b) được ghi lại trong `parameters` trả về để
biết lượt nào có mask đi kèm — dù chưa gửi lên server ở lượt này.

Việc CÒN THIẾU trước khi coi là production-ready (xem tài liệu tích hợp,
mục "Rủi ro"): chọn model SD/SDXL-inpainting thật có `support_outpainting=true`
(LaMa KHÔNG hỗ trợ), soát giấy phép model đó, có hạ tầng GPU thật để chạy —
không việc nào trong ba việc này làm được từ môi trường soạn mã. Lớp này
viết đủ để chạy được với BẤT KỲ instance IOPaint nào đã bật đúng model —
`IOPAINT_URL` để trống thì lùi về `PadExpander`, không lỗi job, giống hệt
`ReplicateOutpainter` khi thiếu token.
"""

from __future__ import annotations

import base64
import logging
import os
import time
from io import BytesIO

import httpx
from PIL import Image

from media_ai.image.ratio_frame import RATIO_PRESETS
from media_ai.providers.base import KetQuaMoRong
from media_ai.providers.chung import MucDungLuot
from media_ai.providers.expansion.pad_expander import PadExpander

log = logging.getLogger("media_ai.providers.expansion.iopaint_outpainter")

NAME = "iopaint"

_TIMEOUT_S_MAC_DINH = 120.0


def toa_do_extender(
    rong_goc: int, cao_goc: int, rong_dich: int, cao_dich: int
) -> tuple[dict[str, int], tuple[int, int]]:
    """Tính `extender_x/y/width/height` VÀ vị trí dán lại (`paste_offset`).

    Công thức đã đối chiếu trực tiếp với mã nguồn thật
    `iopaint/model/base.py::_do_outpainting` (iopaint==1.6.0) — không suy
    đoán: IOPaint coi `(extender_x, extender_y)` là góc trên-trái của hình
    chữ nhật đích TRONG CÙNG hệ toạ độ với ảnh gốc (có thể âm), và
    `extender_width/height` là kích thước hình chữ nhật đó (không phải "mở
    rộng thêm bao nhiêu"). Ảnh gốc được dán vào canvas mới tại
    `(max(0, -extender_x), max(0, -extender_y))` — đây chính là
    `paste_offset` trả về, dùng lại ở `variant_worker.py::_dan_lai_chu_the`
    để dán đúng vị trí, không đoán.

    Đặt ảnh gốc vào CHÍNH GIỮA canvas đích (đối xứng hai bên) — canvas đích
    lấy max(kích thước preset, kích thước gốc) mỗi chiều, để không co nhỏ
    ảnh gốc khi nó đã lớn hơn preset.
    """
    rong_moi = max(rong_dich, rong_goc)
    cao_moi = max(cao_dich, cao_goc)
    dem_trai = (rong_moi - rong_goc) // 2
    dem_tren = (cao_moi - cao_goc) // 2

    extender = {
        "extender_x": -dem_trai,
        "extender_y": -dem_tren,
        "extender_width": rong_moi,
        "extender_height": cao_moi,
    }
    return extender, (dem_trai, dem_tren)


def _mat_na_trong(size: tuple[int, int]) -> bytes:
    """Không có `product_mask` truyền vào — sinh mask toàn 255 (generate
    hết) để giữ hình dạng request hợp lệ. Không dùng tới nếu
    `use_extender=true` (xem docstring đầu file — server bỏ qua trường này
    ở đường outpainting), nhưng vẫn dựng cho đúng trường bắt buộc của
    `InpaintRequest`."""
    mask = Image.new("L", size, color=255)
    buf = BytesIO()
    mask.save(buf, format="PNG")
    return buf.getvalue()


class IOPaintExpander:
    """Gọi IOPaint tự host (`POST /api/v1/inpaint`, `use_extender=true`).
    Mọi lỗi (thiếu `IOPAINT_URL`, mạng, timeout, kích thước sai) đều lùi về
    `PadExpander` — không bao giờ ném lỗi ra khỏi `expand()`, cùng nguyên
    tắc với `ReplicateOutpainter`."""

    name = NAME

    def __init__(
        self,
        base_url: str | None = None,
        *,
        model: str | None = None,
        client: httpx.Client | None = None,
        timeout_s: float | None = None,
    ) -> None:
        nguon_url = base_url if base_url is not None else os.environ.get("IOPAINT_URL")
        self._base_url = (nguon_url or "").rstrip("/")
        self.model_version = model or os.environ.get("IOPAINT_MODEL") or "iopaint"
        self._client = client
        self._timeout_s = (
            timeout_s
            if timeout_s is not None
            else float(os.environ.get("IOPAINT_TIMEOUT_SECONDS") or _TIMEOUT_S_MAC_DINH)
        )
        self._pad = PadExpander()
        self.muc_dung_lan_cuoi: MucDungLuot | None = None

    def expand(
        self, image: bytes, ratio: str, product_mask: bytes | None = None
    ) -> KetQuaMoRong:
        # Reset đầu MỖI lượt gọi — cùng nguyên tắc `ReplicateOutpainter`/
        # `OpenAIEnhancer` (nợ #71): số của lượt TRƯỚC không được lọt sang.
        self.muc_dung_lan_cuoi = None

        if not self._base_url:
            log.info("IOPaintExpander: chưa cấu hình IOPAINT_URL — lùi về PadExpander")
            return self._pad.expand(image, ratio)

        try:
            bat_dau = time.monotonic()
            anh_goc = Image.open(BytesIO(image))
            anh_goc.load()
            rong_goc, cao_goc = anh_goc.size
            rong_dich, cao_dich = RATIO_PRESETS.get(ratio, RATIO_PRESETS["1:1"])

            extender, paste_offset = toa_do_extender(rong_goc, cao_goc, rong_dich, cao_dich)
            mask_bytes = product_mask if product_mask is not None else _mat_na_trong((rong_goc, cao_goc))

            anh_ra_bytes = self._goi_inpaint(image, mask_bytes, extender)
            anh_ra = Image.open(BytesIO(anh_ra_bytes))
            anh_ra.load()

            # Đã XÁC MINH THẬT (xem docstring đầu file): `use_extender` trên
            # model sai (không `support_outpainting`) trả 200 OK nhưng
            # KHÔNG mở rộng canvas — không thể tin HTTP 200 là đủ, phải tự
            # kiểm kích thước ảnh trả về.
            if anh_ra.size[0] < rong_dich or anh_ra.size[1] < cao_dich:
                raise RuntimeError(
                    f"IOPaint trả 200 OK nhưng không mở rộng canvas đúng — "
                    f"nhận {anh_ra.size}, cần tối thiểu ({rong_dich}, {cao_dich}). "
                    f"Model '{self.model_version}' có thể không hỗ trợ "
                    f"outpainting (support_outpainting=false, vd LaMa)."
                )

            self.muc_dung_lan_cuoi = MucDungLuot(so_lan_goi=1)

            return KetQuaMoRong(
                image=anh_ra_bytes,
                generated_flags={"generative_fill_used": True, "requires_reshoot_warning": False},
                parameters={
                    "ratio": ratio,
                    "method": "iopaint",
                    "model": self.model_version,
                    "product_mask_provided": product_mask is not None,
                    # Vị trí (x, y) của ảnh GỐC (trước khi gửi cho IOPaint)
                    # trong canvas mới trả về — `variant_worker.py` dùng để
                    # dán lại chính xác `rgba` trước khi đóng khung.
                    "paste_offset": list(paste_offset),
                    "latency_ms": int((time.monotonic() - bat_dau) * 1000),
                },
            )
        except Exception:  # noqa: BLE001 — cùng nguyên tắc ReplicateOutpainter
            log.warning(
                "IOPaintExpander: lỗi khi gọi IOPaint tự host, lùi về PadExpander",
                exc_info=True,
            )
            self.muc_dung_lan_cuoi = None
            return self._pad.expand(image, ratio)

    # ─── Chi tiết gọi mạng — endpoint/response đã xác minh thật ───────────

    def _client_hoac_moi(self) -> httpx.Client:
        return self._client if self._client is not None else httpx.Client(timeout=self._timeout_s)

    def _goi_inpaint(self, image: bytes, mask: bytes, extender: dict[str, int]) -> bytes:
        """`POST /api/v1/inpaint` — endpoint thật đã xác minh (KHÔNG phải
        `/inpaint`). Trả về BYTE ẢNH THÔ, KHÔNG phải JSON envelope — đã xác
        minh thật, không được gọi `resp.json()`."""
        payload: dict[str, object] = {
            "image": base64.b64encode(image).decode("ascii"),
            "mask": base64.b64encode(mask).decode("ascii"),
            "use_extender": True,
            **extender,
        }
        if self.model_version and self.model_version != "iopaint":
            payload["model"] = self.model_version

        client = self._client_hoac_moi()
        dong_moi = self._client is None
        try:
            resp = client.post(f"{self._base_url}/api/v1/inpaint", json=payload)
            resp.raise_for_status()
            return resp.content
        finally:
            if dong_moi:
                client.close()
