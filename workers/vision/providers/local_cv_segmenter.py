"""SAM2 — chặng tách thực thể của bộ máy `local_cv` (Cục bộ).

Hiện thực `BoTachThucThe` khai ở `vision/providers/local_cv.py`. Đóng nợ kỹ
thuật #55 (`docs/dac-ta/TECHNICAL_DEBT.md`) — phần còn thiếu duy nhất của
bộ này trước đợt build 2026-09-11.

## CHƯA CHẠY THỬ MỘT LẦN NÀO TRÊN TRỌNG SỐ THẬT

Môi trường viết mã (container CI, và VM cô lập trên máy phát triển) không
truy cập được `pypi.org`/`huggingface.co` để cài `torch`, `sam2` hay tải
trọng số — đúng chặn đã ghi ở nợ #55. Quy tắc bất di bất dịch #6 (nạp trọng
số một lần, giữ lại) và quy trình bàn giao ở
`docs/kien-truc/M01_FLORAOS_VISION_CODING_AGENT_GUIDE.md` mục 4 đòi code suy
luận phải chạy thử trước khi coi là xong — tệp này CHƯA đạt điều kiện đó.

Trước khi đổi bộ máy `local_cv` sang dùng thật (kể cả ở mức `thu_nghiem`):

1. `pip install -r workers/requirements-local-cv.txt` trên máy có GPU (CUDA
   hoặc Apple Silicon MPS đều chạy được — MPS chậm hơn CUDA nhưng chạy được;
   chạy TRÊN macOS thật, không phải qua VM cô lập của Claude — VM đó không
   thấy GPU của máy).
2. Tải trọng số SAM2 (không có trên PyPI — theo hướng dẫn chính thức của
   Meta tại repo `facebookresearch/sam2`) và điền đường dẫn vào
   `contracts/config.json` khoá `sam2_checkpoint` + `sam2_model_config`.
3. Chạy `pytest workers/tests/vision/test_local_cv_segmenter.py -v` — các ca
   thử thuần (không cần GPU, không cần `torch`) phải xanh trước.
4. Rồi chạy tay `Sam2Segmenter().tach(...)` trên một ảnh thật và soát bằng
   mắt số mặt nạ + khung bao trước khi đổi bộ máy của bất kỳ tổ chức nào
   sang `local_cv`.
5. Chỉ sau khi có kết quả thật mới đối chiếu với `BO_ANH_VANG.md` và cân
   nhắc đổi `trang_thai` phía TS (`MO_TA_BO_MAY.local_cv`) — việc đổi đó vẫn
   cần đo trên bộ ảnh vàng theo D5-c, không đổi bằng lập luận.

## Vì sao tách hàm thuần ra khỏi lớp nạp mô hình

`_bbox_xywh_chuan_hoa` và `_loc_va_chuan_hoa` không đụng tới `sam2`/`torch` —
chúng chỉ làm số học trên kết quả `SAM2AutomaticMaskGenerator.generate()` đã
trả về (một danh sách dict có khoá `area`, `bbox`, `stability_score`,
`segmentation`). Tách riêng để có test chạy thật trong MỌI môi trường, kể cả
môi trường không có GPU — cùng tinh thần với `local_cv.lap_rap`: phần thuần
luôn kiểm được, phần nạp mô hình chờ máy có GPU.

## Cập nhật 09/11 — lọc chồng lấp (nợ #60, giảm nhẹ một phần)

Quan sát thật ở nợ #60: SAM2 tách CẢ khung một bó hoa lẫn từng bông con nằm
trong đó thành hai mặt nạ riêng biệt — hai mặt nạ này không phải nhiễu (cả
hai đều đủ diện tích, đủ ổn định), nên `dien_tich_toi_thieu`/`on_dinh_toi_thieu`
không lọc được. Florence-2 gọi tên cả hai, sinh hai dòng `bom` gần như lặp ý
nhau mà `_nhom_theo_nhan` (so CHỮ nguyên văn) không gộp lại được.

`_loc_chong_lap` thêm một lượt lọc thứ ba: bỏ mặt nạ LỚN nếu nó gần như CHỨA
TRỌN một mặt nạ khác nhỏ hơn đáng kể còn lại trong danh sách — giữ mặt nạ NHỎ
(đơn vị đếm được: từng bông, từng cành), bỏ mặt nạ LỚN (khung gộp, không phải
đơn vị đếm). Đây là lọc theo KHUNG BAO (bbox), không phải theo đúng đa giác
mặt nạ — rẻ và đủ dùng cho phần lớn ca thật, nhưng có thể lầm hai vật thể
tách biệt có khung bao lồng nhau (hiếm, nhưng có thể xảy ra ở cụm hoa dày).
Đo trên bộ ảnh vàng thật (nợ #24) mới biết ngưỡng `nguong_chua_toi_thieu`/
`ty_le_lon_hon_toi_thieu` có đúng hay cần đổi — CHƯA đo, đúng D5-c: hai tham
số này có mặc định hợp lý nhưng KHÔNG phải số đã đo, và mở qua `config.json`
để chỉnh không cần sửa mã.

Lọc này tắt mặc định trong `_loc_va_chuan_hoa` khi không truyền hai tham số
`nguong_chua_toi_thieu`/`ty_le_lon_hon_toi_thieu` — giữ nguyên hành vi test
cũ (dùng bbox lồng nhau giả lập, không đại diện không gian thật) không đổi.
`Sam2Segmenter` luôn truyền hai tham số này khi gọi thật.
"""

