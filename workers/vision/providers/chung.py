"""Phần dùng chung của mọi adapter gọi OpenAI.

Ba bộ máy là ba lớp riêng vì chúng làm ba việc khác nhau. Nhưng những thứ
dưới đây không phải việc của bộ máy nào cả — chúng là cách nói chuyện với
nhà cung cấp cho đúng, và viết hai lần nghĩa là lần sau sửa một chỗ quên
chỗ kia.
"""

from __future__ import annotations

import io
import json
from pathlib import Path
from dataclasses import dataclass
from typing import Any

from PIL import Image

CONTRACTS_DIR = Path(__file__).resolve().parent.parent / "contracts"

# Lời gọi nhà cung cấp phải có hạn. Mặc định của SDK là 600 giây: một lượt
# treo giữ nguyên job ở `PROCESSING` đủ lâu để quét treo (15 phút) đánh dấu
# `FAILED` trong khi lượt gọi vẫn đang chạy và vẫn tính tiền.
TIMEOUT_GOI_GIAY = 120.0
SO_LAN_THU_LAI = 2

# Cạnh dài tối đa trước khi gửi đi. `config.json` đặt 1400 px và ghi rõ lý do
# ở khoá `_ghi_chu_workers`: ảnh điện thoại nguyên cỡ đẩy một lượt lên 14–24
# nghìn token, vượt trần 30.000 token mỗi phút của tài khoản và rớt 429.
CANH_DAI_MAC_DINH_PX = 1400


def nap_json(ten: str, nganh: str | None = None) -> dict:
    if nganh:
        duong_dan_nganh = CONTRACTS_DIR / nganh.lower() / ten
        if duong_dan_nganh.is_file():
            return json.loads(duong_dan_nganh.read_text(encoding="utf-8"))
    return json.loads((CONTRACTS_DIR / ten).read_text(encoding="utf-8"))


def nap_text(ten: str, nganh: str | None = None) -> str:
    if nganh:
        duong_dan_nganh = CONTRACTS_DIR / nganh.lower() / ten
        if duong_dan_nganh.is_file():
            return duong_dan_nganh.read_text(encoding="utf-8")
    return (CONTRACTS_DIR / ten).read_text(encoding="utf-8")


@dataclass
class MucDung:
    """Mức dùng THẬT của một lượt phân tích — cộng dồn qua mọi lời gọi của nó.

    `ai_requests` có sẵn bốn cột `input_tokens`/`output_tokens`/`image_count`/
    `cost_usd` từ AI-1, nhưng chưa ai điền. Hệ quả: câu "một lượt phân tích
    tốn bao nhiêu" chỉ trả lời được bằng hoá đơn cuối tháng của nhà cung cấp,
    không tách được theo tổ chức, theo bộ máy, hay theo ảnh.

    Đọc từ `response.usage` của nhà cung cấp chứ không dựng lại bằng công thức
    ô ảnh: công thức đếm token ảnh phụ thuộc cách mô hình chia ô và đổi theo
    từng bản mô hình, còn `usage` là con số nhà cung cấp dùng để tính tiền
    thật. Đo đúng thứ mình bị tính tiền.

    Bộ Đầy đủ gọi mô hình HAI lượt khi confidence thấp, nên `so_lan_goi` là
    một phần của con số — không phải mọi ảnh cùng giá.
    """

    input_tokens: int = 0
    output_tokens: int = 0
    input_cache_tokens: int = 0
    so_lan_goi: int = 0
    # Token suy luận của dòng GPT-5 trở lên. Nhà cung cấp tính nó theo giá
    # token RA và đã cộng sẵn vào `completion_tokens`, nên KHÔNG cộng lại vào
    # `output_tokens` — giữ riêng ở đây chỉ để trả lời được câu "tiền ra đi
    # vào phần trả lời hay vào phần nghĩ".
    reasoning_tokens: int = 0

    def cong(self, khac: "MucDung") -> None:
        self.input_tokens += khac.input_tokens
        self.output_tokens += khac.output_tokens
        self.input_cache_tokens += khac.input_cache_tokens
        self.so_lan_goi += khac.so_lan_goi
        self.reasoning_tokens += khac.reasoning_tokens


