"""Adapter 1 — `OpenAIStructuredProvider` (D5-c, kiến trúc V2 mục 17.1).

Một lời gọi structured output (`response_format: json_schema`) dùng thẳng
`Schema.json` đã thu hoạch (R1) làm `json_schema` — Schema.json vốn đã đúng
hình dạng OpenAI đòi (`name`/`strict`/`schema`), không cần dịch lại.

Đồng thuận: lượt một luôn chạy ở `temperature=0`. Lượt hai chỉ chạy khi lượt
một có dấu hiệu không chắc — `confidence` tổng dưới ngưỡng, hoặc một thành
phần trong `bom` có `confidence` thấp. Đồng thuận lấy trung vị các trường số
(`quantity` từng thành phần, `confidence` tổng) giữa hai lượt bằng
`count_engine.trung_vi`.

Ngưỡng ở đây (`NGUONG_CHAY_LUOT_HAI`) là một lựa chọn triển khai, CHƯA đo
được trên bộ ảnh vàng (`docs/kien-truc/BO_ANH_VANG.md`) — ghi ở
`TECHNICAL_DEBT.md`, chờ hiệu chỉnh khi có bộ ảnh vàng và ma trận 13.1.

Chỉ kênh 1 (kênh mô hình) ở phiên bản này. Kênh 2 (diện tích cụm màu) và
kênh 3 (chặn trên vật lý) của `count_engine.chot_danh_sach` đòi khớp cụm màu
đo được với `cluster_indices` mô hình trả về và một phép quy đổi pixel→cm
qua danh mục — đó là phần điều phối còn thiếu (không có trong R1/E5/E6, xem
`HARVEST_MANIFEST.md` mục 4: đó là phần `run.py` bị loại vì là CLI, không
phải engine thuần). Ghi rõ ở `TECHNICAL_DEBT.md` là việc kế tiếp của P5,
cùng lúc với khi có bộ ảnh vàng để đo đối chiếu ba kênh.
"""

from __future__ import annotations

import base64
import tempfile
from typing import Any

from openai import OpenAI

from vision.analyzer.count_engine import trung_vi
from vision.analyzer.dem_tong import dem_tong
from vision.analyzer.color_engine import extract_palette, get_color_name_from_hex
from vision.providers.chung import (
    CANH_DAI_MAC_DINH_PX,
    SO_LAN_THU_LAI,
    TIMEOUT_GOI_GIAY,
    MucDung,
    doc_dap_ung,
    doc_muc_dung,
    goi_co_du_phong,
    la_mo_hinh_suy_luan,
    nap_json,
    nap_text,
    tham_so_goi,
    thu_nho_anh,
)

NGUONG_CHAY_LUOT_HAI = 70  # confidence tổng dưới ngưỡng này thì chạy lượt hai
NGUONG_CHAY_LUOT_HAI_THANH_PHAN = 60  # hoặc một thành phần bom có confidence dưới ngưỡng này




class _Contract:
    """Nạp một lần theo từng ngành, dùng lại cho mọi lượt gọi — không đọc đĩa mỗi request."""

    def __init__(self, nganh: str = "floral") -> None:
        self.nganh = nganh.lower() if nganh else "floral"
        self.schema = nap_json("Schema.json", self.nganh)
        self.prompt = nap_text("Prompt.md", self.nganh)
        self.config = nap_json("config.json", self.nganh)

    @property
    def name(self) -> str:
        return self.schema.get("name", "PhanTichSanPham")

    def tham_so(self, khoa: str, mac_dinh: Any) -> Any:
        """`config.json` là nơi chỉnh tham số vận hành — chính tệp đó khai
        "Sửa ở đây, không sửa trong mã". Trước đây tệp được nạp rồi không ai
        đọc, nên mọi con số trong đó không có tác dụng gì."""
        gia_tri = self.config.get(khoa)
        return mac_dinh if gia_tri is None else gia_tri


_contracts: dict[str, _Contract] = {}


def _contract_singleton(nganh: str = "floral") -> _Contract:
    key = nganh.lower() if nganh else "floral"
    if key not in _contracts:
        _contracts[key] = _Contract(key)
    return _contracts[key]


def _measured_palette_block(palette_result: dict) -> str:
    lines = ["BẢNG MÀU ĐÃ ĐO (đo bằng thuật toán, không phải gợi ý — không được sửa):"]
    for idx, cluster in enumerate(palette_result["palette"]):
        ten_mau = get_color_name_from_hex(cluster["hex"])
        lines.append(
            f"  Cụm {idx}: mã {cluster['hex']} ({ten_mau}), "
            f"tỷ lệ diện tích {cluster['ratio_percent']}%"
        )
    lines.append(f"Tỷ lệ diện tích sản phẩm trên khung ảnh: {palette_result['product_pixel_ratio']}%")
    return "\n".join(lines)


