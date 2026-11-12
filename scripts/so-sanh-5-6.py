#!/usr/bin/env python3
"""So sánh GPT-5.6 với mô hình đang chạy, trên CẢ HAI cơ chế, cùng một tập ảnh.

Câu hỏi script này trả lời — và chỉ đúng một câu hỏi đó:

    Đổi sang GPT-5.6 thì mỗi ảnh tốn bao nhiêu, và kết quả phân tích
    khác gì so với gpt-4o / gpt-4o-mini đang chạy?

Ma trận 14 tổ hợp trên cùng 4 ảnh (56 lượt phân tích):

    Đang chạy   Đầy đủ × gpt-4o            · Gọn × gpt-4o-mini
    GPT-5.6     Đầy đủ × {sol,terra,luna} × {low,high}
                Gọn    × {sol,terra,luna} × {low,high}

So hai mô hình trên hai tập ảnh khác nhau là so hai thứ không so được, nên
MỌI tổ hợp chạy trên ĐÚNG cùng 4 ảnh. Thiếu ô nào thì ô đó để trống chứ
không lấy số của lượt chạy khác lấp vào.

    python3 scripts/so-sanh-5-6.py --xem      # đếm việc, không gọi, không tốn tiền
    python3 scripts/so-sanh-5-6.py --chay     # chạy thật, cần OPENAI_API_KEY
    python3 scripts/so-sanh-5-6.py --chay --bo-qua-loi   # gặp lỗi thì đi tiếp

Chạy từ thư mục gốc repo. Kết quả ghi vào `golden/so-sanh-5-6/`, chạy lại chỉ
lấp ô còn trống (xoá tệp kết quả nếu muốn đo lại từ đầu).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

GOC = Path(__file__).resolve().parent.parent
WORKERS = GOC / "workers"
ANH_DIR = GOC / "golden" / "images"
NHAN_DIR = GOC / "golden" / "labels"
RA_DIR = GOC / "golden" / "so-sanh-5-6"
sys.path.insert(0, str(WORKERS))

# Bốn ảnh có nhãn người cho `bud_count`/`damaged_count` — đó là hai trường
# DUY NHẤT hiện có đáp án thật để đối chiếu (nợ #24a: `flower_count` chưa ai
# đếm tay). Chọn ảnh khác bằng `--anh g003,g004,...`.
ANH_MAC_DINH = ["g001", "g002", "g009", "g010"]

def _nap_env() -> None:
    """Đọc `OPENAI_API_KEY` từ `.env` khi shell chưa export nó.

    Khoá vốn đã nằm trong `.env` của repo — ứng dụng đọc nó, còn một script
    chạy tay thì không, và người chạy không có lý do gì để đoán ra sự khác
    nhau đó. Chỉ đọc ĐÚNG khoá này, không nạp cả tệp: một script đo chi phí
    không có việc gì với `DATABASE_URL`.
    """
    if os.environ.get("OPENAI_API_KEY"):
        return
    tep = GOC / ".env"
    if not tep.exists():
        return
    for dong in tep.read_text(encoding="utf-8").splitlines():
        dong = dong.strip()
        if not dong.startswith("OPENAI_API_KEY") or "=" not in dong:
            continue
        gia_tri = dong.split("=", 1)[1].strip().strip('"').strip("'")
        if gia_tri:
            os.environ["OPENAI_API_KEY"] = gia_tri
            print(f"Đã lấy OPENAI_API_KEY từ {tep.name} (…{gia_tri[-4:]})")


def _doi_python_neu_thieu_goi() -> None:
    """Chạy lại chính mình bằng venv có `openai` nếu `python3` hiện tại thiếu.

    `python3` trên máy thật là Python của hệ điều hành hoặc Homebrew và
    thường KHÔNG có gói của dự án. Bắt người chạy nhớ đường dẫn venv nào là
    cách chắc chắn để lệnh hỏng — `chay-du-bo-may.py` đã giải đúng bài này,
    đây là bản gọn của cùng cách làm.
    """
    if os.environ.get("ALG_DA_DOI_PYTHON"):
        return
    try:
        import openai  # noqa: F401
        import numpy  # noqa: F401
        from PIL import Image  # noqa: F401
        return
    except ImportError:
        pass

    import subprocess

    ung_vien = sorted(WORKERS.glob(".venv*/bin/python")) + sorted(WORKERS.glob(".venv*/bin/python3"))
    for py in ung_vien:
        if not py.exists():
            continue
        thu = subprocess.run([str(py), "-c", "import openai, numpy, PIL"], capture_output=True, timeout=180)
        if thu.returncode == 0:
            print(f"python3 hiện tại thiếu gói — chuyển sang {py}")
            os.environ["ALG_DA_DOI_PYTHON"] = "1"
            os.execv(str(py), [str(py), str(Path(__file__).resolve()), *sys.argv[1:]])
    print(
        "Không tìm thấy trình thông dịch nào có đủ `openai`, `numpy`, `PIL`.\n"
        "Tạo venv rồi chạy lại:\n"
        "    python3 -m venv workers/.venv && workers/.venv/bin/pip install -r workers/requirements.txt",
        file=sys.stderr,
    )
    raise SystemExit(2)


BIEN_THE_5_6 = ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]
MUC_SUY_LUAN = ["low", "high"]

# Giây nghỉ giữa hai lượt gọi. Trần của tài khoản là 30.000 token/phút và bộ
# Gọn trên gpt-4o-mini một mình đã ngốn 29.456 token một ảnh — chạy sát nhau
# là rớt 429, đúng cái đã làm hỏng ô g011 của lượt đo 17/09.
NGHI_GIAY = 8.0


def _kiem_truoc_khi_tieu_tien() -> None:
    """Xác nhận SDK nhận `reasoning_effort` TRƯỚC khi bỏ tiền ra chạy.

    Nếu SDK quá cũ, `goi_co_du_phong` sẽ tự bỏ tham số và lượt chạy vẫn
    xong — nhưng khi đó `low` và `high` chạy y hệt nhau, và cả nửa bảng so
    sánh thành vô nghĩa dù đã tiêu đủ tiền. Thà biết trước ở đây.
    """
    import inspect

    from openai import OpenAI

    try:
        tham_so = inspect.signature(OpenAI().chat.completions.create).parameters
    except Exception:  # noqa: BLE001
        return
    if "reasoning_effort" in tham_so or any(
        p.kind is inspect.Parameter.VAR_KEYWORD for p in tham_so.values()
    ):
        return
    import openai

    print(
        f"\nCẢNH BÁO: SDK openai {openai.__version__} KHÔNG nhận `reasoning_effort`.\n"
        "Lượt chạy vẫn xong, nhưng `low` và `high` sẽ gọi y hệt nhau — nửa bảng so sánh\n"
        "thành vô nghĩa dù đã tiêu đủ tiền. Nâng SDK trước rồi chạy lại:\n"
        "    workers/.venv/bin/pip install -U openai\n",
        file=sys.stderr,
    )
    tra_loi = input("Vẫn chạy tiếp? [y/N] ").strip().lower()
    if tra_loi != "y":
        raise SystemExit("Đã dừng — chưa gọi lượt nào.")


def _to_hop() -> list[dict]:
    """14 tổ hợp, baseline trước để nếu phải dừng giữa chừng vẫn có mốc so."""
    ra = [
        {"co_che": "day-du", "model": "gpt-4o", "effort": None, "nhom": "đang chạy"},
        {"co_che": "gon", "model": "gpt-4o-mini", "effort": None, "nhom": "đang chạy"},
    ]
    for co_che in ("day-du", "gon"):
        for model in BIEN_THE_5_6:
            for effort in MUC_SUY_LUAN:
                ra.append({"co_che": co_che, "model": model, "effort": effort, "nhom": "GPT-5.6"})
    return ra


def _khoa(to_hop: dict, anh: str) -> str:
    return f"{to_hop['co_che']}|{to_hop['model']}|{to_hop['effort'] or '-'}|{anh}"


def _dung_provider(to_hop: dict):
    if to_hop["co_che"] == "day-du":
        from vision.providers.openai_structured import OpenAIStructuredProvider

        return OpenAIStructuredProvider(
            model=to_hop["model"],
            muc_suy_luan=to_hop["effort"],
            # Lượt hai của mô hình suy luận là lượt NGHĨ KỸ HƠN, không phải
            # lượt lắc nhiệt độ: low thì nâng lên high, high thì đã kịch.
            muc_suy_luan_luot_hai="high" if to_hop["effort"] == "low" else to_hop["effort"],
        )
    from vision.providers.openai_direct import OpenAIDirectProvider

    return OpenAIDirectProvider(model=to_hop["model"], muc_suy_luan=to_hop["effort"])


def _dem_truong(obj, sau: int = 0) -> tuple[int, int]:
    """(số lá có giá trị, tổng số lá) — thước đo "đầy đủ trường" thô.

    Một trường `null` trong hợp đồng nghĩa là mô hình không khai được, nên
    tỷ lệ lá có giá trị là câu trả lời gần nhất cho "bộ nào điền đầy hơn".
    Nó KHÔNG nói trường điền vào là đúng — đó là việc của phép đối chiếu
    nhãn người, không phải của phép đếm này.
    """
    if sau > 8:
        return 0, 0
    if isinstance(obj, dict):
        co = tong = 0
        for v in obj.values():
            a, b = _dem_truong(v, sau + 1)
            co += a
            tong += b
        return co, tong
    if isinstance(obj, list):
        if not obj:
            return 0, 1
        co = tong = 0
        for v in obj:
            a, b = _dem_truong(v, sau + 1)
            co += a
            tong += b
        return co, tong
    return (0 if obj in (None, "") else 1), 1


def _tom_tat(kq: dict) -> dict:
    bom = kq.get("bom") or {}
    co, tong = _dem_truong(kq)
    return {
        "flower_count": kq.get("flower_count"),
        "bud_count": kq.get("bud_count"),
        "damaged_count": kq.get("damaged_count"),
        "so_dong_hoa": len(bom.get("flowers") or []),
        "so_dong_la": len(bom.get("foliage") or []),
        "so_dong_phu_kien": len(bom.get("accessories") or []),
        "so_lop_goi": len(bom.get("wrapping") or []),
        "confidence": kq.get("confidence"),
        "category": (kq.get("identity") or {}).get("category"),
        "shape": (kq.get("identity") or {}).get("shape"),
        "phong_cach": (kq.get("identity") or {}).get("phong_cach"),
        "dip_su_dung": (kq.get("identity") or {}).get("dip_su_dung"),
        "truong_co_gia_tri": co,
        "truong_tong": tong,
        "ty_le_day_truong": round(co / tong, 4) if tong else None,
    }


def _nhan_nguoi(anh: str) -> dict:
    tep = NHAN_DIR / f"{anh}.json"
    if not tep.exists():
        return {}
    d = json.loads(tep.read_text(encoding="utf-8"))
    return {k: d.get(k) for k in ("flower_count", "bud_count", "damaged_count") if d.get(k) is not None}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--xem", action="store_true", help="chỉ liệt kê việc còn thiếu, không gọi")
    ap.add_argument("--chay", action="store_true", help="chạy thật (tốn tiền)")
    ap.add_argument("--anh", default=",".join(ANH_MAC_DINH))
    ap.add_argument("--bo-qua-loi", action="store_true")
    ap.add_argument("--nghi", type=float, default=NGHI_GIAY)
    args = ap.parse_args()

    if not args.xem and not args.chay:
        ap.error("chọn --xem (không tốn tiền) hoặc --chay (gọi thật)")

    if args.chay:
        # Chỉ khi chạy thật: `--xem` phải chạy được trên một python trần,
        # không có gói gì, và không cần khoá.
        _doi_python_neu_thieu_goi()
        _nap_env()

    danh_sach_anh = [a.strip() for a in args.anh.split(",") if a.strip()]
    RA_DIR.mkdir(parents=True, exist_ok=True)
    tep_kq = RA_DIR / "ket-qua.jsonl"

    da_co: dict[str, dict] = {}
    if tep_kq.exists():
        for dong in tep_kq.read_text(encoding="utf-8").splitlines():
            if dong.strip():
                b = json.loads(dong)
                da_co[b["khoa"]] = b

    viec = []
    for th in _to_hop():
        for anh in danh_sach_anh:
            k = _khoa(th, anh)
            if k not in da_co or da_co[k].get("loi"):
                viec.append((th, anh, k))

    print(f"Ảnh: {', '.join(danh_sach_anh)}")
    print(f"Tổ hợp: {len(_to_hop())} · ô cần chạy: {len(viec)} · đã có: {len(da_co)}")
    if args.xem:
        for th, anh, k in viec:
            print(f"  thiếu  {k}")
        print("\nChưa gọi lượt nào. Chạy thật bằng: python3 scripts/so-sanh-5-6.py --chay")
        return 0

    if not os.environ.get("OPENAI_API_KEY"):
        print(
            "THIẾU OPENAI_API_KEY — dừng, chưa gọi lượt nào.\n"
            "Không thấy trong biến môi trường lẫn trong .env ở gốc repo. Xuất tay:\n"
            '    export OPENAI_API_KEY="sk-..."',
            file=sys.stderr,
        )
        return 2

    _kiem_truoc_khi_tieu_tien()

    from vision.providers.chung import tinh_cost_usd

    gia_token = json.loads((WORKERS / "vision" / "contracts" / "config.json").read_text(encoding="utf-8"))["gia_token"]

    provider_cache: dict[str, object] = {}
    so_loi = 0
    with tep_kq.open("a", encoding="utf-8") as f:
        for i, (th, anh, k) in enumerate(viec, 1):
            duong_anh = next((p for p in ANH_DIR.glob(f"{anh}.*")), None)
            if duong_anh is None:
                print(f"  [{i}/{len(viec)}] BỎ QUA {k} — không thấy ảnh")
                continue
            print(f"  [{i}/{len(viec)}] {k} ... ", end="", flush=True)
            ten_cache = f"{th['co_che']}|{th['model']}|{th['effort']}"
            if ten_cache not in provider_cache:
                provider_cache[ten_cache] = _dung_provider(th)
            prov = provider_cache[ten_cache]

            ban_ghi = {
                "khoa": k, "anh": anh, "co_che": th["co_che"], "model": th["model"],
                "effort": th["effort"], "nhom": th["nhom"],
                "luc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            }
            t0 = time.time()
            try:
                kq = prov.analyze(duong_anh.read_bytes(), {})
                giay = time.time() - t0
                md = getattr(prov, "muc_dung_lan_cuoi", None)
                ban_ghi.update({
                    "giay": round(giay, 2),
                    "input_tokens": getattr(md, "input_tokens", None),
                    "output_tokens": getattr(md, "output_tokens", None),
                    "reasoning_tokens": getattr(md, "reasoning_tokens", None),
                    "cache_tokens": getattr(md, "input_cache_tokens", None),
                    "so_lan_goi": getattr(md, "so_lan_goi", None),
                    "cost_usd": tinh_cost_usd(th["model"], md, gia_token) if md else None,
                    "canh_bao_tham_so": list(getattr(prov, "canh_bao_tham_so", []) or []),
                    "tom_tat": _tom_tat(kq),
                    "nhan_nguoi": _nhan_nguoi(anh),
                    "ket_qua": kq,
                })
                usd = ban_ghi["cost_usd"]
                print(f"{giay:.1f}s · {usd if usd is None else format(usd, '.5f')} USD"
                      + (f" · SUY LUẬN {ban_ghi['reasoning_tokens']}" if ban_ghi.get("reasoning_tokens") else "")
                      + (" · " + "; ".join(ban_ghi["canh_bao_tham_so"]) if ban_ghi["canh_bao_tham_so"] else ""))
            except Exception as exc:  # noqa: BLE001
                so_loi += 1
                ban_ghi.update({"loi": f"{type(exc).__name__}: {exc}",
                                "vet": traceback.format_exc()[-1200:]})
                print(f"LỖI {type(exc).__name__}: {str(exc)[:160]}")
                if not args.bo_qua_loi:
                    f.write(json.dumps(ban_ghi, ensure_ascii=False) + "\n")
                    f.flush()
                    print("\nDừng ở lỗi đầu tiên. Chạy lại với --bo-qua-loi để đi tiếp.", file=sys.stderr)
                    return 1
            f.write(json.dumps(ban_ghi, ensure_ascii=False) + "\n")
            f.flush()
            if i < len(viec):
                time.sleep(args.nghi)

    print(f"\nXong. Lỗi: {so_loi}. Kết quả thô: {tep_kq}")
    print("Dựng bảng so sánh: python3 scripts/bang-so-sanh-5-6.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