def doc_muc_dung(response: Any) -> MucDung:
    """`response.usage` → `MucDung`. Nhà cung cấp không trả `usage` thì trả
    khối rỗng, KHÔNG đoán: một số 0 thật thà đọc ra "chưa đo được", còn một
    số bịa đọc ra "đã đo"."""
    usage = getattr(response, "usage", None)
    if usage is None:
        return MucDung()

    chi_tiet = getattr(usage, "prompt_tokens_details", None)
    cache = getattr(chi_tiet, "cached_tokens", 0) if chi_tiet is not None else 0

    def so(ten: str) -> int:
        v = getattr(usage, ten, 0)
        return v if isinstance(v, int) else 0

    chi_tiet_ra = getattr(usage, "completion_tokens_details", None)
    suy_luan = getattr(chi_tiet_ra, "reasoning_tokens", 0) if chi_tiet_ra is not None else 0

    return MucDung(
        input_tokens=so("prompt_tokens"),
        output_tokens=so("completion_tokens"),
        input_cache_tokens=cache if isinstance(cache, int) else 0,
        so_lan_goi=1,
        reasoning_tokens=suy_luan if isinstance(suy_luan, int) else 0,
    )


def tinh_cost_usd(model: str, muc_dung: MucDung, gia_token: dict) -> float | None:
    """Tiền thật của một lượt, theo bảng giá trong `contracts/config.json`.

    Trả `None` khi không có giá cho mô hình đó — thà để trống còn hơn ghi 0,
    vì 0 trong sổ chi phí đọc ra "miễn phí".

    Giá trong bảng tính theo USD trên MỘT TRIỆU token, đúng cách nhà cung cấp
    niêm yết. Token đã đọc từ bộ đệm tính theo giá `vao_cache`, phần còn lại
    tính giá `vao`.
    """
    gia = gia_token.get(model)
    if not gia:
        return None

    vao_cache = min(muc_dung.input_cache_tokens, muc_dung.input_tokens)
    vao_thuong = muc_dung.input_tokens - vao_cache

    return (
        vao_thuong * gia.get("vao", 0.0)
        + vao_cache * gia.get("vao_cache", gia.get("vao", 0.0))
        + muc_dung.output_tokens * gia.get("ra", 0.0)
    ) / 1_000_000


# Dòng GPT-5 trở lên KHÔNG nhận `temperature`: truyền vào là lỗi 400, không
# phải bị bỏ qua lặng lẽ. Nó nhận `reasoning_effort` thay thế. Hai họ mô hình
# vì vậy cần hai bộ tham số khác nhau cho cùng một lời gọi, và chỗ duy nhất
# biết điều đó phải là đây — không phải rải `if` trong từng adapter.
HO_MO_HINH_SUY_LUAN = ("gpt-5", "gpt-6", "o1", "o3", "o4")

MUC_SUY_LUAN = ("none", "low", "medium", "high", "xhigh", "max")


def la_mo_hinh_suy_luan(model: str) -> bool:
    return model.lower().startswith(HO_MO_HINH_SUY_LUAN)


def tham_so_goi(model: str, temperature: float, muc_suy_luan: str | None = None) -> dict:
    """Tham số riêng của họ mô hình cho `chat.completions.create`.

    Mô hình cũ: `temperature`. Mô hình suy luận: `reasoning_effort` (bỏ qua
    khi không khai, để mặc định của nhà cung cấp quyết định).
    """
    if la_mo_hinh_suy_luan(model):
        if muc_suy_luan is None:
            return {}
        if muc_suy_luan not in MUC_SUY_LUAN:
            raise ValueError(f"Mức suy luận lạ: {muc_suy_luan!r} — phải là một trong {MUC_SUY_LUAN}")
        return {"reasoning_effort": muc_suy_luan}
    return {"temperature": temperature}