def _catalog_block() -> str:
    # Chưa nối danh mục nguyên liệu thật của từng tổ chức (nợ kỹ thuật, xem
    # module docstring) — không đưa mã giả vào prompt, để mô hình tự do khai
    # tên và trả `ma: null` đúng theo Schema.json khi không khớp danh mục nào.
    return "DANH MỤC NGUYÊN LIỆU: (chưa có danh mục của cửa hàng cho tổ chức này — bỏ trống mã `ma`, khai tên tự do)"


def _reference_block(ref: dict | None) -> str:
    """Tạo khối hệ quy chiếu từ phân tích ảnh gốc (Ground-Truth Schema).

    Dùng trong quy trình kiểm duyệt (Identity Guard) để cố định thuật ngữ định danh,
    chủng loại vật tư/nguyên liệu, ngăn AI sinh từ đồng nghĩa hoặc đếm lệch ngẫu nhiên.
    Tương thích đa ngành (Hoa tươi, Thời trang, F&B, v.v.).
    """
    if not isinstance(ref, dict) or not ref:
        return ""
    lines = ["HỆ QUY CHIẾU THỰC TẾ ĐÃ XÁC THỰC CỦA SẢN PHẨM (REFERENCE BASELINE):"]
    identity = ref.get("identity") or {}
    bom = ref.get("bom") or {}

    id_parts = []
    for k in ("category", "shape", "container", "silhouette", "fit", "material"):
        v = identity.get(k)
        if v:
            id_parts.append(f"{k}: {v}")
    if id_parts:
        lines.append("  Định danh: " + " | ".join(id_parts))

    for group_name, items in bom.items():
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict):
                    name = item.get("name") or item.get("material") or group_name
                    color = item.get("color") or "—"
                    qty = item.get("quantity")
                    qty_str = f", Số lượng: {qty}" if qty is not None else ""
                    lines.append(f"  - {group_name}: {name} (Màu: {color}{qty_str})")

    lines.append("YÊU CẦU: Duy trì tính nhất quán cao nhất về thuật ngữ định danh, chủng loại và màu sắc đã xác thực ở hệ quy chiếu trên.")
    return "\n".join(lines)


def _overall_confidence(result: dict) -> int:
    value = result.get("confidence")
    return value if isinstance(value, int) else 0


def _min_bom_confidence(result: dict) -> int:
    bom = result.get("bom") or {}
    values = []
    for _key, items in bom.items():
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict):
                    c = item.get("confidence")
                    if isinstance(c, int):
                        values.append(c)
    return min(values) if values else 100


def _needs_second_round(result: dict) -> bool:
    return (
        _overall_confidence(result) < NGUONG_CHAY_LUOT_HAI
        or _min_bom_confidence(result) < NGUONG_CHAY_LUOT_HAI_THANH_PHAN
    )


def _reconcile_quantity(a: dict, b: dict) -> None:
    """Trung vị `quantity` từng thành phần và `confidence` tổng giữa hai
    lượt — sửa `a` tại chỗ, theo đúng vị trí (`bom` không đổi thứ tự phần tử
    giữa hai lượt vì cùng một ảnh, cùng prompt, chỉ khác nhiệt độ).
    Hoạt động đa ngành cho bất kỳ danh mục thành phần nào trong `bom`.
    """
    confidence_median = trung_vi([_overall_confidence(a), _overall_confidence(b)])
    if confidence_median is not None:
        a["confidence"] = int(round(confidence_median))

    bom_a, bom_b = a.get("bom") or {}, b.get("bom") or {}
    for key, items_a in bom_a.items():
        if not isinstance(items_a, list):
            continue
        items_b = bom_b.get(key) or []
        if not isinstance(items_b, list):
            continue
        for i, item_a in enumerate(items_a):
            if i >= len(items_b):
                break
            item_b = items_b[i]
            if not isinstance(item_a, dict) or not isinstance(item_b, dict):
                continue
            qa, qb = item_a.get("quantity"), item_b.get("quantity")
            if isinstance(qa, int) and isinstance(qb, int):
                # Schema.json khai `quantity`/`confidence` là "integer" — trung_vi
                # trả float (np.median), phải làm tròn về int để không phá kiểu
                # dữ liệu của hợp đồng (YC-N3: chỉ được thêm field, không đổi kiểu).
                median = trung_vi([qa, qb])
                if median is not None:
                    item_a["quantity"] = int(round(median))