from __future__ import annotations

from typing import Any


class MatNaSam2:
    """Hiện thực `MatNa` (`local_cv.MatNa`) bọc một dict SAM2 trả về.

    `mat_na_nhi_phan` là mặt nạ nhị phân đầy đủ kích thước ẢNH GỐC (đúng
    hình dạng SAM2 trả về ở khoá `segmentation`), giữ lại NGOÀI giao thức
    `MatNa` tối thiểu (`local_cv.py` chỉ cần `bbox`/`dien_tich`) để
    `Florence2Labeler` dùng khi tô nền phần không thuộc vật thể — xem
    `local_cv_labeler._anh_da_ap_mat_na`. Mặc định `None` cho mọi chỗ chưa
    cung cấp được mặt nạ thật (test thuần, hoặc một `BoTachThucThe` khác
    không tách mặt nạ pixel).
    """

    __slots__ = ("_bbox", "_dien_tich", "_mat_na_nhi_phan")

    def __init__(
        self,
        bbox: tuple[float, float, float, float],
        dien_tich: float,
        mat_na_nhi_phan: Any | None = None,
    ) -> None:
        self._bbox = bbox
        self._dien_tich = dien_tich
        self._mat_na_nhi_phan = mat_na_nhi_phan

    @property
    def bbox(self) -> tuple[float, float, float, float]:
        return self._bbox

    @property
    def dien_tich(self) -> float:
        return self._dien_tich

    @property
    def mat_na_nhi_phan(self) -> Any | None:
        return self._mat_na_nhi_phan

    def __repr__(self) -> str:  # pragma: no cover - tiện gỡ lỗi, không phải hành vi
        return f"MatNaSam2(bbox={self._bbox!r}, dien_tich={self._dien_tich!r})"


def _bbox_xywh_chuan_hoa(
    bbox_xywh: tuple[float, float, float, float], rong: int, cao: int
) -> tuple[float, float, float, float]:
    """SAM2 trả `bbox` dạng XYWH tính bằng pixel trên ảnh gốc đưa vào
    `generate()`. `MatNa` của `local_cv` đòi chuẩn hoá 0-1 theo (trái, trên,
    phải, dưới) — quy ước dùng chung với phần còn lại của module: không
    trường nào của `Schema.json` dùng pixel tuyệt đối, vì ảnh gửi cho các bộ
    máy khác luôn bị thu nhỏ trước ở `chung.thu_nho_anh`.

    Ảnh 0x0 (đầu vào hỏng) trả khung rỗng thay vì chia cho không.
    """
    if rong <= 0 or cao <= 0:
        return (0.0, 0.0, 0.0, 0.0)
    x, y, bw, bh = bbox_xywh
    trai = min(max(x / rong, 0.0), 1.0)
    tren = min(max(y / cao, 0.0), 1.0)
    phai = min(max((x + bw) / rong, 0.0), 1.0)
    duoi = min(max((y + bh) / cao, 0.0), 1.0)
    return (trai, tren, max(phai, trai), max(duoi, tren))


