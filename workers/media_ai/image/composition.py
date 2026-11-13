"""Bố cục khung đích cho biến thể M04b (Đợt 1 nâng cấp chất lượng ảnh, 24/09/2026).

Trước đây khung làm việc = đúng kích thước Master Image; ghép xong mới đệm màu
trơn cho đủ tỉ lệ đích (`ratio_frame.dong_khung`). Ảnh 9:16/16:9 vì vậy có hai
dải màu phẳng — đo trên 72 ảnh thật: 31,9% diện tích khung là dải đệm.

Ở đây khung làm việc được dựng NGAY theo tỉ lệ đích, còn bó hoa đặt vào theo
cỡ cảnh (`shot`) và vị trí (`placement`). Bó hoa KHÔNG bị co giãn trong khung
làm việc (tỉ lệ 1:1 với Master) — nhờ vậy phép đo Subject Integrity vẫn so
trùng từng điểm ảnh như cũ; co giãn chỉ xảy ra một lần ở bước cuối, trên cả
khung, đúng như bước `dong_khung` trước đây vẫn làm.

Thuần — chỉ số học, không PIL, để test không cần ảnh.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

SHOTS = ("close", "medium", "wide")
PLACEMENTS = ("center", "left_third", "right_third")

# Chiều cao bó hoa / chiều cao khung theo cỡ cảnh.
TY_LE_CAO_THEO_SHOT: dict[str, float] = {"close": 0.84, "medium": 0.68, "wide": 0.50}
# Tâm ngang của bó hoa theo vị trí (phần của chiều rộng khung).
TAM_NGANG: dict[str, float] = {"center": 0.5, "left_third": 1 / 3, "right_third": 2 / 3}
# Bó hoa không được rộng quá phần này của khung (chừa lề hai bên).
RONG_TOI_DA = 0.92
# medium/wide: đáy bó hoa "đứng" trên mặt phẳng ở 90% chiều cao khung.
DUONG_DAT = 0.90
LE = 0.04  # lề tối thiểu, phần của cạnh khung
# Trần phóng bó hoa từ khung làm việc lên khung xuất (24/09/2026): đo trên 72 ảnh
# thật, cảnh cận với ảnh gốc nhỏ bị phóng tới ×3,05 — LANCZOS ×3 làm mềm cánh hoa.
# Vượt trần thì nới khung (bó hoa nhỏ lại một chút) thay vì phóng. Đợt 3 (tăng
# nét) sẽ nâng trần này.
PHONG_TOI_DA = 2.0


@dataclass(frozen=True)
class BoCuc:
    rong: int          # khung làm việc (đúng tỉ lệ đích)
    cao: int
    x: int             # góc trên-trái của hộp bó hoa trong khung làm việc
    y: int
    shot: str
    placement: str


def _ty_le(ratio: str) -> tuple[int, int]:
    try:
        a, b = ratio.split(":")
        rw, rh = int(a), int(b)
        if rw > 0 and rh > 0:
            return rw, rh
    except ValueError:
        pass
    return 1, 1


def tinh_bo_cuc(
    rong_chu_the: int,
    cao_chu_the: int,
    ratio: str,
    shot: str | None = None,
    placement: str | None = None,
    cao_xuat: int | None = None,
    phong_toi_da: float = PHONG_TOI_DA,
) -> BoCuc:
    """Khung làm việc + vị trí bó hoa. Giá trị lạ lùi về `medium` / `center`.

    `cao_xuat`: chiều cao khung xuất (vd. 1920 cho 9:16). Khi có, khung làm việc
    không thấp hơn `cao_xuat / phong_toi_da` — bó hoa không bị phóng quá trần.
    """
    shot = shot if shot in TY_LE_CAO_THEO_SHOT else "medium"
    placement = placement if placement in TAM_NGANG else "center"
    rw, rh = _ty_le(ratio)
    rong_chu_the, cao_chu_the = max(1, rong_chu_the), max(1, cao_chu_the)

    cao = math.ceil(cao_chu_the / TY_LE_CAO_THEO_SHOT[shot])
    rong = math.ceil(cao * rw / rh)
    if rong_chu_the > rong * RONG_TOI_DA:  # bó hoa bè ngang → nới khung theo chiều rộng
        rong = math.ceil(rong_chu_the / RONG_TOI_DA)
        cao = math.ceil(rong * rh / rw)
    if cao_xuat and phong_toi_da > 0 and cao < cao_xuat / phong_toi_da:
        cao = math.ceil(cao_xuat / phong_toi_da)
        rong = math.ceil(cao * rw / rh)

    le_x, le_y = int(rong * LE), int(cao * LE)
    x = round(rong * TAM_NGANG[placement] - rong_chu_the / 2)
    x = max(le_x, min(x, rong - rong_chu_the - le_x))
    if shot == "close":
        y = round((cao - cao_chu_the) / 2)
    else:
        y = round(cao * DUONG_DAT - cao_chu_the)
    y = max(le_y, min(y, cao - cao_chu_the - le_y))
    # Khung quá sát bó hoa (không còn chỗ cho lề) → vẫn phải nằm trọn trong khung.
    x = max(0, min(x, rong - rong_chu_the))
    y = max(0, min(y, cao - cao_chu_the))
    return BoCuc(rong=rong, cao=cao, x=x, y=y, shot=shot, placement=placement)
