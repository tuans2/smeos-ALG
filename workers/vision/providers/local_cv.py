"""Adapter 2 — `LocalCvProvider`: SAM2 tách, Florence-2 gọi tên, chạy trên
máy chủ của chính tổ chức. Ảnh không rời khỏi hạ tầng.

## Vì sao nó không phải là một lượt đổi adapter đơn giản

`Schema.json` đòi những thứ mô hình thị giác không sinh ra được: mã danh mục
`ma`, tông màu `TM01`–`TM09`, `identity.shape`/`facing`/`container`, mười ô
`checklist`, `san_xuat.so_tang_lop`. Florence-2 trả caption và khung bao;
SAM2 trả mặt nạ. Giữa hai thứ đó và hợp đồng còn một khoảng, và tệp này là
chỗ bắc qua khoảng ấy.

## Bốn chặng

    SAM2        ảnh  → danh sách mặt nạ từng thực thể
    Florence-2  mỗi mặt nạ → nhãn tiếng Anh + độ chắc
    color_engine (đã có, thu hoạch R1) → tông màu từng cụm
    lắp ráp     → `PhanTichSanPhamHoa`

Hai chặng đầu là mô hình nặng, nằm sau hai giao thức ở dưới. Hai chặng sau
là mã thuần, chạy và kiểm được mà không cần GPU — và đó là phần tệp này
khoá bằng test.

## Mắt xích còn thiếu, và cách nó tự khai ra

Không có bộ phân loại loài THỊ GIÁC theo danh mục của từng cửa hàng — Florence-2
chỉ trả nhãn thô kiểu "a bouquet of yellow tulips", không tự biết mã `H014`.

**Cập nhật 09/11 (theo yêu cầu chủ sản phẩm):** `_dong_hoa`/`_dong_la` giờ gọi
`local_cv_species.doan_ma_loai(nhan)` — so khớp CHỮ của nhãn thô với alias
tiếng Anh trong `contracts/species_catalog.json` (trích xuất từ chính danh mục
loài của cửa hàng). Khớp ĐÚNG MỘT loài rõ ràng thì `ma`/`name` nhận mã và tên
chuẩn tiếng Việt của loài đó; khớp nhập nhằng hoặc không khớp gì thì `ma` vẫn
`null`, `name` nhận nhãn thay thế tiếng Việt `TEN_CHUA_XAC_DINH` (xem mục
"Cập nhật 09/11 lần hai" ngay dưới) — trong CẢ HAI trường hợp, nhãn tiếng Anh
gốc của mô hình giữ nguyên ở `dau_hieu_nhan_dang` để không mất dấu vết.

Đây **KHÔNG phải** nợ #56 đã trả: vẫn chỉ là so chữ, không phải mô hình thị
giác nhận diện hình dạng/màu sắc thật, nên `confidence` vẫn bị giữ nguyên ở
trần `CONFIDENCE_KHONG_CO_DANH_MUC` bất kể có khớp được mã hay không — chưa
có đo lường trên bộ ảnh vàng để biện minh cho việc nâng trần này (đúng
nguyên tắc D5-c: không đổi bằng lập luận suông). Xem `local_cv_species.py`
để biết chi tiết cách so khớp và giới hạn của nó.

Chốt với chủ sản phẩm 09/11: trả thật, không chặn.

## Cập nhật 09/11 lần hai — tên hiển thị luôn tiếng Việt

Chủ sản phẩm yêu cầu kết quả hiển thị tiếng Việt. Trước bản này, `name` khi
KHÔNG khớp được danh mục là nguyên nhãn thô tiếng Anh của Florence-2 (ví dụ
"a close up of a white sheet on a bed") — đúng thật nhưng không phải tiếng
Việt, và với các dòng SAM2/Florence-2 mô tả nhầm sang vật ở nền (nợ #60) thì
câu tiếng Anh đó còn không mô tả một loài hoa/lá nào cả.

Không dịch máy nhãn thô: dịch một câu tiếng Anh bất kỳ sang tiếng Việt cần
một bước suy luận mới (một mô hình dịch, hoặc một bộ từ điển tự chế) mà độ
đúng của nó KHÔNG kiểm chứng được ở đây — bịa một bản dịch nghe hợp lý còn
tệ hơn để nguyên tiếng Anh, vì người soát có thể tưởng đó là điều mô hình
THỊ GIÁC thật sự thấy. Thay vào đó, không khớp được danh mục thì `name` nhận
đúng một chuỗi hằng tiếng Việt `TEN_CHUA_XAC_DINH` — nói thẳng "chưa biết",
không giả vờ biết. Nhãn thô tiếng Anh gốc LUÔN được giữ lại ở
`dau_hieu_nhan_dang` (trước bản này chỉ giữ khi CÓ khớp) để không mất bằng
chứng — UI có thể hiển thị nó như một dòng phụ mờ cho người soát tham khảo
khi sửa tay, dù bản thân nó không phải tiếng Việt.

Hệ quả: một loài hoa CÓ THẬT nhưng không có alias tiếng Anh trong danh mục
(khoảng 15/86 loài, xem `species_catalog.json`) giờ cũng hiện `name` là
"Chưa xác định được tên giống" thay vì tên tiếng Anh Florence-2 đã gọi đúng
— llùi một bước về độ thông tin so với trước, đổi lấy việc không hiện tiếng
Anh cho người soát không đọc được. Đây là điều đã lường trước và đánh đổi có
chủ đích, không phải sơ suất; giảm nhẹ được tới đâu phụ thuộc vào nợ #60 (ít
nhãn nhầm hơn) và độ phủ thật của danh mục 86 loài trên ảnh thật — CHƯA đo.
"""