def goi_co_du_phong(client: Any, **kwargs: Any) -> Any:
    """Gọi `chat.completions.create`, tự bỏ tham số mà nhà cung cấp chê.

    `reasoning_effort` là tham số mới và tên của nó CHƯA được xác minh trên
    tài khoản thật cho dòng 5.6 (tài liệu công bố mức suy luận nhưng không
    nêu tên tham số của Chat Completions). Một lượt đo hỏng vì sai tên tham
    số thì mất cả lượt chạy, nên: chê tham số nào thì bỏ đúng tham số đó rồi
    gọi lại MỘT lần, và nói rõ đã bỏ gì — không nuốt lỗi.
    """
    try:
        return client.chat.completions.create(**kwargs), None
    except Exception as exc:  # noqa: BLE001
        thong_bao = str(exc)
        for ten in ("reasoning_effort", "temperature"):
            if ten in kwargs and ten in thong_bao:
                con_lai = {k: v for k, v in kwargs.items() if k != ten}
                return client.chat.completions.create(**con_lai), f"đã bỏ `{ten}`: {thong_bao[:200]}"
        raise


def doc_dap_ung(response: Any) -> dict:
    """Đọc thân JSON của một đáp ứng structured output, nói rõ khi không đọc được.

    `json.loads(response.choices[0].message.content)` đọc thẳng sẽ vỡ bằng
    `JSONDecodeError` hoặc `TypeError` ở ba tình huống bình thường của nhà
    cung cấp: mô hình từ chối trả lời (`refusal`), đáp ứng bị cắt vì chạm
    trần token (`finish_reason = "length"` — JSON cụt), hoặc `content` rỗng.
    Cả ba đều làm job `FAILED` với một câu lỗi không ai đọc ra nguyên nhân.
    """
    try:
        choice = response.choices[0]
    except (AttributeError, IndexError) as exc:
        raise ValueError("Nhà cung cấp trả đáp ứng rỗng") from exc

    tu_choi = getattr(choice.message, "refusal", None)
    if tu_choi:
        raise ValueError(f"Mô hình từ chối phân tích ảnh: {tu_choi}")

    if getattr(choice, "finish_reason", None) == "length":
        raise ValueError(
            "Đáp ứng bị cắt vì chạm trần token — JSON không trọn vẹn. "
            "Giảm khối danh mục trong lời nhắc hoặc nâng trần của mô hình."
        )

    content = getattr(choice.message, "content", None)
    if not content:
        raise ValueError(
            f"Nhà cung cấp trả thân rỗng (finish_reason={getattr(choice, 'finish_reason', None)})"
        )

    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Thân đáp ứng không phải JSON hợp lệ: {exc}") from exc


def thu_nho_anh(image: bytes, canh_dai_px: int) -> tuple[bytes, str]:
    """Trả ảnh JPEG có cạnh dài không quá `canh_dai_px`, kèm kiểu MIME.

    Hai việc cùng lúc. Thứ nhất là chi phí: số token của một ảnh tỉ lệ với
    diện tích, nên gửi ảnh gốc 4000 px thay vì 1400 px tốn khoảng tám lần
    tiền cho cùng một câu trả lời. Thứ hai là kiểu tệp: dán mọi ảnh vào URL
    dữ liệu khai `image/jpeg` kể cả khi đó là PNG hay WebP là khai sai —
    chuẩn hoá về JPEG ở đây làm lời khai đó thành đúng.

    Ảnh không đọc được thì trả nguyên byte đầu vào: quyết định ảnh hỏng hay
    không là việc của nhà cung cấp, không phải của bước chuẩn bị.
    """
    try:
        with Image.open(io.BytesIO(image)) as anh:
            anh = anh.convert("RGB")
            canh_dai = max(anh.size)
            if canh_dai > canh_dai_px:
                ty_le = canh_dai_px / canh_dai
                anh = anh.resize(
                    (max(1, round(anh.width * ty_le)), max(1, round(anh.height * ty_le))),
                    Image.Resampling.LANCZOS,
                )
            dem = io.BytesIO()
            anh.save(dem, format="JPEG", quality=90)
            return dem.getvalue(), "image/jpeg"
    except Exception:  # noqa: BLE001
        return image, "image/jpeg"
