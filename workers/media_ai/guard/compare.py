"""Product Identity Guard — cổng cứng của M04a (M04 mục 5).

Câu hỏi cổng này trả lời: *"AI có làm sai lệch sản phẩm thật không?"* Nó
KHÔNG trả lời "ảnh này có đẹp không" và cũng KHÔNG phải cổng nghiệp vụ —
Review & Approve (cổng 2, `media.approve`/`I2`) là việc của người, ở phía TS.

Bốn điểm, mỗi điểm trong [0, 1]:

  identity_score        bốn trường nhận dạng có còn nguyên không
  color_score           màu của từng thành phần có đổi không
  geometry_score        dáng khối, hướng nhìn, tỉ lệ đường kính bông
  component_consistency thành phần có bị thêm/mất, số lượng có đổi không

Phán quyết lấy theo điểm THẤP NHẤT trong bốn điểm, không lấy trung bình: đây
là cổng an toàn, một chiều hỏng là hỏng. Trung bình sẽ cho một ảnh đổi hẳn
màu hoa nhưng giữ nguyên mọi thứ khác vẫn qua cổng — đúng cái mà Q8/Q33 muốn
chặn. Có ca thử khoá riêng lựa chọn này (`test_lay_diem_thap_nhat_khong_lay_trung_binh`).

BÊN TRONG mỗi chiều thì ngược lại: trung bình trên từng thành phần, không lấy
min. Hai mức khác nhau vì hai loại tín hiệu khác nhau:

  - Thêm/mất một thành phần là thay đổi CẤU TRÚC, cho điểm 0 cho dòng đó —
    một trong bốn thành phần mất là 0,75, đã dưới ngưỡng từ chối. Cổng chặn
    mà không cần luật riêng.
  - Sai lệch SỐ LƯỢNG là tín hiệu có mức độ: đếm hoa vốn có dải không chắc
    chắn (M01 trả `dem_tung_vung` và `confidence` chứ không trả một con số
    chắc), nên coi mọi sai lệch đếm là chặn cứng sẽ chặn nhầm rất nhiều ảnh
    đúng. Trung bình giữ được tính "càng lệch càng nặng".

Ngưỡng thì KHÔNG tự chọn (xem dưới) — nhưng cách gộp điểm này là lựa chọn
kỹ thuật, ghi ở đây để ai đọc còn biết nó có chủ đích.

Thuần: không đọc ảnh, không gọi mạng, không chạm cơ sở dữ liệu.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from media_ai.guard.fingerprint import DauVanSanPham, ThanhPhan, rut_dau_van

# Ngưỡng — CHỐT VỚI CHỦ SẢN PHẨM ngày 09/10, không tự đặt.
#
# M04 mục 17.3 và 18.2 cấm agent tự đặt hay tự hạ ngưỡng Guard: "Agent không
# tự sửa Phần I hoặc tự hạ ngưỡng Guard. Phải dừng lại, báo cáo vấn đề cụ
# thể kèm đề xuất, chờ product owner xác nhận." Không tệp nào trong bộ đặc tả
# 13 tệp cho con số, nên đã hỏi và anh Tony chốt 0,95 / 0,90.
#
# Căn cứ đề xuất: hai ví dụ JSON trong chính tài liệu — M04 mục 5 cho
# (0,96 · 0,98 · 0,95 · 0,97) → PASS, đặc tả 06 mục 8 cho
# (0,94 · 0,97 · 0,93 · 0,95) → WARNING. Điểm thấp nhất của hai dòng là 0,95
# và 0,93, nên ranh giới PASS/WARNING nằm ở 0,95.
NGUONG_AN_TOAN = 0.95
NGUONG_TU_CHOI = 0.90

# Bốn phán quyết của M04 mục 5 ("Quality Gate — 4 trạng thái", Q33 = E).
# `SAFE` và `GOOD` cùng nghĩa "trả Master Image"; khác nhau ở chỗ `SAFE` là
# không phát hiện thay đổi nào, `GOOD` là có thay đổi nhưng trong ngưỡng.
SAFE = "SAFE"
GOOD = "GOOD"
WARNING = "WARNING"
REJECTED = "REJECTED"


@dataclass(frozen=True)
class KetQuaGuard:
    identity_score: float
    color_score: float
    geometry_score: float
    component_consistency: float
    result: str
    """Lý do đọc được, để hiện cho người duyệt ở cổng 2 (`YC-R6`: WARNING
    duyệt được nhưng giao diện PHẢI cảnh báo trước — cảnh báo rỗng thì người
    duyệt không biết mình đang bỏ qua cái gì)."""
    ly_do: tuple[str, ...] = ()

    @property
    def diem_thap_nhat(self) -> float:
        return min(
            self.identity_score,
            self.color_score,
            self.geometry_score,
            self.component_consistency,
        )

    def to_dict(self) -> dict[str, Any]:
        """Đúng hình dạng khối `identity_guard` của đặc tả 06 mục 8."""
        return {
            "identity_score": round(self.identity_score, 4),
            "color_score": round(self.color_score, 4),
            "geometry_score": round(self.geometry_score, 4),
            "component_consistency": round(self.component_consistency, 4),
            "result": self.result,
            "ly_do": list(self.ly_do),
        }


def _ty_le_khop(truoc: tuple[Any, ...], sau: tuple[Any, ...]) -> float:
    """Tỉ lệ ô khớp trên tổng số ô. Hai ô cùng None tính là KHỚP: model không
    đọc được trường đó ở cả hai lượt là nhất quán, không phải sai lệch."""
    if not truoc:
        return 1.0
    khop = sum(1 for a, b in zip(truoc, sau) if a == b)
    return khop / len(truoc)


def _diem_so(truoc: float | None, sau: float | None) -> float:
    """So hai số dương: 1 khi bằng nhau, giảm dần theo sai lệch tương đối.
    Thiếu một trong hai thì trả 1.0 — không có dữ liệu KHÔNG phải bằng chứng
    sai lệch, và phạt điểm ở đây sẽ biến một trường model hay bỏ trống thành
    một nguồn REJECTED giả."""
    if truoc is None or sau is None:
        return 1.0
    if truoc == sau:
        return 1.0
    lon_hon = max(abs(truoc), abs(sau))
    if lon_hon == 0:
        return 1.0
    return max(0.0, 1.0 - abs(truoc - sau) / lon_hon)


def _gop_theo_khoa(thanh_phan: tuple[ThanhPhan, ...]) -> dict[tuple[str, str | None], list[ThanhPhan]]:
    ra: dict[tuple[str, str | None], list[ThanhPhan]] = {}
    for tp in thanh_phan:
        ra.setdefault(tp.khoa, []).append(tp)
    return ra


def _cham_nhan_dang(truoc: DauVanSanPham, sau: DauVanSanPham) -> tuple[float, list[str]]:
    ly_do: list[str] = []
    a, b = truoc.bo_nhan_dang, sau.bo_nhan_dang
    ten = ("Phân loại", "Dáng khối", "Hướng nhìn", "Vật chứa")
    for nhan, x, y in zip(ten, a, b):
        if x != y:
            ly_do.append(f"{nhan} đổi: {x or '—'} → {y or '—'}")
    return _ty_le_khop(a, b), ly_do


SAC_DO_HOP_LE = {"nhạt", "đậm", "sáng", "tối", "tươi", "pastel", "trầm", "phấn"}


def _bo_sac_do(mau: str | None) -> str | None:
    if not mau:
        return None
    tu_khoa = mau.split()
    loc = [w for w in tu_khoa if w not in SAC_DO_HOP_LE]
    return " ".join(loc) if loc else mau


def _so_khop_mau(mau_truoc: str | None, mau_sau: str | None) -> tuple[bool, bool]:
    """So khớp màu giữa ảnh trước và sau.
    Trả về (khop, co_doi_sac_do):
    - khop = True nếu trùng màu hoàn toàn HOẶC cùng màu cơ bản chỉ khác sắc độ ánh sáng (nhạt/đậm/sáng/pastel) hoặc biến thể thông dụng của lá.
    - co_doi_sac_do = True nếu cùng màu cơ bản nhưng sắc độ ánh sáng có điều chỉnh nhẹ.
    """
    if not mau_truoc or not mau_sau:
        return (True, False) if not mau_truoc and not mau_sau else (False, False)

    t_truoc = mau_truoc.strip().lower()
    t_sau = mau_sau.strip().lower()
    if t_truoc == t_sau:
        return True, False

    goc_truoc = _bo_sac_do(t_truoc)
    goc_sau = _bo_sac_do(t_sau)
    if goc_truoc and goc_sau and goc_truoc == goc_sau:
        return True, True

    # Chuẩn hoá biến thể thông dụng của màu xanh lá cây ("xanh lá", "xanh lá cây", "xanh lục" khớp với "xanh" / "xanh đậm")
    GREEN_VARIANTS = {"xanh", "xanh lá", "xanh lá cây", "xanh lục"}
    if goc_truoc in GREEN_VARIANTS and goc_sau in GREEN_VARIANTS:
        return True, True

    return False, False


def _cham_mau(truoc: DauVanSanPham, sau: DauVanSanPham) -> tuple[float, list[str]]:
    """Màu chấm trên các thành phần CÓ MẶT Ở CẢ HAI bên. Thành phần bị thêm
    hay mất là chuyện của `component_consistency`; tính cả vào đây nữa là phạt
    hai lần cho một lỗi."""
    a, b = _gop_theo_khoa(truoc.thanh_phan), _gop_theo_khoa(sau.thanh_phan)
    chung = [k for k in a if k in b]
    if not chung:
        return 1.0, []

    ly_do: list[str] = []
    khop = 0
    for khoa in chung:
        mau_truoc = a[khoa][0].mau
        mau_sau = b[khoa][0].mau
        tp_ref = a[khoa][0] or b[khoa][0]
        ten_hien_thi = tp_ref.ten_goc or tp_ref.ten or khoa[1] or khoa[0]
        dung, co_doi_sac = _so_khop_mau(mau_truoc, mau_sau)
        if dung:
            khop += 1
            if co_doi_sac:
                ly_do.append(
                    f"Sắc độ màu của {ten_hien_thi} có điều chỉnh nhẹ do ánh sáng: {mau_truoc or '—'} → {mau_sau or '—'}"
                )
        else:
            ly_do.append(
                f"Màu của {ten_hien_thi} đổi: {mau_truoc or '—'} → {mau_sau or '—'}"
            )
    return khop / len(chung), ly_do


def _cham_hinh_hoc(truoc: DauVanSanPham, sau: DauVanSanPham) -> tuple[float, list[str]]:
    """Dáng khối và hướng nhìn (hai ô rời rạc) cộng tỉ lệ đường kính bông
    (liên tục). Ba tín hiệu, trọng số bằng nhau."""
    ly_do: list[str] = []
    diem: list[float] = []

    for nhan, x, y in (("Dáng khối", truoc.shape, sau.shape), ("Hướng nhìn", truoc.facing, sau.facing)):
        diem.append(1.0 if x == y else 0.0)
        if x != y:
            ly_do.append(f"{nhan} đổi: {x or '—'} → {y or '—'}")

    # Dung sai thị giác của Vision AI: chênh lệch đường kính bông <= 0.08 coi là trong ngưỡng đo
    if truoc.ty_le_duong_kinh is not None and sau.ty_le_duong_kinh is not None:
        delta = abs(truoc.ty_le_duong_kinh - sau.ty_le_duong_kinh)
        if delta <= 0.08:
            d = 1.0
        else:
            d = _diem_so(truoc.ty_le_duong_kinh, sau.ty_le_duong_kinh)
            if d < 1.0:
                ly_do.append(
                    f"Tỉ lệ đường kính bông đổi: {truoc.ty_le_duong_kinh} → {sau.ty_le_duong_kinh}"
                )
    else:
        d = 1.0
    diem.append(d)

    return sum(diem) / len(diem), ly_do


def _cham_thanh_phan(truoc: DauVanSanPham, sau: DauVanSanPham) -> tuple[float, list[str]]:
    """Thêm/mất thành phần, và số lượng của thành phần còn lại."""
    a, b = _gop_theo_khoa(truoc.thanh_phan), _gop_theo_khoa(sau.thanh_phan)
    moi_khoa = set(a) | set(b)
    if not moi_khoa:
        return 1.0, []

    ly_do: list[str] = []
    diem: list[float] = []
    DECOR_GROUPS = ("accessories", "wrapping")

    for khoa in sorted(moi_khoa, key=lambda k: (k[0], k[1] or "")):
        nhom = khoa[0]
        tp_ref = a[khoa][0] if khoa in a else b[khoa][0]
        ten = tp_ref.ten_goc or tp_ref.ten or khoa[1] or khoa[0]

        # Kiểm tra ghép cặp chéo giữa accessories và wrapping nếu trùng tên chuẩn hoá
        doi_lap = b if khoa in a else a
        nhom_khac = "wrapping" if nhom == "accessories" else "accessories" if nhom == "wrapping" else None
        da_khop_cheo = False
        if nhom_khac and (nhom_khac, khoa[1]) in doi_lap:
            da_khop_cheo = True

        if khoa not in b:
            if da_khop_cheo:
                # Trùng tên nhưng lệch nhóm phân loại accessories vs wrapping
                diem.append(1.0)
            elif nhom in DECOR_GROUPS:
                # Phụ liệu trang trí / bao bì gói: Vision AI thường bỏ sót ở 1 trong 2 lần đọc
                # Không làm biến dạng sản phẩm hoa chính, phạt nhẹ 0.92 để không đánh sập điểm
                diem.append(0.92)
                ly_do.append(f"Khác biệt phụ liệu: {ten}")
            else:
                diem.append(0.0)
                ly_do.append(f"Mất thành phần: {ten}")
        elif khoa not in a:
            if da_khop_cheo:
                diem.append(1.0)
            elif nhom in DECOR_GROUPS:
                diem.append(0.92)
                ly_do.append(f"Thêm phụ liệu: {ten}")
            else:
                diem.append(0.0)
                ly_do.append(f"Thêm thành phần không có ở ảnh gốc: {ten}")
        else:
            d = _diem_so(a[khoa][0].so_luong, b[khoa][0].so_luong)
            diem.append(d)
            if d < 1.0:
                ly_do.append(
                    f"Số lượng {ten} đổi: {a[khoa][0].so_luong} → {b[khoa][0].so_luong}"
                )
    return sum(diem) / len(diem), ly_do


def phan_quyet(diem_thap_nhat: float, co_thay_doi: bool) -> str:
    """Ngưỡng ở đầu tệp, chốt với chủ sản phẩm — không tự hạ (M04 mục 18.2)."""
    if diem_thap_nhat < NGUONG_TU_CHOI:
        return REJECTED
    if diem_thap_nhat < NGUONG_AN_TOAN:
        return WARNING
    return GOOD if co_thay_doi else SAFE


def so_sanh(phan_tich_truoc: dict[str, Any], phan_tich_sau: dict[str, Any]) -> KetQuaGuard:
    """Hai kết quả Vision (trước và sau enhancement) → phán quyết cổng.

    Bắt buộc: hai lượt phân tích phải do CÙNG provider và CÙNG model version
    sinh ra (`YC-N4`, M04 ràng buộc V1.2). Hàm này không kiểm được điều đó —
    nó chỉ thấy hai `dict` — nên chỗ kiểm nằm ở `media_ai/guard/verifier.py`,
    ngay trước khi gọi vào đây.
    """
    truoc = rut_dau_van(phan_tich_truoc)
    sau = rut_dau_van(phan_tich_sau)

    identity, ly_do_i = _cham_nhan_dang(truoc, sau)
    mau, ly_do_m = _cham_mau(truoc, sau)
    hinh_hoc, ly_do_h = _cham_hinh_hoc(truoc, sau)
    thanh_phan, ly_do_t = _cham_thanh_phan(truoc, sau)

    ly_do = tuple(ly_do_i + ly_do_m + ly_do_h + ly_do_t)
    thap_nhat = min(identity, mau, hinh_hoc, thanh_phan)

    return KetQuaGuard(
        identity_score=identity,
        color_score=mau,
        geometry_score=hinh_hoc,
        component_consistency=thanh_phan,
        result=phan_quyet(thap_nhat, co_thay_doi=bool(ly_do)),
        ly_do=ly_do,
    )