from __future__ import annotations

from typing import Any, Protocol, Sequence

from vision.analyzer.dem_tong import dem_tong
from vision.providers.local_cv_species import doan_ma_loai

# Mô hình không gắn được mã danh mục thì mọi dòng nó khai đều là phỏng đoán
# về tên. Trần này giữ kết quả luôn nằm dưới ngưỡng `LOW_CONFIDENCE` (70) của
# worker, nên mọi lượt chạy bằng bộ cục bộ đều vào hàng chờ duyệt có cảnh
# báo — đúng thực tế, không phải bi quan cho vui.
CONFIDENCE_KHONG_CO_DANH_MUC = 55

# Nhãn thay cho tên khi KHÔNG khớp được danh mục loài — xem mục "Cập nhật
# 09/11 lần hai" ở docstring module. Một hằng số, không phải dịch máy.
TEN_CHUA_XAC_DINH = "Chưa xác định được tên giống"


class MatNa(Protocol):
    """Một thực thể SAM2 tách ra được."""

    @property
    def bbox(self) -> tuple[float, float, float, float]:
        """Khung bao chuẩn hoá 0–1: trái, trên, phải, dưới."""
        ...

    @property
    def dien_tich(self) -> float:
        """Tỷ lệ diện tích mặt nạ trên toàn khung ảnh, 0–1."""
        ...


class BoTachThucThe(Protocol):
    """SAM2 hoặc thứ tương đương. Một hiện thực thật nạp trọng số MỘT LẦN lúc
    worker khởi động, không nạp lại mỗi job (quy tắc bất di bất dịch #6)."""

    def tach(self, image: bytes) -> Sequence[MatNa]: ...


class BoGoiTen(Protocol):
    """Florence-2 hoặc thứ tương đương. Trả nhãn thô cho một vùng ảnh."""

    def goi_ten(self, image: bytes, mat_na: MatNa) -> tuple[str, int]:
        """Trả `(nhãn, độ chắc 0–100)`."""
        ...


def _nhom_theo_nhan(nhan: str) -> str:
    """Xếp một nhãn thô vào một trong bốn khoang của `bom`.

    Danh sách từ khoá cố tình thô. Nó không cố nhận ra loài — việc đó thuộc
    bộ phân loại còn thiếu. Nó chỉ trả lời "đây là hoa, lá, phụ kiện hay vật
    liệu gói", đủ để xếp dòng vào đúng khoang, và xếp sai khoang thì người
    soát sửa được bằng một lần bấm.
    """
    thap = nhan.lower()
    if any(t in thap for t in ("leaf", "leaves", "foliage", "eucalyptus", "fern", "green")):
        return "foliage"
    if any(t in thap for t in ("paper", "wrap", "wrapping", "kraft", "cellophane")):
        return "wrapping"
    if any(t in thap for t in ("ribbon", "bow", "card", "tag", "basket", "box", "vase")):
        return "accessories"
    return "flowers"