def _dien_tich_bbox(bbox: tuple[float, float, float, float]) -> float:
    return max(bbox[2] - bbox[0], 0.0) * max(bbox[3] - bbox[1], 0.0)


def _dien_tich_giao(
    a: tuple[float, float, float, float], b: tuple[float, float, float, float]
) -> float:
    """Diện tích phần giao của hai khung bao chuẩn hoá 0-1 (trái, trên, phải,
    dưới). Hai khung không chạm nhau trả 0, không trả số âm."""
    trai = max(a[0], b[0])
    tren = max(a[1], b[1])
    phai = min(a[2], b[2])
    duoi = min(a[3], b[3])
    if phai <= trai or duoi <= tren:
        return 0.0
    return (phai - trai) * (duoi - tren)


def _ty_le_b_nam_trong_a(
    a: tuple[float, float, float, float], b: tuple[float, float, float, float]
) -> float:
    """Tỷ lệ diện tích của `b` nằm trong `a` — 1.0 nghĩa là `b` nằm trọn
    trong `a`, 0.0 nghĩa là không chạm nhau. `b` diện tích 0 (khung suy
    biến) trả 0, không chia cho không."""
    dien_tich_b = _dien_tich_bbox(b)
    if dien_tich_b <= 0:
        return 0.0
    return _dien_tich_giao(a, b) / dien_tich_b


def _loc_chong_lap(
    danh_sach: list[MatNaSam2],
    nguong_chua_toi_thieu: float,
    ty_le_lon_hon_toi_thieu: float,
) -> list[MatNaSam2]:
    """Bỏ mặt nạ LỚN nếu nó gần như CHỨA TRỌN một mặt nạ khác nhỏ hơn đáng
    kể còn lại trong `danh_sach` — xem mục "Cập nhật 09/11" ở docstring
    module để biết lý do (nợ #60: bó hoa và từng bông con trong đó cùng
    được SAM2 tách thành hai mặt nạ).

    Bỏ mặt nạ lớn (không phải mặt nạ nhỏ) khi CẢ HAI đúng:

    - mặt nạ nhỏ nằm trong mặt nạ lớn ít nhất `nguong_chua_toi_thieu` phần
      diện tích của chính nó;
    - mặt nạ lớn có diện tích ít nhất gấp `ty_le_lon_hon_toi_thieu` lần mặt
      nạ nhỏ.

    Hai mặt nạ kích thước ngang nhau, chồng nhau một phần (SAM2 tách đôi
    cùng một vật thể ở biên mờ) KHÔNG rơi vào ca này — đó là một dạng trùng
    lặp khác, chưa xử lý ở đây, để dành khi có ảnh thật để soát.

    Hàm thuần, O(n²) — `n` đã bị `so_luong_toi_da` chặn trần ở nơi gọi nên
    không đáng lo cho một ảnh thật.
    """
    if len(danh_sach) <= 1:
        return list(danh_sach)

    can_bo: set[int] = set()
    for i, lon in enumerate(danh_sach):
        if i in can_bo:
            continue
        for j, nho in enumerate(danh_sach):
            if i == j or j in can_bo:
                continue
            if lon.dien_tich < nho.dien_tich * ty_le_lon_hon_toi_thieu:
                continue
            if _ty_le_b_nam_trong_a(lon.bbox, nho.bbox) >= nguong_chua_toi_thieu:
                can_bo.add(i)
                break
    return [mn for i, mn in enumerate(danh_sach) if i not in can_bo]


