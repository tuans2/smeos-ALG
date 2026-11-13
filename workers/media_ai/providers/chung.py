"""Tiện ích dùng chung của M04a/M04b — đo lường chi phí thật, cùng nguyên tắc
với `workers/vision/providers/chung.py` (nợ #71, đợt hai 17/09): đọc đúng số
nhà cung cấp dùng để tính tiền từ `response.usage`, không dựng lại bằng công
thức đếm token/ảnh (công thức đó đổi theo từng bản mô hình).

Khác với Chat Completions (Vision dùng `prompt_tokens`/`completion_tokens`),
OpenAI Images API (`gpt-image-1`) trả `usage.input_tokens`/`output_tokens`,
tách riêng `input_tokens_details.text_tokens`/`image_tokens` — hai loại input
đó có giá KHÁC NHAU ($5 và $10 / 1M token), nên phải giữ tách, không gộp
chung như một cột `input_tokens` duy nhất, nếu không sẽ tính sai giá.

`ghi_ai_request` nằm ở đây — không lặp lại trong từng `jobs/*.py` như
`vision/jobs/worker.py` làm — vì M04a và M04b là HAI worker riêng cùng ghi
một bảng `ai_requests`. Viết hai lần cùng một câu INSERT là lần sau sửa một
cột lại quên sửa chỗ kia. `capability_code` do người gọi truyền vào (`AIC-08`
cho M04a, `AIC-17` cho M04b — `docs/dac-ta/10-ai-orchestration.md`), khác
vision (chỉ một đường gọi nên khoá cứng `AIC-01` ngay trong hàm ghi sổ).
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import psycopg

log = logging.getLogger("media_ai.providers.chung")

CONTRACTS_DIR = Path(__file__).resolve().parent.parent / "contracts"


def nap_json(ten: str) -> dict:
    return json.loads((CONTRACTS_DIR / ten).read_text(encoding="utf-8"))


@dataclass
class MucDungAnh:
    """Số token đo được từ một lượt gọi OpenAI Images API."""

    text_vao: int = 0
    anh_vao: int = 0
    anh_ra: int = 0
    so_lan_goi: int = 0

    def cong(self, khac: "MucDungAnh") -> None:
        self.text_vao += khac.text_vao
        self.anh_vao += khac.anh_vao
        self.anh_ra += khac.anh_ra
        self.so_lan_goi += khac.so_lan_goi


def doc_muc_dung_anh(response: Any) -> MucDungAnh:
    """Đọc `response.usage` của OpenAI Images API. Không có `usage` (mô hình
    không hỗ trợ, hoặc response rỗng) thì trả về mức dùng rỗng — gọi nơi khác
    (`so_do_chi_phi_anh`) tự quyết định rỗng nghĩa là gì."""
    usage = getattr(response, "usage", None)
    if usage is None:
        return MucDungAnh()

    chi_tiet = getattr(usage, "input_tokens_details", None)

    def so(nguon: Any, ten: str) -> int:
        v = getattr(nguon, ten, 0) if nguon is not None else 0
        return v if isinstance(v, int) else 0

    return MucDungAnh(
        text_vao=so(chi_tiet, "text_tokens"),
        anh_vao=so(chi_tiet, "image_tokens"),
        anh_ra=so(usage, "output_tokens"),
        so_lan_goi=1,
    )


def tinh_cost_usd_anh(model: str, muc_dung: MucDungAnh, gia_token_anh: dict) -> float | None:
    """USD của một lượt, theo bảng giá `gia_token_anh` (`contracts/config.json`).

    Không có giá cho model đó thì trả `None`, không trả `0.0` — một số 0
    trong sổ chi phí đọc ra "miễn phí", còn "chưa có giá để tính" là chuyện
    khác hẳn."""
    gia = gia_token_anh.get(model)
    if not gia:
        return None
    return (
        muc_dung.text_vao * gia.get("text_vao", 0.0)
        + muc_dung.anh_vao * gia.get("anh_vao", 0.0)
        + muc_dung.anh_ra * gia.get("anh_ra", 0.0)
    ) / 1_000_000


_GIA_TOKEN_ANH_CACHE: dict | None = None


def gia_token_anh() -> dict:
    """Bảng giá ở `contracts/config.json`, đọc một lần rồi giữ lại.

    Giá nằm trong hợp đồng chứ không trong mã: đổi giá là một dòng JSON, và
    lượt đổi đó không cần triển khai lại worker.
    """
    global _GIA_TOKEN_ANH_CACHE
    if _GIA_TOKEN_ANH_CACHE is None:
        try:
            _GIA_TOKEN_ANH_CACHE = nap_json("config.json").get("gia_token_anh") or {}
        except Exception:  # noqa: BLE001 — thiếu bảng giá thì để trống cost_usd
            _GIA_TOKEN_ANH_CACHE = {}
    return _GIA_TOKEN_ANH_CACHE


@dataclass
class MucDungLuot:
    """Mức dùng của một lượt gọi tính phí THEO LƯỢT (flat-rate), không theo
    token — đúng cách Replicate niêm yết giá `bria/expand-image` (nợ #78,
    17/09): mỗi lượt dự đoán một giá cố định, không tách input/output token
    như OpenAI Images API. Không có trường `text_vao`/`anh_vao`/`anh_ra` nào
    ở đây CÓ CHỦ ĐÍCH — `ghi_ai_request` phải đọc mức dùng bằng `getattr`
    (không giả định luôn có các trường của `MucDungAnh`), để không âm thầm
    ghi `input_tokens = 0` cho một bộ máy không có khái niệm token."""

    so_lan_goi: int = 1


def tinh_cost_usd_luot(model: str, muc_dung: MucDungLuot, gia_luot: dict) -> float | None:
    """USD của một lượt tính phí flat-rate, theo bảng giá `gia_luot`
    (`contracts/config.json`, khối `gia_luot_replicate`).

    Không có giá cho model đó thì trả `None`, cùng nguyên tắc với
    `tinh_cost_usd_anh` — "chưa có giá để tính" khác hẳn "miễn phí"."""
    gia = gia_luot.get(model)
    if not gia:
        return None
    return muc_dung.so_lan_goi * gia.get("moi_luot", 0.0)


_GIA_LUOT_REPLICATE_CACHE: dict | None = None


def gia_luot_replicate() -> dict:
    """Bảng giá `gia_luot_replicate` ở `contracts/config.json`, đọc một lần
    rồi giữ lại — cùng khuôn với `gia_token_anh()`."""
    global _GIA_LUOT_REPLICATE_CACHE
    if _GIA_LUOT_REPLICATE_CACHE is None:
        try:
            _GIA_LUOT_REPLICATE_CACHE = nap_json("config.json").get("gia_luot_replicate") or {}
        except Exception:  # noqa: BLE001 — thiếu bảng giá thì để trống cost_usd
            _GIA_LUOT_REPLICATE_CACHE = {}
    return _GIA_LUOT_REPLICATE_CACHE


def so_do_chi_phi_luot(provider: Any) -> dict[str, Any]:
    """Cùng vai trò với `so_do_chi_phi_anh`, cho bộ máy tính phí theo lượt
    (`MucDungLuot`) thay vì theo token — dùng cho `ImageExpander`
    (`AIC-13`, nợ #78). Provider không có `muc_dung_lan_cuoi` (ví dụ
    `PadExpander` — cục bộ, không tiêu tiền nhà cung cấp, hoặc
    `ReplicateOutpainter` vừa tự lùi về `PadExpander` bên trong) thì trả
    dict rỗng, giữ `cost_usd = None` — không ghi `0` cho một lượt không đo
    được, hoặc một lượt đã lùi về cục bộ."""
    muc_dung = getattr(provider, "muc_dung_lan_cuoi", None)
    if muc_dung is None:
        return {}
    model = getattr(provider, "model_version", None) or getattr(provider, "name", "")
    return {
        "muc_dung": muc_dung,
        "cost_usd": tinh_cost_usd_luot(str(model), muc_dung, gia_luot_replicate()),
    }


def so_do_chi_phi_anh(provider: Any) -> dict[str, Any]:
    """Mức dùng và tiền của lượt vừa chạy, đọc từ chính provider.

    Hỏi provider chứ không tự tính lại. Provider không có `muc_dung_lan_cuoi`
    (mọi bộ máy TRỪ `OpenAIEnhancer` — Studio/Real-ESRGAN/PIL/Passthrough đều
    100% cục bộ, còn Gemini/Replicate hiện là stub luôn lùi về PIL) thì trả
    dict rỗng, để `ghi_ai_request` giữ `cost_usd = None`, đúng nghĩa "không
    tiêu tiền nhà cung cấp" thay vì "đã đo và bằng 0". `muc_dung_lan_cuoi`
    bằng `None` (đã reset đầu lượt, chưa có lượt gọi thật nào) cũng trả rỗng
    như nhau — cả hai đường đều dẫn tới "chưa đo được", không phải hai nghĩa
    khác nhau.
    """
    muc_dung = getattr(provider, "muc_dung_lan_cuoi", None)
    if muc_dung is None:
        return {}
    model = getattr(provider, "model_version", None) or getattr(provider, "name", "")
    return {
        "muc_dung": muc_dung,
        "cost_usd": tinh_cost_usd_anh(str(model), muc_dung, gia_token_anh()),
    }


def _truong_muc_dung(muc_dung: Any, ten: str) -> int | None:
    """Đọc một trường mức dùng theo tên mà không giả định `muc_dung` là
    `MucDungAnh` — `MucDungLuot` không có `text_vao`/`anh_vao`/`anh_ra`.
    Trường không tồn tại (hoặc `muc_dung is None`) trả `None`, không trả
    `0`: `0` nghĩa là "có đo, ra số không", còn thiếu trường nghĩa là
    "khái niệm này không áp dụng cho bộ máy này" — hai nghĩa khác hẳn nhau
    (cùng nguyên tắc `cost_usd = None` vs `0.0` ở trên)."""
    if muc_dung is None:
        return None
    return getattr(muc_dung, ten, None)


def ghi_ai_request(
    conn: psycopg.Connection,
    *,
    job_id: str,
    organization_id: str,
    capability_code: str,
    model_key: str,
    outcome: str,
    latency_ms: int,
    quality_score: float | None = None,
    fallback_from: str | None = None,
    attempt: int = 1,
    muc_dung: MucDungAnh | MucDungLuot | None = None,
    cost_usd: float | None = None,
    image_count: int = 1,
) -> None:
    """Một dòng `ai_requests` cho MỖI lượt gọi mô hình của M04a/M04b — cùng
    khuôn với `vision/jobs/worker.py._ghi_ai_request` (nợ #71).

    Ghi sổ KHÔNG BAO GIỜ làm chết job: sổ hỏng thì mất số liệu chi phí, còn
    ném lỗi ở đây thì mất luôn ảnh mà khách đã trả tiền để tăng cường/dựng
    biến thể.

    `input_tokens` ghi TỔNG `text_vao + anh_vao` — lược đồ `ai_requests`
    chỉ có một cột input chung cho mọi capability, trong khi Images API tách
    hai loại token giá khác nhau. `cost_usd` đã tính ĐÚNG theo giá tách của
    từng loại (`tinh_cost_usd_anh`) TRƯỚC khi gộp ở đây, nên gộp cột hiển thị
    không làm sai tiền — chỉ mất chi tiết tách loại, tra lại được qua
    `model_key` và bảng giá nếu cần.

    `cost_usd` để TRỐNG khi provider không đo được (không có giá cho model,
    hoặc bộ máy chạy cục bộ không tiêu tiền nhà cung cấp) — không ghi `0`.

    `muc_dung` giờ có thể là `MucDungAnh` (theo token) HOẶC `MucDungLuot`
    (theo lượt, `AIC-13`/nợ #78) — hai dataclass không cùng trường. Đọc bằng
    `getattr` (`_truong_muc_dung`) thay vì truy cập thuộc tính trực tiếp, để
    một `MucDungLuot` (không có `text_vao`/`anh_vao`/`anh_ra`) ra đúng
    `input_tokens = None`/`output_tokens = None` — "khái niệm này không áp
    dụng cho bộ máy này" — chứ không bị coi nhầm thành `0` (nghĩa là "có đo,
    ra số không").
    """
    text_vao = _truong_muc_dung(muc_dung, "text_vao")
    anh_vao = _truong_muc_dung(muc_dung, "anh_vao")
    anh_ra = _truong_muc_dung(muc_dung, "anh_ra")
    input_tokens = None if (text_vao is None and anh_vao is None) else (text_vao or 0) + (anh_vao or 0)
    output_tokens = anh_ra

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_requests (
                    id, organization_id, job_id, capability_code, model_key,
                    attempt, fallback_from, source, latency_ms, quality_score,
                    input_tokens, output_tokens, image_count, cost_usd,
                    duration_seconds, outcome, created_at
                ) VALUES (
                    gen_random_uuid()::text, %s, %s, %s, %s,
                    %s, %s, 'CORE', %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, now()
                )
                """,
                (
                    organization_id,
                    job_id,
                    capability_code,
                    model_key,
                    attempt,
                    fallback_from,
                    latency_ms,
                    quality_score,
                    input_tokens,
                    output_tokens,
                    image_count,
                    cost_usd,
                    latency_ms / 1000.0,
                    outcome,
                ),
            )
        conn.commit()
    except Exception:  # noqa: BLE001 — sổ hỏng không được kéo theo job
        log.warning("không ghi được ai_requests cho job %s", job_id, exc_info=True)