def _dong_hoa(nhan: str, so_luong: int, chac: int) -> dict:
    """Một dòng `bom.flowers` đủ mọi trường bắt buộc của `Schema.json`.

    Trường nào bộ cục bộ không biết thì khai `null`, không khai giá trị rỗng
    giả. `null` nói "máy không biết"; chuỗi rỗng nói "máy biết là không có",
    và hai điều đó khác nhau ở màn duyệt.

    `doan_ma_loai` so CHỮ nhãn thô với danh mục loài — khớp rõ một loài thì
    `ma`/`name` nhận mã và tên chuẩn tiếng Việt; không khớp thì `ma` vẫn
    `null`, `name` nhận `TEN_CHUA_XAC_DINH` (xem docstring module). Nhãn gốc
    tiếng Anh của mô hình LUÔN dồn về `dau_hieu_nhan_dang`, khớp hay không
    cũng vậy — không mất bằng chứng.
    """
    ma, ten_chuan = doan_ma_loai(nhan)
    return {
        "nhom_hoa": None,
        "name": ten_chuan if ma else TEN_CHUA_XAC_DINH,
        "shade": None,
        "color": None,
        "quantity": so_luong,
        "dem_tung_vung": [],
        "bloom_diameter_ratio": None,
        "cluster_indices": [],
        "role": None,
        "confidence": min(chac, CONFIDENCE_KHONG_CO_DANH_MUC),
        "ma": ma,
        "dvt_dem": None,
        "mau": None,
        "mo_ta_mau": None,
        "dau_hieu_nhan_dang": nhan,
        "so_nu": None,
        "so_hong": None,
    }


def _dong_la(nhan: str, chac: int) -> dict:
    """Lá theo quy ước đếm 4: ghi tên, `quantity` để trống.

    Cùng cơ chế so khớp danh mục và cùng quy ước tên hiển thị/`dau_hieu_nhan_dang`
    với `_dong_hoa` — xem đó để biết chi tiết.
    """
    ma, ten_chuan = doan_ma_loai(nhan)
    return {
        "name": ten_chuan if ma else TEN_CHUA_XAC_DINH,
        "quantity": None,
        "cluster_indices": [],
        "role": None,
        "confidence": min(chac, CONFIDENCE_KHONG_CO_DANH_MUC),
        "color": None,
        "ma": ma,
        "dvt_dem": None,
        "mau": None,
        "mo_ta_mau": None,
        "dau_hieu_nhan_dang": nhan,
    }


def _dong_phu_kien(nhan: str, so_luong: int, chac: int) -> dict:
    return {
        "name": nhan,
        "material": None,
        "color": None,
        "quantity": so_luong,
        "printed_text": None,
        "confidence": min(chac, CONFIDENCE_KHONG_CO_DANH_MUC),
        "ma": None,
    }


def _dong_goi(nhan: str, chac: int) -> dict:
    return {
        "layer": nhan,
        "material": None,
        "color": None,
        "texture": None,
        "confidence": min(chac, CONFIDENCE_KHONG_CO_DANH_MUC),
        "ma": None,
    }


CHECKLIST_TRUONG = (
    "hoa_chu_dao",
    "hoa_phu",
    "hoa_lap_day",
    "la_nen",
    "la_diem_nhan",
    "vat_lieu_goi",
    "day_buoc",
    "ruy_bang",
    "thiep_bien_chu",
    "phu_kien_trang_tri",
)