def _loc_va_chuan_hoa(
    mat_na_tho: list[dict[str, Any]],
    rong: int,
    cao: int,
    dien_tich_toi_thieu: float,
    on_dinh_toi_thieu: float,
    so_luong_toi_da: int,
    nguong_chua_toi_thieu: float | None = None,
    ty_le_lon_hon_toi_thieu: float | None = None,
) -> list[MatNaSam2]:
    """Lọc nhiễu và chuẩn hoá đầu ra thô của `SAM2AutomaticMaskGenerator`.

    Ba lý do lọc theo diện tích/ổn định, không phải một:

    - `dien_tich_toi_thieu` bỏ mặt nạ vụn (nếp gấp giấy gói, hạt bụi) — SAM2
      tự động tách MỌI thứ nó thấy được, kể cả chi tiết không ai quan tâm
      khi đếm sản phẩm.
    - `on_dinh_toi_thieu` bỏ mặt nạ SAM2 tự báo không chắc
      (`stability_score` thấp) — thường là nhiễu ở biên giữa các cụm hoa
      dính nhau.
    - `so_luong_toi_da` chặn trần số lần gọi Florence-2 tiếp theo: một khung
      hoa vài trăm bông không cần từng ấy lượt gọi mô hình gán nhãn —
      `local_cv._nhom_theo_nhan` gộp các nhãn giống nhau lại sau đó, nên cắt
      bớt thực thể nhỏ nhất không làm sai tổng đếm bao nhiêu.

    Truyền cả `nguong_chua_toi_thieu` VÀ `ty_le_lon_hon_toi_thieu` (khác
    `None`) thì chạy thêm `_loc_chong_lap` — bỏ luôn mặt nạ lớn chứa trọn
    mặt nạ nhỏ (nợ #60). Để mặc định (`None`) thì TẮT bước này, giữ hành vi
    cũ — `Sam2Segmenter` luôn truyền khi gọi thật; các ca thử trong tệp này
    dùng bbox lồng nhau giả lập để kiểm sắp xếp/cắt trần, không đại diện
    không gian thật, nên cố tình không bật lọc chồng lấp.

    Sắp theo diện tích giảm dần trước khi lọc chồng lấp và cắt bớt: giữ thực
    thể LỚN trước khi so — `_loc_chong_lap` cần biết thứ tự lớn/nhỏ, và giữ
    thực thể LỚN trước khi cắt theo `so_luong_toi_da` — một cụm hoa chiếm
    nửa khung ảnh quan trọng hơn một mảnh lá ở góc ảnh.

    Dòng thiếu `area` hoặc `bbox` bị bỏ qua thay vì làm hàm vỡ: một phiên
    bản SAM2 khác có thể đổi hình dạng dict trả về, và một mặt nạ đọc không
    được nên biến mất khỏi kết quả, không nên làm cả lượt phân tích lỗi.
    """
    ung_vien: list[MatNaSam2] = []
    for mn in mat_na_tho:
        dien_tich_px = mn.get("area")
        bbox = mn.get("bbox")
        if dien_tich_px is None or bbox is None:
            continue
        on_dinh = mn.get("stability_score", 1.0)
        if on_dinh is not None and on_dinh < on_dinh_toi_thieu:
            continue
        ty_le = dien_tich_px / float(rong * cao) if rong and cao else 0.0
        if ty_le < dien_tich_toi_thieu:
            continue
        ung_vien.append(
            MatNaSam2(
                bbox=_bbox_xywh_chuan_hoa(tuple(bbox), rong, cao),
                dien_tich=ty_le,
                mat_na_nhi_phan=mn.get("segmentation"),
            )
        )

    ung_vien.sort(key=lambda mn: mn.dien_tich, reverse=True)

    if nguong_chua_toi_thieu is not None and ty_le_lon_hon_toi_thieu is not None:
        ung_vien = _loc_chong_lap(ung_vien, nguong_chua_toi_thieu, ty_le_lon_hon_toi_thieu)

    if so_luong_toi_da > 0:
        ung_vien = ung_vien[:so_luong_toi_da]

    return ung_vien