class OpenAIStructuredProvider:
    """`VisionAnalyzer` — thu hoạch R1 nguyên vẹn cho hợp đồng, BUILD mới cho
    lời gọi structured output và đồng thuận (`workers/vision/providers/base.py`).
    """

    name = "openai_structured"

    def __init__(
        self,
        client: OpenAI | None = None,
        model: str | None = None,
        muc_suy_luan: str | None = None,
        muc_suy_luan_luot_hai: str | None = None,
    ) -> None:
        contract = _contract_singleton()
        self._client = client
        self._model = model or contract.tham_so("model", "gpt-4o")
        self._canh_dai_px = int(contract.tham_so("anh_canh_dai_px", CANH_DAI_MAC_DINH_PX))
        # Với mô hình suy luận, lượt hai KHÔNG còn là "lắc nhiệt độ rồi lấy
        # trung vị" — nhiệt độ không tồn tại ở đó. Lượt hai trở thành lượt
        # NGHĨ KỸ HƠN: cùng ảnh, cùng lời nhắc, nâng mức suy luận. Trung vị
        # giữa hai lượt vẫn giữ nguyên vì nó không phụ thuộc cách sinh ra
        # lượt hai.
        self._muc_suy_luan = muc_suy_luan or contract.tham_so("muc_suy_luan", None)
        self._muc_suy_luan_luot_hai = (
            muc_suy_luan_luot_hai or contract.tham_so("muc_suy_luan_luot_hai", None)
        )
        # Ghi lại việc nhà cung cấp chê tham số nào, để lượt đo không âm thầm
        # đo một thứ khác thứ mình tưởng đang đo.
        self.canh_bao_tham_so: list[str] = []

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            self._client = OpenAI(timeout=TIMEOUT_GOI_GIAY, max_retries=SO_LAN_THU_LAI)
        return self._client

    @property
    def model_version(self) -> str:
        return self._model


    def analyze(self, image: bytes, context: dict[str, Any]) -> dict:
        nganh = context.get("industry") or context.get("industry_key") or "floral"
        contract = _contract_singleton(nganh)

        # Bảng màu đo trên ảnh GỐC, không đo trên bản đã thu nhỏ: tỷ lệ diện
        # tích từng cụm là số đưa vào prompt và số đó phải nói về ảnh thật.
        with tempfile.NamedTemporaryFile(suffix=".img") as tmp:
            tmp.write(image)
            tmp.flush()
            palette_result = extract_palette(tmp.name)

        anh_gui, mime = thu_nho_anh(image, self._canh_dai_px)

        palette_block = _measured_palette_block(palette_result)
        catalog_block = _catalog_block()
        ref_block = _reference_block(context.get("reference_analysis"))
        extra_blocks = f"{catalog_block}\n\n{ref_block}".strip() if ref_block else catalog_block
        image_b64 = base64.b64encode(anh_gui).decode("ascii")

        # Đặt lại trước mỗi ảnh: `muc_dung_lan_cuoi` nói về ẢNH NÀY, không
        # phải mọi ảnh provider từng chạy — một instance dùng cho cả lô.
        self.muc_dung_lan_cuoi = MucDung()

        self.canh_bao_tham_so = []
        round_one = self._call(
            contract, palette_block, extra_blocks, image_b64, mime,
            temperature=0, muc_suy_luan=self._muc_suy_luan,
        )
        result = round_one
        if _needs_second_round(round_one):
            round_two = self._call(
                contract, palette_block, extra_blocks, image_b64, mime,
                temperature=0.2,
                muc_suy_luan=self._muc_suy_luan_luot_hai or self._muc_suy_luan,
            )
            _reconcile_quantity(result, round_two)

        # Ba tổng đếm cộng SAU khi đồng thuận xong, không trước: lượt hai có
        # thể đổi `quantity` từng dòng, và một tổng tính trước sẽ không còn
        # khớp với các dòng nó cộng từ đó.
        result.update(dem_tong(result))
        return result

    def _call(
        self,
        contract: _Contract,
        palette_block: str,
        catalog_block: str,
        image_b64: str,
        mime: str,
        temperature: float,
        muc_suy_luan: str | None = None,
    ) -> dict:
        response, canh_bao = goi_co_du_phong(
            self.client,
            model=self._model,
            **tham_so_goi(self._model, temperature, muc_suy_luan),
            response_format={"type": "json_schema", "json_schema": contract.schema},
            messages=[
                {"role": "system", "content": contract.prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"{palette_block}\n\n{catalog_block}"},
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
        # Cộng dồn TRƯỚC khi đọc thân: một đáp ứng bị cắt vì chạm trần token
        # vẫn bị nhà cung cấp tính tiền, nên nó phải vào sổ chi phí dù
        # `doc_dap_ung` sắp ném lỗi ngay dưới đây.
        self.muc_dung_lan_cuoi.cong(doc_muc_dung(response))
        return doc_dap_ung(response)
