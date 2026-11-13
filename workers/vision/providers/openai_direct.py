"""Adapter 3 — `OpenAIDirectProvider`: gửi thẳng ảnh cho nhà cung cấp.

Khác `OpenAIStructuredProvider` ở ba chỗ, và ba chỗ đó là toàn bộ lý do nó
tồn tại như một bộ máy riêng:

    Đo bảng màu trước    có → không
    Lời nhắc             3.536 token quy ước đếm đầy đủ → ~600 token rút gọn
    Số lượt gọi          1 hoặc 2, đồng thuận trung vị → đúng 1

Đổi lại là rẻ hơn và nhanh hơn. Cái mất là ba lớp kỷ luật: mô hình không bị
buộc giải trình theo bảng màu đã đo, không nhận đủ quy ước đếm, và không có
lượt thứ hai để lộ ra chỗ nó dao động.

Hợp đồng trả về KHÔNG đổi — vẫn `Schema.json`, vẫn `strict: true`, vẫn cộng
ba tổng đếm bằng `dem_tong`. Đó là điều kiện để Review, Approve, Product
Master và M02 không biết bộ nào đã chạy (D5-c).

Bộ này CHƯA đo trên bộ ảnh vàng. `MO_TA_BO_MAY` phía TS khai nó là
`thu_nghiem` vì đúng lý do đó, không phải vì mã chưa xong.
"""

from __future__ import annotations

import base64
from typing import Any

from openai import OpenAI

from vision.analyzer.dem_tong import dem_tong
from vision.providers.chung import (
    CANH_DAI_MAC_DINH_PX,
    SO_LAN_THU_LAI,
    TIMEOUT_GOI_GIAY,
    MucDung,
    doc_dap_ung,
    doc_muc_dung,
    goi_co_du_phong,
    nap_json,
    nap_text,
    tham_so_goi,
    thu_nho_anh,
)

MODEL_MAC_DINH = "gpt-4o-mini"


class OpenAIDirectProvider:
    """`VisionAnalyzer` — một lời gọi, không tiền xử lý, không đồng thuận."""

    name = "openai_direct"

    def __init__(
        self,
        client: OpenAI | None = None,
        model: str | None = None,
        muc_suy_luan: str | None = None,
    ) -> None:
        config = nap_json("config.json")
        self.schema = nap_json("Schema.json")
        self.prompt = nap_text("PromptGon.md")
        self._client = client or OpenAI(timeout=TIMEOUT_GOI_GIAY, max_retries=SO_LAN_THU_LAI)
        # `model_tien_kiem` để đổi mô hình của RIÊNG bộ này mà không đụng bộ
        # đầy đủ — hai bộ tồn tại song song nên chúng phải chỉnh được riêng.
        self._model = model or config.get("model_tien_kiem") or MODEL_MAC_DINH
        self._canh_dai_px = int(config.get("anh_canh_dai_px") or CANH_DAI_MAC_DINH_PX)
        # Bộ Gọn chỉ có MỘT lượt, nên chỉ có MỘT mức suy luận — không có
        # lượt hai để nâng mức, đúng với lý do bộ này tồn tại.
        self._muc_suy_luan = muc_suy_luan or config.get("muc_suy_luan_gon")
        self.canh_bao_tham_so: list[str] = []

    @property
    def model_version(self) -> str:
        return self._model

    def analyze(self, image: bytes, context: dict[str, Any]) -> dict:
        anh_gui, mime = thu_nho_anh(image, self._canh_dai_px)
        image_b64 = base64.b64encode(anh_gui).decode("ascii")

        self.canh_bao_tham_so = []
        response, canh_bao = goi_co_du_phong(
            self._client,
            model=self._model,
            **tham_so_goi(self._model, 0, self._muc_suy_luan),
            response_format={"type": "json_schema", "json_schema": self.schema},
            messages=[
                {"role": "system", "content": self.prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Phân tích sản phẩm hoa trong ảnh và điền đủ mọi trường của lược đồ.",
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{image_b64}"},
                        },
                    ],
                },
            ],
        )
        if canh_bao:
            self.canh_bao_tham_so.append(canh_bao)
        self.muc_dung_lan_cuoi = MucDung()
        self.muc_dung_lan_cuoi.cong(doc_muc_dung(response))
        ket_qua = doc_dap_ung(response)
        # Ba tổng đếm cộng tại chỗ chứ không hỏi mô hình, y như bộ đầy đủ —
        # hai bộ phải cho ra cùng một nghĩa ở cùng một trường.
        ket_qua.update(dem_tong(ket_qua))
        return ket_qua