class Sam2Segmenter:
    """`BoTachThucThe` — SAM2 chạy trên máy chủ của chính tổ chức.

    Nạp `torch`/`sam2` và trọng số LÚC DỰNG (`__init__`), không lúc import
    tệp này — tệp này import được ở một tổ chức chỉ dùng bộ Đầy đủ/Gọn mà
    không cài `torch`, vì hai lớp con nặng chỉ import bên trong `__init__`.
    `registry._dung_local_cv` bọc mọi lỗi dựng lớp này (thiếu gói, thiếu
    checkpoint, thiếu GPU) thành `NotImplementedError` nói rõ nguyên nhân
    (quy tắc bất di bất dịch #2, #6).
    """

    name = "local_cv.sam2_segmenter"

    def __init__(
        self,
        checkpoint: str | None = None,
        model_config: str | None = None,
        device: str | None = None,
        dien_tich_toi_thieu: float | None = None,
        on_dinh_toi_thieu: float | None = None,
        so_luong_toi_da: int | None = None,
        nguong_chua_toi_thieu: float | None = None,
        ty_le_lon_hon_toi_thieu: float | None = None,
    ) -> None:
        from vision.providers.chung import nap_json

        config = nap_json("config.json")

        # Soát cấu hình TRƯỚC khi import torch/sam2: một `config.json` thiếu
        # khoá phải báo lỗi rõ ràng ngay cả trên máy chưa cài `torch` —
        # không cần GPU để biết config sai.
        self._checkpoint = checkpoint or config.get("sam2_checkpoint")
        self._model_config = model_config or config.get("sam2_model_config")
        if not self._checkpoint or not self._model_config:
            raise ValueError(
                "Thiếu `sam2_checkpoint` hoặc `sam2_model_config` trong "
                "contracts/config.json — điền đường dẫn trọng số SAM2 đã tải "
                "về (không có trên PyPI, xem hướng dẫn ở đầu module này)."
            )

        self._dien_tich_toi_thieu = (
            dien_tich_toi_thieu
            if dien_tich_toi_thieu is not None
            else float(config.get("sam2_dien_tich_toi_thieu_ty_le", 0.001))
        )
        self._on_dinh_toi_thieu = (
            on_dinh_toi_thieu
            if on_dinh_toi_thieu is not None
            else float(config.get("sam2_on_dinh_toi_thieu", 0.9))
        )
        self._so_luong_toi_da = (
            so_luong_toi_da
            if so_luong_toi_da is not None
            else int(config.get("sam2_so_luong_toi_da", 40))
        )
        # Nợ #60 (giảm nhẹ 09/11) — xem docstring module. Mặc định 0.85/1.5
        # là số HỢP LÝ, KHÔNG phải số đã đo trên bộ ảnh vàng (D5-c).
        self._nguong_chua_toi_thieu = (
            nguong_chua_toi_thieu
            if nguong_chua_toi_thieu is not None
            else float(config.get("sam2_nguong_chua_toi_thieu", 0.85))
        )
        self._ty_le_lon_hon_toi_thieu = (
            ty_le_lon_hon_toi_thieu
            if ty_le_lon_hon_toi_thieu is not None
            else float(config.get("sam2_ty_le_lon_hon_toi_thieu", 1.5))
        )

        # Từ đây trở xuống mới đụng `torch`/`sam2`/`numpy` — import trong
        # __init__, không ở đầu tệp, cùng lý do docstring lớp.
        import numpy as np
        import torch
        from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator
        from sam2.build_sam import build_sam2

        self._device = device or config.get("local_cv_device") or (
            "cuda"
            if torch.cuda.is_available()
            else "mps"
            if torch.backends.mps.is_available()
            else "cpu"
        )

        # Nạp trọng số MỘT LẦN ở đây — provider này sống suốt vòng đời worker
        # (`registry.lay_provider` dựng lười, giữ lại — quy tắc #6).
        sam2_model = build_sam2(self._model_config, self._checkpoint, device=self._device)
        self._mask_generator = SAM2AutomaticMaskGenerator(sam2_model)
        self._np = np

    @property
    def model_version(self) -> str:
        return f"sam2:{self._model_config}"

    def tach(self, image: bytes) -> list[MatNaSam2]:
        import io

        from PIL import Image

        with Image.open(io.BytesIO(image)) as anh:
            anh_rgb = anh.convert("RGB")
            mang = self._np.array(anh_rgb)

        cao, rong = mang.shape[0], mang.shape[1]
        mat_na_tho = self._mask_generator.generate(mang)
        return _loc_va_chuan_hoa(
            mat_na_tho,
            rong=rong,
            cao=cao,
            dien_tich_toi_thieu=self._dien_tich_toi_thieu,
            on_dinh_toi_thieu=self._on_dinh_toi_thieu,
            so_luong_toi_da=self._so_luong_toi_da,
            nguong_chua_toi_thieu=self._nguong_chua_toi_thieu,
            ty_le_lon_hon_toi_thieu=self._ty_le_lon_hon_toi_thieu,
        )
