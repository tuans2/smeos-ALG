#!/usr/bin/env python3
"""Bộ chấm bộ ảnh vàng — sáu chỉ số của `BO_ANH_VANG.md` mục 9.

Thay `so-sanh-ai-vs-nguoi.py`, bản chỉ so ba trường số và chỉ in ra số dòng
trùng. Sáu chỉ số dưới đây là thước đo mà cổng đổi provider đòi hỏi:

    1. Tỉ lệ đếm đúng tuyệt đối   `flower_count` khớp chính xác
    2. Sai số tuyệt đối trung bình  trung bình abs(máy − người)
    3. Tỉ lệ sai nặng               lệch từ 2 đơn vị trở lên
    4. Độ khớp cấu phần             F1 trên `canonical_component`, tính cả thiếu lẫn thừa
    5. Độ khớp màu                  phần trăm cấu phần đúng cả tên lẫn màu
    6. Chi phí và thời gian         mỗi ảnh, đọc từ tệp số liệu lượt chạy nếu có

Kết quả CẮT THEO Ô PHÂN BỔ (`BO_ANH_VANG.md` mục 3), không gộp thành một số
duy nhất: một bộ máy thắng ở ảnh đẹp nhưng thua ở ảnh mờ là thông tin quyết
định, và điểm gộp giấu đúng thông tin đó.

Ảnh thiếu nhãn người bị BỎ QUA và đếm riêng — không tính là máy sai, cũng
không tính là máy đúng. Một thước đo tự cho điểm những ô nó chưa đo là một
thước đo vô nghĩa.

Cách chạy:
    python3 scripts/cham-bo-anh-vang.py                       # bộ đang chạy
    python3 scripts/cham-bo-anh-vang.py --de-xuat golden/ai-proposals-openai
    python3 scripts/cham-bo-anh-vang.py --ra golden/diem-openai.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

GOC = Path(__file__).resolve().parents[1]
NHAN = GOC / "golden" / "labels"
MANIFEST = GOC / "golden" / "manifest.csv"

SAI_NANG_TU = 2  # lệch từ 2 đơn vị trở lên là sai nặng (mục 9)


def _doc_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _boc_ket_qua(d: dict) -> dict:
    """Hai hình dạng tệp kết quả cùng tồn tại trong `golden/`.

    Bộ chạy qua `golden-ai-proposals.py` bọc hợp đồng trong `ai_raw` kèm mấy
    trường hồ sơ (`proposed_by`, `proposed_at`); hai bộ còn lại ghi thẳng hợp
    đồng ra mức trên cùng. Đọc thẳng cả hai như nhau thì bộ bị bọc ra kết quả
    rỗng và bị chấm 0 điểm — một bộ máy chạy đúng bị chấm trượt vì hình dạng
    tệp là lỗi tệ nhất mà một thước đo có thể mắc.
    """
    raw = d.get("ai_raw")
    return raw if isinstance(raw, dict) else d


def _cau_phan_nguoi(nhan: dict) -> list[tuple[str, str]]:
    """(tên chuẩn, màu) — hình dạng nhãn người ở `golden/labels/*.json`."""
    ra = []
    for c in nhan.get("components") or []:
        ten = (c.get("canonical_component") or "").strip().lower()
        if ten:
            ra.append((ten, (c.get("color") or "").strip().lower()))
    return ra


def _cau_phan_may(kq: dict) -> list[tuple[str, str]]:
    """Gom bốn nhóm `bom` của hợp đồng về cùng hình dạng với nhãn người."""
    ra = []
    bom = kq.get("bom") or {}
    for nhom in ("flowers", "foliage", "accessories"):
        for x in bom.get(nhom) or []:
            ten = (x.get("ma") or x.get("name") or x.get("nhom_hoa") or "").strip().lower()
            if ten:
                ra.append((ten, (x.get("mau") or x.get("color") or "").strip().lower()))
    for x in bom.get("wrapping") or []:
        ten = (x.get("ma") or x.get("material") or "").strip().lower()
        if ten:
            ra.append((ten, (x.get("color") or "").strip().lower()))
    return ra


def _f1(may: list[str], nguoi: list[str]) -> float:
    """Tính cả THIẾU lẫn THỪA — mục 9 nói rõ, nên không dùng recall đơn thuần.

    Đếm theo bội (một bó có hai loại hồng khác màu là hai cấu phần), nên
    phép giao lấy theo số lần xuất hiện nhỏ hơn giữa hai bên.
    """
    if not may and not nguoi:
        return 1.0
    if not may or not nguoi:
        return 0.0
    dem_may: dict[str, int] = defaultdict(int)
    dem_nguoi: dict[str, int] = defaultdict(int)
    for t in may:
        dem_may[t] += 1
    for t in nguoi:
        dem_nguoi[t] += 1
    giao = sum(min(dem_may[t], dem_nguoi.get(t, 0)) for t in dem_may)
    if giao == 0:
        return 0.0
    precision = giao / len(may)
    recall = giao / len(nguoi)
    return 2 * precision * recall / (precision + recall)


def cham_mot_anh(nhan: dict, kq: dict) -> dict | None:
    """`None` khi nhãn người chưa có `flower_count` — chưa đo được, không đoán."""
    fc_nguoi = nhan.get("flower_count")
    if not isinstance(fc_nguoi, int):
        return None

    fc_may = kq.get("flower_count")
    lech = None if not isinstance(fc_may, int) else abs(fc_may - fc_nguoi)

    cp_nguoi = _cau_phan_nguoi(nhan)
    cp_may = _cau_phan_may(kq)
    khop_cau_phan = _f1([t for t, _ in cp_may], [t for t, _ in cp_nguoi])
    khop_mau = _f1([f"{t}|{m}" for t, m in cp_may], [f"{t}|{m}" for t, m in cp_nguoi])

    return {
        "flower_count_nguoi": fc_nguoi,
        "flower_count_may": fc_may,
        "lech": lech,
        "dung_tuyet_doi": lech == 0,
        "sai_nang": lech is not None and lech >= SAI_NANG_TU,
        "khop_cau_phan": khop_cau_phan,
        "khop_mau": khop_mau,
    }


def _o_phan_bo(nhan: dict, manifest_row: dict) -> list[str]:
    """Ba ô cắt của mục 3: số cấu phần, dạng sản phẩm, độ khó."""
    n = len(nhan.get("components") or [])
    if n < 5:
        co = "duoi-5-cau-phan"
    elif n <= 15:
        co = "5-15-cau-phan"
    else:
        co = "tren-15-cau-phan"
    dang = (nhan.get("product_form") or manifest_row.get("product_form") or "khong-ro").strip()
    kho = (nhan.get("difficulty") or manifest_row.get("difficulty") or "khong-ro").strip()
    return [co, f"dang:{dang}", f"do-kho:{kho}"]


def _tong_hop(rows: list[dict]) -> dict:
    co_lech = [r["lech"] for r in rows if r["lech"] is not None]
    return {
        "so_anh": len(rows),
        "ti_le_dung_tuyet_doi": (
            sum(1 for r in rows if r["dung_tuyet_doi"]) / len(rows) if rows else 0.0
        ),
        "sai_so_tuyet_doi_tb": statistics.fmean(co_lech) if co_lech else None,
        "ti_le_sai_nang": (sum(1 for r in rows if r["sai_nang"]) / len(rows) if rows else 0.0),
        "do_khop_cau_phan": (
            statistics.fmean([r["khop_cau_phan"] for r in rows]) if rows else 0.0
        ),
        "do_khop_mau": statistics.fmean([r["khop_mau"] for r in rows]) if rows else 0.0,
    }


def _in(ten: str, d: dict, chi_phi: dict | None = None) -> None:
    def pc(x):
        return "—" if x is None else f"{x * 100:.1f}%"

    def so(x):
        return "—" if x is None else f"{x:.2f}"

    print(f"\n{ten}  ({d['so_anh']} ảnh)")
    print(f"  1. Đếm đúng tuyệt đối     {pc(d['ti_le_dung_tuyet_doi'])}")
    print(f"  2. Sai số tuyệt đối TB    {so(d['sai_so_tuyet_doi_tb'])} cành")
    print(f"  3. Sai nặng (≥{SAI_NANG_TU})          {pc(d['ti_le_sai_nang'])}")
    print(f"  4. Khớp cấu phần          {pc(d['do_khop_cau_phan'])}")
    print(f"  5. Khớp màu               {pc(d['do_khop_mau'])}")
    if chi_phi:
        print(
            f"  6. Chi phí · thời gian    {so(chi_phi.get('usd_moi_anh'))} USD · "
            f"{so(chi_phi.get('giay_moi_anh'))} giây mỗi ảnh"
        )
    else:
        print("  6. Chi phí · thời gian    chưa có tệp số liệu lượt chạy")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--de-xuat", default="golden/ai-proposals", help="thư mục kết quả máy")
    ap.add_argument("--ra", default=None, help="xuất CSV từng ảnh")
    ap.add_argument(
        "--chi-phi",
        default=None,
        help="JSON {usd_moi_anh, giay_moi_anh} của lượt chạy, cho chỉ số 6",
    )
    args = ap.parse_args()

    thu_muc = GOC / args.de_xuat
    if not thu_muc.is_dir():
        print(f"Không thấy thư mục kết quả máy: {thu_muc}", file=sys.stderr)
        return 2

    manifest: dict[str, dict] = {}
    if MANIFEST.exists():
        with MANIFEST.open(encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                manifest[row["image_id"]] = row

    rows: list[dict] = []
    theo_o: dict[str, list[dict]] = defaultdict(list)
    thieu_nhan: list[str] = []
    thieu_ket_qua: list[str] = []

    for tep_nhan in sorted(NHAN.glob("*.json")):
        ma = tep_nhan.stem
        nhan = _doc_json(tep_nhan)
        tep_kq = thu_muc / f"{ma}.json"
        if not tep_kq.exists():
            thieu_ket_qua.append(ma)
            continue
        diem = cham_mot_anh(nhan, _boc_ket_qua(_doc_json(tep_kq)))
        if diem is None:
            thieu_nhan.append(ma)
            continue
        diem["image_id"] = ma
        rows.append(diem)
        for o in _o_phan_bo(nhan, manifest.get(ma, {})):
            theo_o[o].append(diem)

    print(f"Bộ máy: {args.de_xuat}")
    print(f"Ảnh chấm được: {len(rows)}")
    print(f"Ảnh thiếu nhãn người (flower_count rỗng): {len(thieu_nhan)}")
    print(f"Ảnh thiếu kết quả máy: {len(thieu_ket_qua)}")

    if not rows:
        print(
            "\nKHÔNG CHẤM ĐƯỢC. Bộ ảnh vàng chưa có `flower_count` của người ở ảnh nào.\n"
            "Thước đo rỗng thì mọi so sánh giữa hai bộ máy đều không có căn cứ —\n"
            "xem `docs/kien-truc/BO_ANH_VANG.md` mục 7 về quy trình gán nhãn hai vòng.",
            file=sys.stderr,
        )
        return 1

    chi_phi = _doc_json(Path(args.chi_phi)) if args.chi_phi else None
    _in("TỔNG", _tong_hop(rows), chi_phi)

    print("\nCắt theo ô phân bổ (mục 3):")
    for o in sorted(theo_o):
        _in(f"  {o}", _tong_hop(theo_o[o]))

    if args.ra:
        dich = GOC / args.ra
        with dich.open("w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(
                f,
                fieldnames=[
                    "image_id",
                    "flower_count_nguoi",
                    "flower_count_may",
                    "lech",
                    "dung_tuyet_doi",
                    "sai_nang",
                    "khop_cau_phan",
                    "khop_mau",
                ],
            )
            w.writeheader()
            for r in rows:
                w.writerow({k: r[k] for k in w.fieldnames})
        print(f"\nĐã ghi {dich}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