def lap_rap(nhan_dem: dict[tuple[str, str], tuple[int, int]]) -> dict:
    """Dựng một `PhanTichSanPhamHoa` đủ hình dạng từ bảng đếm đã gom nhóm.

    `nhan_dem` khoá là `(khoang, nhãn)`, giá trị là `(số lượng, độ chắc thấp
    nhất của nhóm)`. Lấy độ chắc THẤP NHẤT chứ không phải trung bình: một
    nhóm gộp từ năm thực thể mà một thực thể mô hình rất không chắc thì cả
    nhóm đáng ngờ, và trung bình sẽ giấu mất điều đó.

    Hàm thuần — đây là phần chạy và kiểm được mà không cần GPU.
    """
    bom: dict[str, Any] = {
        "flowers": [],
        "foliage": [],
        "accessories": [],
        "wrapping": [],
        "materials_note": None,
    }
    for (khoang, nhan), (so_luong, chac) in nhan_dem.items():
        if khoang == "flowers":
            bom["flowers"].append(_dong_hoa(nhan, so_luong, chac))
        elif khoang == "foliage":
            bom["foliage"].append(_dong_la(nhan, chac))
        elif khoang == "accessories":
            bom["accessories"].append(_dong_phu_kien(nhan, so_luong, chac))
        else:
            bom["wrapping"].append(_dong_goi(nhan, chac))

    co = lambda khoang: "Có" if bom[khoang] else "Không có"  # noqa: E731
    ket_qua: dict[str, Any] = {
        "palette_accounting": [],
        # Bộ cục bộ trả lời được ba ô đầu bằng chính thứ nó đã tách ra. Bảy ô
        # còn lại đòi phân biệt vai trò từng loài — việc của bộ phân loại còn
        # thiếu — nên khai "Không có" là nói dối. `Schema.json` không cho
        # `null` ở đây, nên chúng nhận giá trị an toàn và `confidence` thấp
        # của cả bản ghi là thứ nói ra rằng chưa nên tin phần này.
        "checklist": {truong: "Không có" for truong in CHECKLIST_TRUONG},
        "identity": {"shape": None, "facing": None, "category": None, "container": None},
        "bom": bom,
        "confidence": CONFIDENCE_KHONG_CO_DANH_MUC,
        "san_xuat": {"so_tang_lop": None},
    }
    ket_qua["checklist"]["hoa_chu_dao"] = co("flowers")
    ket_qua["checklist"]["la_nen"] = co("foliage")
    ket_qua["checklist"]["vat_lieu_goi"] = co("wrapping")
    ket_qua["checklist"]["phu_kien_trang_tri"] = co("accessories")

    ket_qua.update(dem_tong(ket_qua))
    return ket_qua


class LocalCvProvider:
    """`VisionAnalyzer` chạy bằng mô hình cục bộ.

    Hai chặng nặng tiêm vào qua tham số dựng. Hiện thực thật của chúng
    (`sam2`, `transformers`) nằm ngoài tệp này và ngoài phạm vi đợt xây dựng
    trong sandbox — chỗ nạp trọng số ném lỗi nói thẳng khi thiếu, thay vì
    chạy tiếp với một mô hình giả và cho ra số trông như thật.
    """

    name = "local_cv"

    def __init__(self, bo_tach: BoTachThucThe, bo_goi_ten: BoGoiTen, phien_ban: str = "sam2+florence2") -> None:
        self._bo_tach = bo_tach
        self._bo_goi_ten = bo_goi_ten
        self._phien_ban = phien_ban

    @property
    def model_version(self) -> str:
        return self._phien_ban

    def analyze(self, image: bytes, context: dict[str, Any]) -> dict:
        mat_na_list = self._bo_tach.tach(image)

        nhan_dem: dict[tuple[str, str], tuple[int, int]] = {}
        for mat_na in mat_na_list:
            nhan, chac = self._bo_goi_ten.goi_ten(image, mat_na)
            nhan = nhan.strip()
            if not nhan:
                continue
            khoa = (_nhom_theo_nhan(nhan), nhan)
            so_luong, chac_thap_nhat = nhan_dem.get(khoa, (0, 100))
            nhan_dem[khoa] = (so_luong + 1, min(chac_thap_nhat, chac))

        return lap_rap(nhan_dem)
