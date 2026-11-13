"""Sổ đăng ký bộ máy phân tích — nơi duy nhất ánh xạ khoá bộ máy sang lớp.

Worker KHÔNG import lớp provider nào trực tiếp (quy tắc bất di bất dịch #2:
"Orchestrator không được import trực tiếp class provider cụ thể — chỉ làm
việc qua interface/registry"). Nó cầm một chuỗi lấy từ `payload.engine` của
dòng job và hỏi sổ này.

Khoá ở đây phải khớp từng chữ với `VISION_ENGINES` phía TypeScript
(`src/modules/products/domain/vision-engine.ts`). Hai bên không có nguồn sự
thật chung nào khác, y như `notify_channel_for` — nên có một ca thử khoá
đúng ba khoá này, và nó sẽ đỏ nếu một bên đổi mà bên kia quên.

Provider dựng LƯỜI, một lần rồi giữ lại: `OpenAI()` đọc biến môi trường lúc
dựng và các mô hình cục bộ nạp trọng số lúc dựng, nên dựng cả ba ngay lúc
worker khởi động sẽ bắt một tổ chức chỉ dùng bộ gọn phải có sẵn GPU.
"""

from __future__ import annotations

from typing import Any, Callable

KHOA_BO_MAY = ("openai_structured", "openai_direct", "local_cv")

# Phải khớp `VISION_ENGINE_MAC_DINH` phía TypeScript. Bộ "Đầy đủ" là bộ duy
# nhất mang trạng thái `san_xuat`; một dòng job cũ không khai bộ máy rơi về
# đây chứ không rơi vào một bộ chưa được đo.
MAC_DINH = "openai_structured"


def _dung_openai_structured() -> Any:
    from vision.providers.openai_structured import OpenAIStructuredProvider

    return OpenAIStructuredProvider()


def _dung_openai_direct() -> Any:
    from vision.providers.openai_direct import OpenAIDirectProvider

    return OpenAIDirectProvider()


def _dung_local_cv() -> Any:
    """SAM2 (tách) + Florence-2 (gọi tên), nạp một lần lúc dựng.

    Hai lớp nặng (`Sam2Segmenter`, `Florence2Labeler`) chỉ import `torch`
    bên trong `__init__` của chính chúng — tệp này vẫn import được ở một tổ
    chức chỉ dùng bộ Đầy đủ/Gọn mà không cài `torch`. Mọi lỗi dựng — thiếu
    gói, thiếu checkpoint, thiếu GPU — bọc lại thành `NotImplementedError`
    nói rõ nguyên nhân, chứ không để lộ một traceback khó đọc hay tệ hơn là
    lặng lẽ trả một provider giả (cùng nguyên tắc bản gốc của hàm này).

    CHƯA chạy thử trên trọng số thật — xem cảnh báo ở đầu
    `local_cv_segmenter.py`. Mã ở đây chỉ mới đóng nợ #55 phần wiring, chưa
    đóng phần "đã chạy tay ít nhất một lần" mà quy trình bàn giao đòi hỏi.
    """
    try:
        from vision.providers.local_cv_labeler import Florence2Labeler
        from vision.providers.local_cv_segmenter import Sam2Segmenter
    except ImportError as exc:
        raise NotImplementedError(
            "Bộ máy cục bộ cần `torch`, `transformers`, `sam2` và trọng số "
            "SAM2 đã tải về — cài theo `workers/requirements-local-cv.txt`. "
            f"Lỗi khi import: {exc}. "
            "Trong lúc chờ, Điều hành đổi bộ máy của tổ chức sang 'Đầy đủ' hoặc 'Gọn'."
        ) from exc

    from vision.providers.local_cv import LocalCvProvider

    try:
        bo_tach = Sam2Segmenter()
        bo_goi_ten = Florence2Labeler()
    except Exception as exc:  # noqa: BLE001 - nạp trọng số có nhiều kiểu lỗi khác nhau
        raise NotImplementedError(
            f"Bộ máy cục bộ (SAM2/Florence-2) không dựng được: {exc}. "
            "Kiểm tra `sam2_checkpoint`/`sam2_model_config`/`florence2_model_id` "
            "trong `contracts/config.json` và tài nguyên GPU của máy chủ. "
            "Trong lúc chờ, Điều hành đổi bộ máy của tổ chức sang 'Đầy đủ' hoặc 'Gọn'."
        ) from exc

    return LocalCvProvider(bo_tach=bo_tach, bo_goi_ten=bo_goi_ten)


_XUONG: dict[str, Callable[[], Any]] = {
    "openai_structured": _dung_openai_structured,
    "openai_direct": _dung_openai_direct,
    "local_cv": _dung_local_cv,
}

_DA_DUNG: dict[str, Any] = {}


def lay_provider(khoa: str | None) -> Any:
    """Provider cho một khoá bộ máy, dựng lười và giữ lại.

    Khoá lạ rơi về mặc định thay vì ném lỗi — cùng luật với
    `resolveVisionEngine` phía TS. Một dòng job cũ ghi tên bộ máy đã bỏ vẫn
    phải chạy được, chứ không nằm kẹt mãi.
    """
    ten = khoa if khoa in _XUONG else MAC_DINH
    if ten not in _DA_DUNG:
        _DA_DUNG[ten] = _XUONG[ten]()
    return _DA_DUNG[ten]

# ── Chuỗi dự phòng ─────────────────────────────────────────────────────────
# Bộ máy chính dựng không nổi — thiếu trọng số, thiếu GPU, thiếu khoá API —
# thì MỌI job của mọi tổ chức hỏng, kể cả những tổ chức không chọn bộ đó.
# Trước đây `lay_provider` ném thẳng `NotImplementedError` và không ai bắt.
#
# Hai ràng buộc của D17 giữ nguyên ở đây:
#   · sàn quyền riêng tư cắt sau cùng — một tổ chức chọn bộ CỤC BỘ vì không
#     muốn ảnh rời hạ tầng thì KHÔNG có đường dự phòng nào gửi ảnh ra ngoài.
#     Thà hỏng sạch và hoàn credit còn hơn lặng lẽ gửi ảnh đi.
#   · thác TỤT XUỐNG theo thang chất lượng: Đầy đủ → Gọn → Cục bộ. Chủ sản
#     phẩm chốt hướng này ngày 09/17, **đảo lại** luật "thác chỉ leo lên" của
#     bản trước (nợ #84). Đánh đổi đã cân: một lượt vẫn ra kết quả, chỉ kém
#     hơn, thay vì hỏng sạch và hoàn credit.
#
#     Đánh đổi đó CHỈ chấp nhận được khi kết quả kém hơn không đi im lặng.
#     Ba chỗ nói ra điều đó, và cả ba phải còn:
#       1. `product_analyses.provider` ghi bộ máy ĐÃ CHẠY THẬT, không ghi bộ
#          tổ chức đã chọn — nên màn duyệt đọc ra `local_cv` chứ không phải
#          `openai_structured`.
#       2. `ai_requests.fallback_from` ghi bộ đã hỏng, đọc được qua
#          `GET /ai-requests` (`U3`).
#       3. Sự kiện `log` của job mang `fallback_from`, nên dòng tiến trình
#          người dùng đang xem nói thẳng ra.
#     Bỏ một trong ba là biến quyết định này thành một lượt hạ chất lượng
#     không ai hay.
GUI_ANH_RA_NGOAI = {
    "openai_structured": True,
    "openai_direct": True,
    "local_cv": False,
}

# Thang chất lượng, cao xuống thấp: openai_structured › openai_direct › local_cv.
# Mỗi bộ rơi xuống những bộ NẰM DƯỚI nó, theo đúng thứ tự.
CHUOI_DU_PHONG: dict[str, tuple[str, ...]] = {
    "openai_structured": ("openai_direct", "local_cv"),
    "openai_direct": ("local_cv",),
    "local_cv": (),  # sàn quyền riêng tư: không rơi ra ngoài hạ tầng
}


def du_phong_cho(khoa: str) -> tuple[str, ...]:
    """Danh sách bộ máy được phép thay `khoa` khi nó dựng không nổi."""
    ten = khoa if khoa in _XUONG else MAC_DINH
    ra = []
    for ke in CHUOI_DU_PHONG.get(ten, ()):
        # Rào cuối, không tin bảng ở trên: bộ không gửi ảnh ra ngoài không
        # bao giờ được thay bằng bộ có gửi. Rào này ĐỘC LẬP với hướng thác —
        # đảo hướng ở trên không được phép nới nó, vì sàn quyền riêng tư cắt
        # sau cùng (D17).
        if not GUI_ANH_RA_NGOAI.get(ten, True) and GUI_ANH_RA_NGOAI.get(ke, True):
            continue
        ra.append(ke)
    return tuple(ra)


def lay_provider_co_du_phong(khoa: str | None) -> tuple[Any, str, str | None]:
    """`(provider, khoá đã dùng, khoá đã hỏng)`.

    Ném `NotImplementedError` cuối cùng khi cả chuỗi đều dựng không nổi —
    lúc đó job hỏng thật và credit được hoàn theo D3-b.
    """
    ten = khoa if khoa in _XUONG else MAC_DINH
    try:
        return lay_provider(ten), ten, None
    except NotImplementedError as loi_dau:
        for ke in du_phong_cho(ten):
            try:
                return lay_provider(ke), ke, ten
            except NotImplementedError:
                continue
        raise loi_dau

