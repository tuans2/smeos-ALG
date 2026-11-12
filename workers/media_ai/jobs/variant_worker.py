"""Worker M04b — biến thể marketing dựng trên Master Image đã duyệt.

Cùng khuôn với `workers/media_ai/jobs/worker.py` của M04a: lấy việc qua
`claim_next` (`SELECT … FOR UPDATE SKIP LOCKED`), `organization_id` CHỈ lấy
từ dòng job, không `subprocess`, không HTTP nội bộ.

Luồng một job:

    SEGMENTING   tách chủ thể khỏi nền Master Image
    COMPOSING    ghép bối cảnh + đóng dấu thương hiệu của tiệm
    VERIFYING    ĐO lõi chủ thể so với Master  → cổng Subject Integrity
    GENERATING_OUTPUTS  ghi asset (chỉ khi KHÔNG bị từ chối)

Ba điều đã chặn bằng cấu trúc:

1. **M04b không sinh pixel mới trên bó hoa.** Chủ thể được sao chép nguyên
   khối từ Master Image; chỉ hậu cảnh là mới. Vì vậy "có giữ nguyên không"
   là một phép ĐO, và `_do_lo_chu_the` là phép đo đó. Bản trước hiển thị
   100 / 99 / 98 — ba hằng số gõ tay trong mã giao diện.

2. **Đo trên LÕI, không trên toàn chủ thể.** Viền được làm mềm có chủ đích
   (alpha feathering, light wrap) nên viền LUÔN đổi; tính cả viền vào phép
   đo là biến một bước cố ý thành một báo động giả mỗi lượt. Mặt nạ được co
   biên trước khi so.

3. **Bị từ chối thì KHÔNG ghi asset**, đúng như M04a: không có dòng `assets`
   nào thì không có đường nào để ảnh đó lọt ra qua endpoint tải về.

Worker KHÔNG ghi `usage` (`YC-U4`) — credit trừ ở phía TS lúc tạo job.

**Chi phí thật (nợ #71).** Toàn bộ pipeline (`RembgSegmenter`,
`EdgeDefringer`, `StudioBackdropEngine`) là cục bộ, không gọi nhà cung cấp
trả phí nào — `ai_requests` vẫn ghi một dòng (`AIC-17`) cho mỗi job để có độ
trễ và số lần chạy theo tổ chức, với `cost_usd`/token để `None` (không đo
được là chuyện khác hẳn với đo được và bằng 0).
"""

from __future__ import annotations

import json
import logging
import os
import random
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FuturesTimeoutError
from io import BytesIO
from pathlib import Path
from typing import Any, Callable

import numpy as np
import psycopg
from PIL import Image
from psycopg.rows import dict_row

from shared.job_failure import ghi_job_loi
from shared.storage import doc_bytes, ghi_bytes
from media_ai.image.auto_retouch import tu_dong_can_bang_sang
from media_ai.image.brand_watermark import dong_dau
from media_ai.image.cham_tham_my import cham_ky_thuat
from media_ai.image.composition import tinh_bo_cuc
from media_ai.image.mo_mep_cat import lam_mo_mep_cat
from media_ai.image.defringe import EdgeDefringer
from media_ai.image.ratio_frame import RATIO_PRESETS, dong_khung, kich_thuoc_xuat
from media_ai.image.studio_backdrop import StudioBackdropEngine
from media_ai.providers.background.base import (
    CACH_GHEP,
    CHAT_LUONG,
    HUONG_SANG,
    PHONG_CACH,
    TANG_NET,
    BackgroundRequest,
)
from media_ai.providers.background.stability_background import (
    BackgroundProviderError,
    resolve_background_provider,
)
from media_ai.providers.chung import ghi_ai_request, so_do_chi_phi_luot
from media_ai.providers.expansion.router import resolve_expander
from media_ai.jobs.variant_nha_cung_cap import TatCaNhaCungCapLoi, dung_bien_the_nha_cung_cap
from media_ai.providers.scene.registry import thu_tu_nha_cung_cap
from media_ai.providers.segmentation.mo_hinh import giay_phep, mo_hinh_tach_nen
from media_ai.providers.segmentation.rembg_segmenter import RembgSegmenter
from media_ai.providers.upscale.nen import tang_net_nen

log = logging.getLogger("media_ai.jobs.variant_worker")

FEATURE = "media.variant"
# Nhánh Cloud (23/09/2026): cùng pipeline, chỉ khác nguồn HẬU CẢNH — nhà cung
# cấp vẽ không gian trống, chủ thể vẫn dán nguyên khối từ Master Image. Tách
# `feature` riêng để bảng giá (`pricing.ts`) tính khác nhánh local 0đ.
CLOUD_FEATURE = "media.variant.cloud"
# m04b-2 / m04b-cloud-2 (24/09/2026): khung đúng tỉ lệ đích + bố cục + bóng theo
# hướng sáng (`fill_mode=full_frame`). Job `fill_mode=pad` vẫn ra ảnh như bản 1.
PIPELINE_VERSION = "m04b-2"
CLOUD_PIPELINE_VERSION = "m04b-cloud-2"

REPO_ROOT = Path(__file__).resolve().parents[3]
STORAGE_ROOT = REPO_ROOT / "var" / "storage"

# Ngưỡng alpha tính hộp BỐ CỤC của bó hoa (khung full_frame, 24/09/2026).
NGUONG_HOP_BO_CUC = 32

# Cache tách chủ thể cho một lượt chạy lô nhiều biến thể (nợ #108, AIC-17 mở
# rộng "30 mẫu khác nhau từ ảnh gốc"). Xem docstring `_doan_chu_the`.
SEGMENTATION_CACHE_ROOT = STORAGE_ROOT / "cache" / "m04b_segmentation"

# Cùng ngưỡng với `src/modules/media/domain/variant-rules.ts`. Phía TS tính
# LẠI phán quyết từ số đo, nên hai bên lệch nhau thì phía TS thắng — ở đây
# chỉ dùng để quyết định có ghi asset hay không.
# Mặc định 0.99 (production). Đặt `VARIANT_INTEGRITY_THRESHOLD=0.95` trong
# `.env` khi dùng model tách chủ thể nhẹ (`u2netp`) trên máy dev — biên tách
# kém sắc khiến `_do_lo_chu_the` trả số thấp hơn ngưỡng production, gây
# REJECTED giả. Xem `.env.example` và nợ #109.
NGUONG_TU_CHOI = float(os.environ.get("VARIANT_INTEGRITY_THRESHOLD", "0.99"))

# `RATIO_PRESETS` giờ SỐNG ở `media_ai/image/ratio_frame.py` (nợ #78, 17/09)
# — nhập lại ở đây để giữ nguyên tên cũ, vì `tests/media_ai/test_variant_worker.py`
# import trực tiếp `RATIO_PRESETS` từ module này.

PRESET_SANG_STUDIO_STYLE: dict[str, str] = {
    "transparent": "transparent",
    "studio_white": "clean_white",
    "wedding": "boutique_bokeh",
    "living_room": "soft_ambient",
    "wood_minimal": "wood_warm",
    "luxury_hotel": "warm_gray",
}

NHAN_PRESET: dict[str, str] = {
    "transparent": "Tách nền trong suốt (PNG)",
    "studio_white": "Studio trắng tinh khôi",
    "wedding": "Bàn tiệc cưới lãng mạn",
    "living_room": "Phòng khách thanh lịch",
    "wood_minimal": "Gỗ tối giản Bắc Âu",
    "luxury_hotel": "Sảnh khách sạn 5 sao",
}


# ─── Hạ tầng dùng chung với worker M04a ────────────────────────────────────


def _emit_event(conn: psycopg.Connection, job_id: str, event: str, payload: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO job_events (id, job_id, organization_id, seq, event, payload, created_at)
            VALUES (gen_random_uuid(), %(job_id)s,
                    (SELECT organization_id FROM generation_jobs WHERE id = %(job_id)s),
                    COALESCE((SELECT MAX(seq) FROM job_events WHERE job_id = %(job_id)s), 0) + 1,
                    %(event)s, %(payload)s, now())
            """,
            {"job_id": job_id, "event": event, "payload": json.dumps(payload)},
        )
    conn.commit()


def _set_stage(conn: psycopg.Connection, job_id: str, stage: str) -> None:
    with conn.cursor() as cur:
        cur.execute("UPDATE generation_jobs SET stage = %s WHERE id = %s", (stage, job_id))
    conn.commit()
    _emit_event(conn, job_id, "stage", {"stage": stage})


def _doc_asset(conn: psycopg.Connection, organization_id: str, asset_id: str) -> dict[str, Any]:
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            SELECT id, product_id, storage_key, mime_type, version, kind, approval_state
              FROM assets
             WHERE id = %s AND organization_id = %s
            """,
            (asset_id, organization_id),
        )
        row = cur.fetchone()
        if row is None:
            raise LookupError(f"asset {asset_id} không thuộc tổ chức {organization_id}")
        return row


def _doc_thuong_hieu(
    conn: psycopg.Connection, organization_id: str
) -> tuple[bytes | None, str | None]:
    """Logo thật của tiệm và tên tiệm. Cả hai đều có thể vắng."""
    ten_tiem: str | None = None
    logo_bytes: bytes | None = None

    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute("SELECT name FROM organizations WHERE id = %s", (organization_id,))
        row = cur.fetchone()
        if row:
            ten_tiem = row["name"]

        cur.execute(
            "SELECT logo_asset_id FROM brand_profiles WHERE organization_id = %s",
            (organization_id,),
        )
        ho_so = cur.fetchone()

    if ho_so and ho_so["logo_asset_id"]:
        try:
            logo_asset = _doc_asset(conn, organization_id, ho_so["logo_asset_id"])
            logo_bytes = doc_bytes(logo_asset["storage_key"], STORAGE_ROOT)
        except Exception:
            # Logo khai trong hồ sơ nhưng không đọc được: lùi về chữ, không
            # làm hỏng cả job vì một tệp thiếu.
            logo_bytes = None

    return logo_bytes, ten_tiem


# ─── Phép đo của cổng Subject Integrity ────────────────────────────────────


# Co mặt nạ SÂU HƠN vùng viền mà `StudioBackdropEngine` cố ý đổi (light wrap
# `LIGHT_WRAP_DEPTH_PX` + 1px làm mềm alpha). Sửa 23/09/2026: trước đó co 3px
# < light wrap 4px ⇒ biến thể local hợp lệ luôn đo ~0,96 và bị coi là dưới
# ngưỡng — đó là lý do nhánh "vẫn ghi asset khi dưới ngưỡng" từng được thêm.
DO_SAU_CO_BIEN = StudioBackdropEngine.LIGHT_WRAP_DEPTH_PX + 1


def _co_bien(alpha: Image.Image, buoc: int = DO_SAU_CO_BIEN) -> np.ndarray:
    """Co mặt nạ vào trong `buoc` điểm ảnh, bằng min-filter lặp.

    Dùng `ImageFilter.MinFilter` thay vì OpenCV: bước này phải chạy được cả
    trên máy chưa cài `cv2`, vì nó là cổng an toàn chứ không phải một tính
    năng phụ có thể bỏ qua.
    """
    from PIL import ImageFilter

    m = alpha
    for _ in range(buoc):
        m = m.filter(ImageFilter.MinFilter(3))
    return np.array(m) >= 250


def _mat_na_iopaint(alpha: Image.Image) -> bytes:
    """Dựng `product_mask` cho `ImageExpander.expand()` (AIC-13, nợ #104 —
    tích hợp IOPaint) từ CHÍNH kênh alpha đã có sẵn của `RembgSegmenter`,
    KHÔNG chạy thêm một lượt segmentation nào (thiết kế tích hợp, mục 2).

    Giá trị 0 (đen) = vùng LÕI đã co-biên (`_co_bien`, cùng hàm dùng để đo
    Subject Integrity) — giữ nguyên. 255 (trắng) = phần còn lại của canvas
    — được phép sinh mới. Dùng đúng vùng lõi đã co-biên chứ không phải toàn
    bộ alpha: viền mềm (feathering) được phép engine vẽ đè, vì bước dán lại
    chính xác (`_dan_lai_chu_the`, gọi ngay sau `expand()`) phủ lại đúng
    nguyên khối `rgba` bất kể engine sinh gì ở viền.

    Lưu ý (nợ #104, xem `iopaint_outpainter.py`): với `IOPaintExpander`,
    mask này KHÔNG được IOPaint server dùng khi `use_extender=true` (đã xác
    minh qua mã nguồn thật) — bảo vệ thật sự đến từ `_dan_lai_chu_the`.
    Tham số vẫn được xây và truyền để khớp đặc tả `ImageExpander`/
    `ImageProvider.edit(mask, protectMask)`, và để sẵn sàng cho một hiện
    thực khác (không dùng `use_extender`) có đọc mask thật.
    """
    loi = _co_bien(alpha)
    mat_na = np.where(loi, 0, 255).astype(np.uint8)
    anh_mat_na = Image.fromarray(mat_na, mode="L")
    buf = BytesIO()
    anh_mat_na.save(buf, format="PNG")
    return buf.getvalue()


def _dan_lai_chu_the(
    anh_nen: Image.Image, rgba_chu_the: Image.Image, offset: tuple[int, int]
) -> Image.Image:
    """Dán lại NGUYÊN KHỐI `rgba_chu_the` (đã cắt từ Master, có alpha) lên
    `anh_nen` (ảnh engine mở-rộng-khung vừa trả về, canvas đã lớn hơn) —
    belt-and-suspenders (thiết kế tích hợp IOPaint, mục 3): dù cơ chế giữ-
    nguyên của engine đã được xác minh ở mức nào, không tin riêng nó — luôn
    dán đè lại bằng chính khối gốc TRƯỚC khi đóng khung, để `_do_lo_chu_the`
    sau đó luôn đo trên đúng pixel gốc, không phải pixel do model sinh lại.

    `offset` đến từ chính `parameters["paste_offset"]` mà engine trả về
    (vd. `IOPaintExpander`) — không đoán vị trí ở đây."""
    ket_qua = anh_nen.convert("RGBA")
    ket_qua.alpha_composite(rgba_chu_the, dest=offset)
    return ket_qua


def _do_lo_chu_the(
    master_rgb: Image.Image,
    ket_qua_rgba: Image.Image,
    alpha: Image.Image,
) -> float:
    """Tỷ lệ điểm ảnh LÕI chủ thể còn trùng khít với Master Image.

    Trả `1.0` khi lõi không đổi một điểm nào. Trả `0.0` khi không còn lõi để
    đo — không có lõi nghĩa là mặt nạ hỏng, và mặt nạ hỏng phải là từ chối
    chứ không phải một điểm số đẹp.
    """
    if ket_qua_rgba.size != master_rgb.size:
        ket_qua_rgba = ket_qua_rgba.resize(master_rgb.size, Image.LANCZOS)
    if alpha.size != master_rgb.size:
        alpha = alpha.resize(master_rgb.size, Image.LANCZOS)

    loi = _co_bien(alpha)
    tong = int(loi.sum())
    if tong == 0:
        return 0.0
    # Lõi đo phải phủ phần lớn sản phẩm (24/09/2026): trước đây lõi chỉ là
    # ~12% đầu hoa nên cổng báo 100% trong khi phần còn lại bị tô đè. Lõi quá
    # nhỏ nghĩa là KHÔNG kiểm được — trả chính tỷ lệ phủ để cổng từ chối.
    #
    # Mẫu số là phần thân ĐO ĐƯỢC (Đợt 3, 25/09/2026): thân (alpha ≥ 128) co
    # vào đúng độ sâu mà lõi đo không bao giờ phủ tới (dải viền mềm
    # `DAI_VIEN_MEM_PX` + co biên `DO_SAU_CO_BIEN`). Trước đó mẫu số là toàn bộ
    # thân, nên sản phẩm nhiều chi tiết mảnh (cành bạch đàn, baby, cuống — hẹp
    # hơn ~18 px) bị tính là "không kiểm được": giỏ GHCB0001 tách bằng
    # isnet-general-use đo 0,517 dù lõi trùng khít 100% và lõi phủ HẾT phần
    # thân đo được. Ca 24/09 (thân bán trong suốt, lõi ~12%) vẫn bị bắt: thân
    # co vào vẫn lớn, lõi vẫn nhỏ.
    than_anh = Image.fromarray(
        ((np.array(alpha.convert("L")) >= NGUONG_THAN_SAN_PHAM) * 255).astype(np.uint8), mode="L"
    )
    than = int((_co_bien(than_anh, DAI_VIEN_MEM_PX + DO_SAU_CO_BIEN)).sum())
    if than > 0 and tong / than < TY_LE_PHU_LOI_TOI_THIEU:
        return float(tong / than)

    a = np.array(master_rgb.convert("RGB"), dtype=np.int16)
    b = np.array(ket_qua_rgba.convert("RGB"), dtype=np.int16)
    # Sai khác 0 tuyệt đối là chuẩn: lõi được dán nguyên khối, không qua bộ
    # lọc nào. Nới thành "gần đúng" ở đây là tự bịt mắt trước đúng loại lỗi
    # mà cổng này sinh ra để bắt.
    trung = (np.abs(a - b).max(axis=2) == 0) & loi
    return float(int(trung.sum()) / tong)


# ─── Tách chủ thể (dùng chung cho cả lô, nợ #108) ──────────────────────────


def _duong_dan_cache_chu_the(
    cache_dir: Path, master_asset_id: str, model: str | None = None
) -> tuple[Path, Path]:
    """Khoá cache gồm cả TÊN MÔ HÌNH tách nền (Đợt 3, 25/09/2026): đổi mô hình
    mặc định thì mặt nạ cũ của mô hình khác không được dùng lại."""
    an_toan = "".join(k if k.isalnum() or k in "-_" else "_" for k in master_asset_id)
    duoi = "" if not model else "_" + "".join(k if k.isalnum() or k in "-_" else "_" for k in model)
    return cache_dir / f"{an_toan}{duoi}_rgba.png", cache_dir / f"{an_toan}{duoi}_alpha.png"


# Ngưỡng "lõi đặc" — trùng ngưỡng `_co_bien` dùng để xác định lõi khi đo.
NGUONG_LOI_DAC = 250
# Điểm có alpha ≥ ngưỡng này là THÂN sản phẩm (mô hình tách nền chỉ "không chắc").
NGUONG_THAN_SAN_PHAM = 128
# Dải viền ngoài giữ alpha mềm để khử răng cưa; bên trong dải là thân đặc.
DAI_VIEN_MEM_PX = 4
# Lõi đo phải phủ ít nhất tỷ lệ này của thân sản phẩm, không thì cổng từ chối.
TY_LE_PHU_LOI_TOI_THIEU = 0.6


def _lam_dac_chu_the(
    master_rgb: Image.Image, rgba: Image.Image, alpha: Image.Image
) -> tuple[Image.Image, Image.Image]:
    """Dựng lại chủ thể: thân sản phẩm ĐẶC và mang ĐÚNG điểm ảnh gốc (24/09/2026).

    Đo trên ảnh giỏ hoa thật: `bria-rmbg` trả ~75% đầu hoa ở alpha 128–244 và
    lõi ≈ 254 (hầu như không có 255). Hệ quả trước bản sửa:
      - `EdgeDefringer` coi mọi điểm alpha < 245 là "viền" và tô đè màu lên gần
        hết đầu hoa → các mảng màu nhoè, mất cánh hoa;
      - khi ghép, thân hoa bán trong suốt nên phông lọt qua → ảnh bị xoá nhoà;
      - cổng Subject Integrity chỉ đo vùng alpha ≥ 250 (~12% đầu hoa) nên vẫn
        báo 100% trong khi sản phẩm đã hỏng.

    Nay: điểm alpha ≥ 128 là thân sản phẩm; co vào `DAI_VIEN_MEM_PX` để lấy
    phần trong → alpha 255 và điểm ảnh lấy NGUYÊN từ Master. Chỉ dải viền
    ngoài giữ alpha mềm và màu đã khử viền. Lõi đo của cổng (co thêm 5px từ
    alpha ≥ 250) vì thế phủ gần toàn bộ sản phẩm thay vì một phần nhỏ.
    """
    from PIL import ImageFilter

    a = np.array(alpha.convert("L"))
    than = Image.fromarray(((a >= NGUONG_THAN_SAN_PHAM) * 255).astype(np.uint8), mode="L")
    for _ in range(DAI_VIEN_MEM_PX):
        than = than.filter(ImageFilter.MinFilter(3))
    trong = np.array(than) == 255

    a_moi = np.where(trong | (a >= NGUONG_LOI_DAC), 255, a).astype(np.uint8)
    goc = np.array(master_rgb.convert("RGB"))
    if goc.shape[:2] != a.shape:
        # Hình dạng lạ (không nên xảy ra) — giữ bản đã tách, chỉ chốt alpha.
        arr = np.array(rgba.convert("RGBA"))
        arr[:, :, 3] = a_moi
        return Image.fromarray(arr, mode="RGBA"), Image.fromarray(a_moi, mode="L")
    # Khử viền lại từ ẢNH GỐC (bỏ màu trong cache — cache cũ bị tô đè cả thân
    # hoa), chỉ trong dải sát nền; thân đặc lấy nguyên điểm ảnh Master.
    tho = Image.fromarray(np.dstack((goc, a_moi)), mode="RGBA")
    arr = np.array(EdgeDefringer(inpaint_radius=3, solid_threshold=245).defringe(tho))
    arr[trong, :3] = goc[trong]
    arr[:, :, 3] = a_moi
    return Image.fromarray(arr, mode="RGBA"), Image.fromarray(a_moi, mode="L")


def _doan_chu_the(
    master_rgb: Image.Image,
    master_asset_id: str | None,
    cache_dir: Path | None,
) -> tuple[Image.Image, Image.Image]:
    """Tách chủ thể (có cache) rồi làm đặc thân sản phẩm — xem `_lam_dac_chu_the`."""
    rgba, alpha = _doan_chu_the_tho(master_rgb, master_asset_id, cache_dir)
    return _lam_dac_chu_the(master_rgb, rgba, alpha)


def _doan_chu_the_tho(
    master_rgb: Image.Image,
    master_asset_id: str | None,
    cache_dir: Path | None,
) -> tuple[Image.Image, Image.Image]:
    """Tách chủ thể khỏi nền (`RembgSegmenter` + `EdgeDefringer`).

    Bước này KHÔNG phụ thuộc `preset`/`ratio` — chỉ phụ thuộc chính Master
    Image — nhưng trước nợ #108 mỗi job (mỗi tổ hợp preset×ratio) tự chạy
    lại nó một lần. Một lượt chạy lô 24 tổ hợp trên CÙNG một Master Image
    (`request-variants.ts#requestVariantBatch`) vì vậy tách chủ thể tới 24
    lần cho một kết quả giống hệt nhau — đây là bước tốn thời gian nhất
    trong `dung_bien_the` (model segmentation).

    Cache theo ĐĨA, khoá bằng `master_asset_id`, KHÔNG theo bộ nhớ tiến
    trình: job trong một lô chạy trên `claim_next` (`SELECT … FOR UPDATE
    SKIP LOCKED`) nên có thể rơi vào các tiến trình worker khác nhau — cache
    trong bộ nhớ một tiến trình không chắc job thứ hai của cùng lô gặp lại.

    `master_asset_id=None` HOẶC `cache_dir=None` tắt cache hoàn toàn, trả về
    y hệt hành vi trước nợ #108 — dùng trong các ca thử hiện có
    (`test_variant_worker.py`) gọi `dung_bien_the` không kèm hai tham số
    này.
    """
    # Mặc định theo bảng giấy phép (Đợt 3, 25/09/2026) — `bria-rmbg` cũ là phi
    # thương mại, xem `providers/segmentation/mo_hinh.py`. `.env` vẫn đè được.
    model_ten = mo_hinh_tach_nen()
    if master_asset_id and cache_dir is not None:
        duong_rgba, duong_alpha = _duong_dan_cache_chu_the(cache_dir, master_asset_id, model_ten)
        if duong_rgba.exists() and duong_alpha.exists():
            rgba = Image.open(duong_rgba)
            rgba.load()
            alpha = Image.open(duong_alpha)
            alpha.load()
            return rgba, alpha

    # nợ #109 (18/09): cho phép đổi sang model nhẹ hơn (vd `u2netp`) khi phát
    # triển cục bộ để không phải chờ `bria-rmbg` (~1GB, chính xác hơn nhưng
    # chậm hơn nhiều trên CPU) mỗi lần đổi ảnh gốc. Mặc định GIỮ NGUYÊN
    # `bria-rmbg` — không đổi hành vi/chất lượng khi không đặt biến môi trường.


    def _tach_va_khu_vien() -> tuple[Image.Image, Image.Image]:
        rgba_kq, alpha_kq = RembgSegmenter(model_name=model_ten).extract_subject(master_rgb)
        rgba_kq = EdgeDefringer(inpaint_radius=3, solid_threshold=245).defringe(rgba_kq)
        return rgba_kq, alpha_kq

    # nợ #112 (18/09): worker CHỈ MỘT tiến trình (nợ #109) — nếu bước tách
    # chủ thể treo (rembg/onnxruntime kẹt, máy quá tải bởi 5-6 tiến trình
    # `dev:all` chạy song song, …), trước đây job đứng PROCESSING VÔ THỜI
    # HẠN và chặn đứng MỌI job M04b phía sau, không có cách nào tự phục
    # hồi ngoài việc người dùng tự nhận ra và khởi động lại thủ công. Bọc
    # bằng một luồng riêng có hạn giờ: quá hạn thì coi là lỗi kỹ thuật,
    # job này bị đánh FAILED (nhánh `except Exception` sẵn có của
    # `process_variant_job`), nhường chỗ cho job kế tiếp trong hàng đợi.
    # LƯU Ý THẬT: Python không thể buộc dừng một luồng đang chạy — nếu bước
    # tách chủ thể thật sự bị treo (không phải chỉ chậm), luồng đó vẫn tiếp
    # tục chiếm CPU/bộ nhớ ngầm sau khi job bị đánh FAILED, tới khi tự xong
    # hoặc tiến trình worker được khởi động lại — đây là giới hạn của cách
    # tiếp cận này, không phải một lần dừng sạch sẽ thật sự.
    timeout_giay = float(os.environ.get("VARIANT_SEGMENTATION_TIMEOUT_SECONDS", "90"))
    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(_tach_va_khu_vien)
        try:
            rgba, alpha = future.result(timeout=timeout_giay)
        except FuturesTimeoutError as exc:
            raise TimeoutError(
                f"Tách chủ thể (model={model_ten}) vượt quá {timeout_giay:.0f} giây "
                "— máy có thể đang quá tải hoặc rembg/onnxruntime bị kẹt "
                "(xem docs/dac-ta/TECHNICAL_DEBT.md, nợ #112)"
            ) from exc

    if master_asset_id and cache_dir is not None:
        cache_dir.mkdir(parents=True, exist_ok=True)
        duong_rgba, duong_alpha = _duong_dan_cache_chu_the(cache_dir, master_asset_id, model_ten)
        rgba.save(duong_rgba, format="PNG")
        alpha.save(duong_alpha, format="PNG")

    return rgba, alpha


def _ap_dung_auto_enhance(anh_boi_canh: Image.Image, rgba_chu_the: Image.Image) -> Image.Image:
    """AIC-14 — cân bằng sáng/tương phản tự động, CHỈ ở vùng nền (chốt
    18/09, AskUserQuestion: "Chỉ chỉnh phông nền").

    `tu_dong_can_bang_sang` chạy trên TOÀN khung `anh_boi_canh` (nền đã ghép
    bối cảnh + chủ thể, cùng kích thước với `rgba_chu_the`, `composite()`
    không đổi khung) — không tự nó biết chủ thể ở đâu. An toàn đến từ bước
    NGAY SAU: dán lại NGUYÊN KHỐI `rgba_chu_the` GỐC (chưa qua bước cân
    bằng sáng) đè lên, offset `(0, 0)` — cùng nguyên tắc belt-and-suspenders
    với `_dan_lai_chu_the` (AIC-13): bất kể `tu_dong_can_bang_sang` làm gì
    lên vùng chủ thể, kết quả cuối luôn là pixel GỐC ở đó.

    Đánh đổi có chủ đích: viền đã làm mềm/light-wrap của `composite()` (alpha
    feathering, quang sáng tràn viền) bị THAY bằng viền thô của
    `rgba_chu_the` cho riêng lượt bật `auto_enhance` này — ưu tiên an toàn
    (không đổi pixel bó hoa) hơn giữ độ mượt viền; giữ cả hai cùng lúc là
    việc của một đợt sau (xem `TECHNICAL_DEBT.md`).

    Trả về ảnh RGB (bỏ alpha), khớp mode `anh_boi_canh` truyền vào — giữ
    nguyên hành vi định dạng tệp ở `_sang_bytes` (PNG chỉ khi còn alpha).
    """
    nang_sang = tu_dong_can_bang_sang(anh_boi_canh.convert("RGB")).convert("RGBA")
    da_dan = _dan_lai_chu_the(nang_sang, rgba_chu_the, (0, 0))
    return da_dan.convert("RGB")


# ─── Dựng ảnh ──────────────────────────────────────────────────────────────


def _dong_khung(anh: Image.Image, ratio: str) -> Image.Image:
    """Uỷ quyền cho `media_ai.image.ratio_frame.dong_khung` (nợ #78,
    17/09). Giữ tên cũ vì `tests/media_ai/test_variant_worker.py` import
    trực tiếp `_dong_khung` — hành vi giữ y hệt, chỉ đổi chỗ hiện thực."""
    return dong_khung(anh, ratio)


def _anh_thanh_png_bytes(anh: Image.Image) -> bytes:
    """PNG luôn — kể cả ảnh không có alpha — vì đây chỉ là dạng trung gian
    gửi cho `ImageExpander` (`AIC-13`), không phải bytes lưu kho (đó là
    việc của `_sang_bytes`, giữ JPEG cho ảnh không alpha để nhẹ kho)."""
    buf = BytesIO()
    anh.save(buf, format="PNG")
    return buf.getvalue()


def _sang_bytes(anh: Image.Image) -> tuple[bytes, str, str]:
    """Trả (bytes, mime, đuôi). PNG khi còn kênh alpha, JPEG khi không."""
    buf = BytesIO()
    if anh.mode == "RGBA":
        anh.save(buf, format="PNG")
        return buf.getvalue(), "image/png", "png"
    anh.convert("RGB").save(buf, format="JPEG", quality=92)
    return buf.getvalue(), "image/jpeg", "jpg"


def dung_bien_the(
    master_bytes: bytes,
    preset: str,
    ratio: str,
    watermark: bool,
    logo_bytes: bytes | None,
    ten_tiem: str | None,
    expand_provider: str | None = None,
    auto_enhance: bool = False,
    master_asset_id: str | None = None,
    cache_dir: Path | None = None,
    on_stage: Callable[[str], None] | None = None,
    hau_canh_bytes: bytes | None = None,
    fill_mode: str = "full_frame",
    composition: dict[str, Any] | None = None,
    lighting: dict[str, Any] | None = None,
    nguon_hau_canh: Callable[[str, int, int], Image.Image | None] | None = None,
    seed_phong: int | None = None,
    upscale: str = "none",
    compose_mode: str = "paste",
    mo_mep_cat: bool = True,
) -> tuple[list[dict[str, Any]], float, Any]:
    """Dựng danh sách biến thể, đo lõi chủ thể, và trả về bộ mở-rộng-khung
    (`ImageExpander`) đã dùng cho biến thể "styled" nếu có (`AIC-13`, nợ
    #78, 17/09) — `None` khi job không yêu cầu `expand_provider` khác mặc
    định `pad` (đóng khung màu đặc như trước, không đổi hành vi).

    `expand_provider` CHỈ áp dụng cho biến thể "styled" — đây là bản DUY
    NHẤT mà nội dung sinh thêm ở biên có ý nghĩa (đã là ảnh ghép bối cảnh
    bằng generative fill); bản "transparent" giữ nguyên alpha-pad (mở rộng
    một nền trong suốt không có nghĩa gì), và bản "branded" đóng khung lại
    từ chính nguồn của nó (có thể là bản đã ghép bối cảnh hoặc rgba gốc)
    độc lập — phạm vi hẹp này là quyết định có chủ đích, không phải thiếu
    sót, và để lại quyết định "mở rộng luôn ảnh hưởng thế nào tới bản đóng
    dấu" cho một đợt sau.

    Tách khỏi `process_variant_job` để chạy được trong test mà không cần
    Postgres — cùng lý do `optimization-rules.ts` không import Prisma.

    Nợ #104 (tiếp #78): khi `expand_provider` được dùng, `expand()` nay
    nhận thêm `product_mask` (dựng từ `alpha` sẵn có, `_mat_na_iopaint`) và
    kết quả được dán lại chính xác (`_dan_lai_chu_the`) TRƯỚC khi đóng
    khung — xem tài liệu "Tích hợp IOPaint Outpainting vào floraos-core".

    `auto_enhance` (AIC-14, chốt 18/09): bật cân bằng sáng/tương phản tự
    động cho bản "styled"/"branded", CHỈ ở vùng nền — xem
    `_ap_dung_auto_enhance`. Mặc định tắt, không đổi hành vi cũ.

    `master_asset_id`/`cache_dir` (nợ #108): khi CẢ HAI được truyền, bước
    tách chủ thể được cache theo đĩa để một lượt chạy lô nhiều tổ hợp
    preset×ratio trên CÙNG Master Image không tách lại 24 lần — xem
    `_doan_chu_the`. Mặc định `None` giữ nguyên hành vi cũ (luôn tách mới).

    `fill_mode` (Đợt 1 nâng cấp chất lượng, 24/09/2026 — PO chốt làm mặc định):
    `"full_frame"` dựng khung làm việc ĐÚNG tỉ lệ đích, đặt bó hoa theo
    `composition` (`shot` close/medium/wide, `placement` center/left_third/
    right_third) ở ĐÚNG độ phân giải gốc, ghép lên hậu cảnh cùng kích thước —
    không còn dải màu đệm. `"pad"` là hành vi cũ (ghép ở kích thước Master rồi
    đệm), giữ để tương thích. `lighting.direction` (left/right/above/front)
    quyết định hướng bóng đổ. `nguon_hau_canh(ratio, rong, cao)` trả hậu cảnh
    cho khung làm việc (nhánh Cloud) hoặc `None` để dùng phông cục bộ — gọi SAU
    khi đã biết kích thước khung, nên nhà cung cấp vẽ đúng tỉ lệ đích.
    Mỗi mục "styled" trả thêm `subject_box` (x, y, rộng, cao trong khung cuối).

    `seed_phong` (Đợt 2, 25/09/2026): seed của phông CỤC BỘ (vùng sáng, bố cục
    bokeh) — phương án cục bộ khác nhau thật và tái tạo được. Không dùng khi
    hậu cảnh do nhà cung cấp sinh (seed đó thuộc nhà cung cấp).

    Đợt 3 (25/09/2026), chỉ ở `full_frame`:
      - `upscale="2x"`: khung xuất gấp đôi (9:16 → 2160×3840); HẬU CẢNH nhỏ hơn
        khung được tăng nét (`providers/upscale/nen.py`) — bó hoa KHÔNG qua mô
        hình siêu phân giải, chỉ nội suy như trước;
      - `compose_mode="harmonize"`: màu bóng theo hậu cảnh, khớp độ nét hậu
        cảnh, light wrap mạnh hơn trong dải viền — `image/hoa_hop.py`;
      - `mo_mep_cat` (mặc định bật): phần hẹp của chủ thể bị mép ảnh gốc cắt
        ngang (cẳng tay, cuống) mờ dần thay vì cắt thẳng — `image/mo_mep_cat.py`.
        Bản "transparent" giữ nguyên tách nền gốc.
    Mục "styled" trả thêm `aesthetic` (chấm kỹ thuật, `image/cham_tham_my.py`).

    `on_stage` (nợ #110, 18/09): callback tuỳ chọn gọi ĐÚNG lúc chuyển từ
    bước tách chủ thể sang bước ghép bối cảnh — trước đây `process_variant_job`
    tự ghi `stage="COMPOSING"` vào DB TRƯỚC KHI gọi hàm này, nên nhãn hiển thị
    cho người dùng sai lệch với việc đang thật sự chạy (tách chủ thể, bước nặng
    nhất, lại chạy dưới nhãn "Ghép bối cảnh & đóng dấu"). Mặc định `None` —
    không đổi hành vi cho mọi lời gọi cũ (kể cả toàn bộ `test_variant_worker.py`).
    """
    master_rgb = Image.open(BytesIO(master_bytes)).convert("RGB")

    rgba, alpha = _doan_chu_the(master_rgb, master_asset_id, cache_dir)

    if on_stage is not None:
        on_stage("COMPOSING")

    engine = StudioBackdropEngine()
    style = PRESET_SANG_STUDIO_STYLE.get(preset, "warm_gray")

    bien_the: list[dict[str, Any]] = []

    # 1. Tách nền trong suốt — luôn có. Đây là bản mà người bán đem đi ghép
    #    vào bất cứ đâu, nên nó không bao giờ bị watermark che.
    bien_the.append(
        {
            "key": "transparent",
            "title": "Tách nền trong suốt (PNG)",
            "background": "Trong suốt (Alpha)",
            "image": _dong_khung(rgba, ratio),
            "watermark": False,
            "generative_fill_used": False,
        }
    )

    # 2. Bối cảnh đã chọn. Bỏ qua khi người dùng chọn chính "trong suốt" —
    #    dựng hai bản giống hệt nhau chỉ để đủ số lượng là làm phiền người xem.
    anh_boi_canh: Image.Image | None = None
    expander_dung: Any = None
    de_do_can_chinh: Image.Image | None = None
    huong_sang = str((lighting or {}).get("direction") or "left")
    if huong_sang not in HUONG_SANG:
        huong_sang = "left"
    alpha_do = alpha  # alpha dùng để ĐO Subject Integrity (đổi khi làm mờ mép cắt)
    if style != "transparent" and fill_mode != "pad":
        he_so_xuat = 2 if upscale == "2x" else 1
        rgba_ghep, alpha_ghep, mo_mep = rgba, alpha, None
        if mo_mep_cat:
            rgba_ghep, alpha_ghep, mo_mep = lam_mo_mep_cat(rgba, alpha)
            if not mo_mep.mep:
                mo_mep = None
            else:
                # Đo trên alpha đã làm mờ, bỏ hẳn vùng cẳng tay cố ý làm mờ khỏi
                # phép đo (không phải sản phẩm) — phần còn lại vẫn phải trùng khít.
                a_do = np.array(alpha_ghep)
                if mo_mep.vung_mo is not None:
                    a_do[mo_mep.vung_mo] = 0
                alpha_do = Image.fromarray(a_do, mode="L")
        # ── Khung đúng tỉ lệ đích (Đợt 1) ─────────────────────────────────
        # Hộp bố cục theo THÂN RÕ của bó hoa (alpha > NGUONG_HOP_BO_CUC): mô
        # hình tách nền để lại quầng mờ lác đác (đo 24/09: alpha>0 cao 787px,
        # alpha>32 cao 459px trên cùng một ảnh) — tính cả quầng thì bó hoa bị
        # hiểu sai kích thước và đặt lệch. Ảnh tách nền vẫn dán NGUYÊN VẸN.
        hop = (
            alpha_ghep.point(lambda p: 255 if p > NGUONG_HOP_BO_CUC else 0).getbbox()
            or alpha_ghep.point(lambda p: 255 if p > 0 else 0).getbbox()
            or (0, 0, rgba.width, rgba.height)
        )
        bx, by, bx2, by2 = hop
        rong_ct, cao_ct = bx2 - bx, by2 - by
        bc = tinh_bo_cuc(
            rong_ct, cao_ct, ratio,
            shot=(composition or {}).get("shot"),
            placement=(composition or {}).get("placement"),
            cao_xuat=kich_thuoc_xuat(ratio, he_so_xuat)[1],
        )
        khung_lam_viec = Image.new("RGBA", (bc.rong, bc.cao), (0, 0, 0, 0))
        # Dán TOÀN BỘ ảnh tách nền với độ lệch sao cho hộp bố cục rơi đúng
        # (bc.x, bc.y); paste KHÔNG mặt nạ = sao chép nguyên giá trị RGBA.
        # Phần quầng mờ lọt ra ngoài khung bị cắt — không đụng lõi bó hoa.
        khung_lam_viec.paste(rgba_ghep, (bc.x - bx, bc.y - by))

        anh_hau_canh = nguon_hau_canh(ratio, bc.rong, bc.cao) if nguon_hau_canh is not None else None
        if anh_hau_canh is None and hau_canh_bytes is not None:
            anh_hau_canh = Image.open(BytesIO(hau_canh_bytes))
            anh_hau_canh.load()
        thong_tin_tang_net: dict[str, Any] | None = None
        if upscale == "2x":
            thong_tin_tang_net = {"factor": 2, "subject_engine": "lanczos", "background_engine": None}
            if anh_hau_canh is not None and (anh_hau_canh.width < bc.rong or anh_hau_canh.height < bc.cao):
                anh_hau_canh, cach = tang_net_nen(anh_hau_canh, 2)
                thong_tin_tang_net["background_engine"] = cach
        hoa_hop = compose_mode == "harmonize"
        anh_boi_canh = engine.composite(
            khung_lam_viec,
            style=style,
            with_shadow=True,
            with_light_wrap=True,
            backdrop_image=anh_hau_canh,
            light_direction=huong_sang,
            seed=seed_phong if anh_hau_canh is None else None,
            harmonize=hoa_hop,
        )
        if auto_enhance:
            anh_boi_canh = _ap_dung_auto_enhance(anh_boi_canh, khung_lam_viec)
        if expand_provider and expand_provider.strip().lower() != "pad":
            log.info("fill_mode=full_frame: bỏ qua expand_provider=%s (khung đã đúng tỉ lệ, không cần mở rộng)", expand_provider)

        # Đo Subject Integrity trên vùng căn đúng toạ độ Master — bó hoa ở
        # (bc.x, bc.y) trong khung làm việc tương ứng (bx, by) ở ảnh gốc.
        lech_x, lech_y = bc.x - bx, bc.y - by
        de_do_can_chinh = anh_boi_canh.crop(
            (lech_x, lech_y, lech_x + master_rgb.width, lech_y + master_rgb.height)
        )

        anh_styled = dong_khung(anh_boi_canh, ratio, he_so_xuat)  # cùng tỉ lệ → chỉ co giãn, không đệm
        he_so = anh_styled.height / bc.cao
        try:
            tham_my = cham_ky_thuat(anh_styled, khung_lam_viec.split()[3])
        except Exception:  # noqa: BLE001 — chấm là phụ, không bao giờ làm hỏng job
            log.warning("Chấm kỹ thuật lỗi — bỏ qua", exc_info=True)
            tham_my = None
        bien_the.append(
            {
                "key": "styled",
                "title": NHAN_PRESET.get(preset, "Bối cảnh studio"),
                "background": NHAN_PRESET.get(preset, "Bối cảnh studio"),
                "image": anh_styled,
                "watermark": False,
                "generative_fill_used": True,
                "subject_box": (
                    round(bc.x * he_so), round(bc.y * he_so), round(rong_ct * he_so), round(cao_ct * he_so)
                ),
                "composition": {"shot": bc.shot, "placement": bc.placement, "fill_mode": "full_frame"},
                "light_direction": huong_sang,
                "aesthetic": tham_my,
                "upscale": thong_tin_tang_net,
                "compose_mode": "harmonize" if hoa_hop else "paste",
                "harmonize": getattr(engine, "lan_cuoi_hoa_hop", None) if hoa_hop else None,
                "edge_fade": (
                    {"edges": mo_mep.mep, "skin": mo_mep.co_da_nguoi, "band_px": mo_mep.dai_mo_px} if mo_mep else None
                ),
            }
        )
    elif style != "transparent":
        # `hau_canh_bytes` (nhánh Cloud, 23/09/2026): hậu cảnh trống do nhà
        # cung cấp sinh — thay phông tự dựng; chủ thể vẫn dán nguyên khối.
        anh_hau_canh = None
        if hau_canh_bytes is not None:
            anh_hau_canh = Image.open(BytesIO(hau_canh_bytes))
            anh_hau_canh.load()
        anh_boi_canh = engine.composite(
            rgba,
            style=style,
            with_shadow=True,
            with_light_wrap=True,
            backdrop_image=anh_hau_canh,
        )

        if auto_enhance:
            anh_boi_canh = _ap_dung_auto_enhance(anh_boi_canh, rgba)

        # Đóng khung bản "styled" — mặc định vẫn đệm màu đặc (`_dong_khung`,
        # hành vi giữ nguyên). CHỈ khi job yêu cầu rõ một `expand_provider`
        # khác mặc định mới gọi `ImageExpander` để sinh nội dung ở biên
        # thay vì đệm — không tự bật, đúng bài học nợ #80 (đừng để một tính
        # năng âm thầm đổi hành vi/tốn tiền không ai yêu cầu).
        if expand_provider and expand_provider.strip().lower() != "pad":
            expander_dung = resolve_expander(expand_provider)
            try:
                ket_qua_mo_rong = expander_dung.expand(
                    _anh_thanh_png_bytes(anh_boi_canh),
                    ratio,
                    product_mask=_mat_na_iopaint(alpha),
                )
                anh_mo_rong = Image.open(BytesIO(ket_qua_mo_rong["image"]))
                anh_mo_rong.load()

                # Belt-and-suspenders (nợ #104, thiết kế tích hợp IOPaint
                # mục 3): dán lại nguyên khối `rgba` gốc TRƯỚC khi đóng
                # khung — chỉ engine nào tự báo `paste_offset` mới có bước
                # này (`PadExpander`/`ReplicateOutpainter` không có trường
                # này trong `parameters`, giữ nguyên hành vi cũ).
                paste_offset = (ket_qua_mo_rong.get("parameters") or {}).get("paste_offset")
                if paste_offset is not None:
                    anh_mo_rong = _dan_lai_chu_the(anh_mo_rong, rgba, tuple(paste_offset))

                # Lưới an toàn kích thước: bất kể `ImageExpander` cụ thể trả
                # về đúng kích thước preset hay không (lược đồ
                # `bria/expand-image` CHƯA xác minh, xem
                # `replicate_outpainter.py`), luôn đi qua `dong_khung` một
                # lần nữa để đảm bảo khung cuối ĐÚNG kích thước
                # `RATIO_PRESETS` — nếu ảnh trả về đã đúng tỷ lệ thì bước
                # này gần như chỉ resize, không mất nội dung đã sinh thêm.
                anh_styled = dong_khung(anh_mo_rong, ratio)
                if getattr(expander_dung, "muc_dung_lan_cuoi", None) is None:
                    # Đã tự lùi về `PadExpander` bên trong (lỗi/thiếu
                    # token/URL) — không có gì để ghi `AIC-13`, coi như
                    # không dùng provider.
                    expander_dung = None
            except Exception:
                # Lỗi ở CHÍNH mã dán-lại/đóng-khung của worker (không phải
                # lỗi nội bộ của engine — engine đã tự lùi về Pad và không
                # ném lỗi ra ngoài, xem docstring `replicate_outpainter.py`/
                # `iopaint_outpainter.py`). Một job không bao giờ được vỡ vì
                # bước bảo hiểm này — lùi hẳn về đóng khung màu đặc.
                log.warning(
                    "Mở rộng khung lỗi ngoài dự kiến ở variant_worker (dán lại/đóng khung) — lùi về đóng khung màu đặc",
                    exc_info=True,
                )
                expander_dung = None
                anh_styled = _dong_khung(anh_boi_canh, ratio)
        else:
            anh_styled = _dong_khung(anh_boi_canh, ratio)

        bien_the.append(
            {
                "key": "styled",
                "title": NHAN_PRESET.get(preset, "Bối cảnh studio"),
                "background": NHAN_PRESET.get(preset, "Bối cảnh studio"),
                "image": anh_styled,
                "watermark": False,
                "generative_fill_used": True,
            }
        )

    # 3. Bản đóng dấu — chỉ khi người dùng bật VÀ tiệm có gì để đóng.
    if watermark and (logo_bytes or ten_tiem):
        nguon = anh_boi_canh if anh_boi_canh is not None else rgba
        da_dong = dong_dau(nguon, logo_bytes, ten_tiem)
        bien_the.append(
            {
                "key": "branded",
                "title": "Bản đóng dấu thương hiệu",
                "background": NHAN_PRESET.get(preset, "Bối cảnh studio"),
                "image": dong_khung(da_dong, ratio, 2 if (upscale == "2x" and fill_mode != "pad") else 1),
                "watermark": True,
                "generative_fill_used": anh_boi_canh is not None,
            }
        )

    # Đo trên bản bối cảnh nếu có (nó đi qua NHIỀU bước xử lý nhất), ngược
    # lại đo trên bản tách nền. Đo bản dễ nhất rồi báo cáo cho cả lượt là
    # cách một cổng an toàn trở thành hình thức.
    if de_do_can_chinh is not None:
        de_do = de_do_can_chinh
    else:
        de_do = anh_boi_canh if anh_boi_canh is not None else rgba
    do_trung = _do_lo_chu_the(master_rgb, de_do, alpha_do)

    return bien_the, do_trung, expander_dung


# ─── Vòng đời một job ──────────────────────────────────────────────────────


def _ghi_asset_bien_the(
    conn: psycopg.Connection,
    job: dict[str, Any],
    master: dict[str, Any],
    item: dict[str, Any],
    ratio: str,
    preset: str,
    do_trung: float,
    nguon: dict[str, Any] | None = None,
) -> str:
    """`nguon` (23/09/2026): mô tả nguồn hậu cảnh + phân cảnh Narrative Arc —
    `engine`, `provider`, `cloud_fallback`, `scene_index`. Vắng = nhánh local
    như trước."""
    nguon = nguon or {}
    data, mime, duoi = _sang_bytes(item["image"])
    asset_id = str(uuid.uuid4())
    product_id = master["product_id"]
    storage_key = (
        f"org/{job['organization_id']}/{product_id or 'unfiled'}/{asset_id}_m04b_{item['key']}.{duoi}"
    )
    ghi_bytes(storage_key, data, mime, STORAGE_ROOT)

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO assets
                (id, organization_id, product_id, parent_asset_id, kind, state, version,
                 storage_key, mime_type, width, height, aspect_ratio, file_size,
                 provider, model, model_version, pipeline_version,
                 parameters, identity_score, generated_flags, metadata,
                 approval_state, created_by, created_at)
            VALUES
                (%(id)s, %(organization_id)s, %(product_id)s, %(parent_asset_id)s,
                 'MARKETING', 'READY', 1,
                 %(storage_key)s, %(mime_type)s, %(width)s, %(height)s, %(aspect_ratio)s, %(file_size)s,
                 %(provider)s, %(model)s, %(model_version)s, %(pipeline_version)s,
                 %(parameters)s, %(identity_score)s, %(generated_flags)s, %(metadata)s,
                 'PENDING', %(created_by)s, now())
            """,
            {
                "id": asset_id,
                "organization_id": job["organization_id"],
                "product_id": product_id,
                # Phả hệ trỏ về Master, không về ảnh gốc: biến thể là con của
                # bản đã duyệt, và đó là thứ khiến `listDerivedFrom` đọc đúng.
                "parent_asset_id": master["id"],
                "storage_key": storage_key,
                "mime_type": mime,
                "width": item["image"].width,
                "height": item["image"].height,
                "aspect_ratio": ratio,
                "file_size": len(data),
                "provider": nguon.get("provider") or "m04b_studio",
                "model": nguon.get("model") or "rembg+studio_backdrop",
                "model_version": nguon.get("model_version") or f"{(nguon.get('segmentation') or {}).get('model') or mo_hinh_tach_nen()}-v1",
                "pipeline_version": nguon.get("pipeline_version") or PIPELINE_VERSION,
                "parameters": json.dumps(
                    {
                        "preset": preset,
                        "ratio": ratio,
                        "watermark": item["watermark"],
                        "engine": nguon.get("engine", "local_studio"),
                        "scene_prompt": nguon.get("scene_prompt"),
                        "seed": nguon.get("seed"),
                        "fill_mode": nguon.get("fill_mode", "pad"),
                        "style": nguon.get("style"),
                        "quality": nguon.get("quality", "standard"),
                        "upscale": nguon.get("upscale_requested", "none"),
                        "compose_mode": nguon.get("compose_mode", "paste"),
                    }
                ),
                "identity_score": do_trung,
                "generated_flags": json.dumps(
                    {
                        "generative_fill_used": item["generative_fill_used"],
                        "requires_reshoot_warning": False,
                    }
                ),
                "metadata": json.dumps(
                    {
                        "job_id": job["id"],
                        "variant_key": item["key"],
                        "title": item["title"],
                        "background": item["background"],
                        "ratio": ratio,
                        "preset": preset,
                        "watermark": item["watermark"],
                        "source_master_asset_id": master["id"],
                        "subject_pixel_identity": do_trung,
                        "engine": nguon.get("engine", "local_studio"),
                        "background_provider": nguon.get("background_provider"),
                        "cloud_fallback": bool(nguon.get("cloud_fallback", False)),
                        "cloud_fallback_reason": nguon.get("cloud_fallback_reason"),
                        "scene_index": nguon.get("scene_index"),
                        "scene_plan_id": nguon.get("scene_plan_id"),
                        "scene_plan_revision": nguon.get("scene_plan_revision"),
                        # Đợt 1 (24/09/2026): đủ để tái tạo và để QA đối chiếu.
                        "fill_mode": nguon.get("fill_mode", "pad"),
                        "composition": item.get("composition") or nguon.get("composition"),
                        "light_direction": item.get("light_direction"),
                        "subject_box": list(item["subject_box"]) if item.get("subject_box") else None,
                        "seed": nguon.get("seed"),
                        "scene_prompt": nguon.get("scene_prompt"),
                        "provider_ignored": nguon.get("provider_ignored") or [],
                        # Đợt 2 (25/09/2026): phong cách + nhóm phương án.
                        "style": nguon.get("style"),
                        "palette": nguon.get("palette") or [],
                        "candidate_index": nguon.get("candidate_index"),
                        "candidate_count": nguon.get("candidate_count"),
                        "job_group_id": nguon.get("job_group_id"),
                        # Đợt 3 (25/09/2026): chất lượng, tăng nét, cách ghép, làm mờ
                        # mép cắt, mô hình tách nền + giấy phép, chấm kỹ thuật.
                        "quality": nguon.get("quality", "standard"),
                        "upscale": item.get("upscale"),
                        "compose_mode": item.get("compose_mode") or nguon.get("compose_mode", "paste"),
                        "harmonize": item.get("harmonize"),
                        "edge_fade": item.get("edge_fade"),
                        "segmentation": nguon.get("segmentation"),
                        "aesthetic": item.get("aesthetic"),
                        # Luồng nhà cung cấp trọn gói (25/09/2026): ảnh đã được nhà
                        # cung cấp chỉnh sáng cả bó hoa → nhãn "đã chỉnh sáng bằng AI".
                        "flow": nguon.get("flow") or ("local" if nguon.get("engine") != "cloud_provider" else "provider_background"),
                        "ai_relit": bool(nguon.get("ai_relit")),
                        "integrity_method": "perceptual" if nguon.get("ai_relit") else "pixel_exact",
                        "provider_steps": nguon.get("provider_steps"),
                        "provider_params": nguon.get("provider_params"),
                    }
                ),
                "created_by": job["user_id"],
            },
        )
    conn.commit()
    return asset_id


def process_variant_job(conn: psycopg.Connection, job: dict[str, Any]) -> None:
    payload = job["payload"] if isinstance(job["payload"], dict) else json.loads(job["payload"])
    organization_id = job["organization_id"]  # luật 1 — chỉ từ dòng job

    try:
        master_asset_id = payload["master_asset_id"]
        preset = payload.get("preset") or "studio_white"
        ratio = payload.get("ratio") or "1:1"
        watermark = bool(payload.get("watermark", True))
        auto_enhance = bool(payload.get("auto_enhance", False))

        master = _doc_asset(conn, organization_id, master_asset_id)
        # Lớp chặn thứ hai. Phía TS đã kiểm ở `request-variants.ts`; kiểm lại
        # ở đây vì hàng đợi có thể nhận job từ một đường ghi khác trong tương
        # lai, và cổng 2 của M04a là thứ không được có đường vòng.
        if master["kind"] != "MASTER" or master["approval_state"] != "APPROVED":
            raise ValueError(
                "Biến thể chỉ dựng được trên Master Image đã duyệt "
                f"(nhận kind={master['kind']}, approval_state={master['approval_state']})"
            )

        scene_index = payload.get("scene_index")
        # `scene_plan_id` (24/09/2026): kịch bản bối cảnh của chủ đề mà cảnh này
        # thuộc về — giao diện chỉ nạp lại cảnh của ĐÚNG kịch bản đang mở.
        scene_plan_id = payload.get("scene_plan_id")
        # `scene_plan_revision` (Đợt 3, 24/09/2026): phiên bản kịch bản lúc sinh
        # ảnh — kịch bản sửa sau đó thì ảnh này được đánh dấu "lỗi thời".
        scene_plan_revision = payload.get("scene_plan_revision")
        nguon: dict[str, Any] = {
            "engine": "local_studio",
            "scene_index": scene_index,
            "scene_plan_id": scene_plan_id,
            "scene_plan_revision": scene_plan_revision,
        }

        master_bytes = doc_bytes(master["storage_key"], STORAGE_ROOT)
        logo_bytes, ten_tiem = _doc_thuong_hieu(conn, organization_id)

        # Nhánh Cloud (23/09/2026) — nhà cung cấp chỉ vẽ HẬU CẢNH TRỐNG; mọi
        # lỗi (thiếu khoá, 402/403/429, mạng) lùi về phông cục bộ của chính
        # preset này và GHI RÕ việc lùi vào asset + sự kiện job, không im lặng.
        # Đợt 1 nâng cấp chất lượng (24/09/2026): ý định bố cục / ánh sáng / bảng
        # màu / seed. Phía TS tự điền từ kịch bản Chặng 05 khi giao diện không gửi.
        fill_mode = payload.get("fill_mode") or "full_frame"
        composition = payload.get("composition") if isinstance(payload.get("composition"), dict) else {}
        lighting = payload.get("lighting") if isinstance(payload.get("lighting"), dict) else {}
        palette = tuple(str(m) for m in (payload.get("palette") or []) if isinstance(m, str))
        seed = payload.get("seed") if isinstance(payload.get("seed"), int) else None
        # Đợt 2 (25/09/2026): phong cách (ý định ALG) + vị trí trong nhóm phương án.
        style = payload.get("style") if payload.get("style") in PHONG_CACH else None
        # Đợt 3 (25/09/2026): chất lượng / tăng nét / cách ghép — giá trị lạ lùi về mặc định.
        quality = payload.get("quality") if payload.get("quality") in CHAT_LUONG else "standard"
        upscale = payload.get("upscale") if payload.get("upscale") in TANG_NET else "none"
        # Luồng (PO 25/09/2026): đám mây mặc định `relight` = NHÀ CUNG CẤP LÀM TRỌN GÓI
        # (`jobs/variant_nha_cung_cap.py`); cục bộ mặc định `paste`. `paste`/`harmonize`
        # trên đám mây = chỉ xin hậu cảnh rồi tự ghép (giữ từng điểm ảnh bó hoa).
        la_cloud_feature = job.get("feature") == CLOUD_FEATURE and preset != "transparent"
        compose_mode = (
            payload.get("compose_mode") if payload.get("compose_mode") in CACH_GHEP
            else ("relight" if la_cloud_feature else "paste")
        )
        bo_qua_luong: list[str] = []
        if compose_mode == "relight" and not la_cloud_feature:
            bo_qua_luong.append("compose_mode:relight")  # chỉnh sáng cần nhà cung cấp
            compose_mode = "paste"
        mo_hinh_tach = mo_hinh_tach_nen()
        gp = giay_phep(mo_hinh_tach)
        nguon.update(
            {
                "fill_mode": fill_mode, "composition": composition, "lighting": lighting,
                "palette": list(palette), "style": style,
                "candidate_index": payload.get("candidate_index"),
                "candidate_count": payload.get("candidate_count"),
                "job_group_id": job.get("job_group_id"),
                "quality": quality,
                "upscale_requested": upscale,
                "compose_mode": compose_mode,
                "segmentation": {
                    "model": mo_hinh_tach,
                    "license": gp.license if gp else None,
                    "commercial_use": gp.commercial_use if gp else None,
                },
            }
        )
        if gp is None or not gp.commercial_use:
            # D18: không chặn job (máy dev), nhưng nói to — production không được chạy thế này.
            log.warning(
                "Mô hình tách nền %s %s — không dùng cho production thu phí (D18)",
                mo_hinh_tach, "chưa có trong bảng giấy phép" if gp is None else f"giấy phép {gp.license}",
            )
        seed_phong: int | None = None
        if job.get("feature") != CLOUD_FEATURE or preset == "transparent":
            # Phông cục bộ: seed đổi vùng sáng + bố cục bokeh (Đợt 2) — không
            # truyền thì tự bốc và ghi lại để tái tạo được. Không đọc prompt /
            # phong cách — nói thật.
            seed_phong = seed if seed is not None else random.randint(0, 4_294_967_294)
            nguon["seed"] = seed_phong
            bo_qua_cuc_bo = ["style"] if style is not None else []
            if quality != "standard":
                bo_qua_cuc_bo.append("quality")  # phông cục bộ không có bậc cao hơn
            if palette or lighting.get("mood"):
                bo_qua_cuc_bo.append("prompt")
            nguon["provider_ignored"] = bo_qua_cuc_bo + bo_qua_luong

        # Nhánh Cloud (23/09/2026) — nhà cung cấp chỉ vẽ HẬU CẢNH TRỐNG; mọi
        # lỗi (thiếu khoá, 402/403/429, mạng) lùi về phông cục bộ của chính
        # preset này và GHI RÕ việc lùi vào asset + sự kiện job, không im lặng.
        hau_canh_bytes: bytes | None = None
        nguon_hau_canh: Callable[[str, int, int], Image.Image | None] | None = None
        la_cloud = job.get("feature") == CLOUD_FEATURE and preset != "transparent"
        if la_cloud:
            nguon.update({"engine": "cloud_provider", "pipeline_version": CLOUD_PIPELINE_VERSION})

        def _lui_ve_cuc_bo(exc: BackgroundProviderError, bat_dau: float) -> None:
            nguon.update({"cloud_fallback": True, "cloud_fallback_reason": str(exc)[:300]})
            # In ra terminal worker — trước 24/09 lỗi này chỉ nằm trong DB,
            # người vận hành không thấy vì sao ảnh chỉ có phông trơn.
            log.warning(
                "Nhà cung cấp không vẽ được hậu cảnh (job %s, HTTP %s) — lùi về phông cục bộ: %s",
                job["id"], exc.status_code, str(exc)[:300],
            )
            ghi_ai_request(
                conn, job_id=job["id"], organization_id=organization_id, capability_code="AIC-17",
                model_key="stability_ai:stable-image-core-v2beta", outcome="FAILED",
                latency_ms=int((time.monotonic() - bat_dau) * 1000),
            )
            _emit_event(
                conn, job["id"], "log",
                {
                    "message": "Nhà cung cấp hậu cảnh lỗi — lùi về phông Studio cục bộ",
                    "cloud_fallback": True, "reason": str(exc)[:300], "status_code": exc.status_code,
                },
            )

        def _ghi_nguon_cloud(
            provider: Any, bat_dau: float, prompt: str | None, seed_dung: int | None, bo_qua: list[str],
            model_version: str | None = None,
        ) -> None:
            model_version = model_version or provider.model_version
            nguon.update(
                {
                    "background_provider": provider.name,
                    "provider": provider.name,
                    "model": f"rembg+{provider.name}_background",
                    "model_version": model_version,
                    "scene_prompt": prompt,
                    "seed": seed_dung,
                    "provider_ignored": bo_qua,
                }
            )
            ghi_ai_request(
                conn, job_id=job["id"], organization_id=organization_id, capability_code="AIC-17",
                model_key=f"{provider.name}:{model_version}", outcome="ACCEPTED",
                latency_ms=int((time.monotonic() - bat_dau) * 1000), image_count=1,
            )

        if la_cloud and fill_mode == "pad":
            # Hành vi cũ: hậu cảnh theo tỉ lệ ảnh Master, ghép rồi đệm.
            _set_stage(conn, job["id"], "GENERATING_BACKGROUND")
            bat_dau_cloud = time.monotonic()
            try:
                provider = resolve_background_provider(payload.get("provider"))
                with Image.open(BytesIO(master_bytes)) as anh_master:
                    rong, cao = anh_master.size
                ket_qua_cloud = provider.sinh_hau_canh(payload.get("scene_prompt"), rong, cao)
                hau_canh_bytes = ket_qua_cloud["image"]
                _ghi_nguon_cloud(provider, bat_dau_cloud, ket_qua_cloud["prompt"], None, [])
            except BackgroundProviderError as exc:
                _lui_ve_cuc_bo(exc, bat_dau_cloud)
        elif la_cloud and compose_mode != "relight":
            # Khung đúng tỉ lệ đích: gọi nhà cung cấp SAU khi `dung_bien_the` biết
            # kích thước khung làm việc — hậu cảnh vẽ đúng khung, không phải đệm.
            def _hau_canh_cloud(ratio_khung: str, rong: int, cao: int) -> Image.Image | None:
                _set_stage(conn, job["id"], "GENERATING_BACKGROUND")
                bat_dau = time.monotonic()
                try:
                    provider = resolve_background_provider(payload.get("provider"))
                    kq = provider.generate(
                        BackgroundRequest(
                            ratio=ratio_khung, rong=rong, cao=cao,
                            scene_prompt=payload.get("scene_prompt"),
                            lighting_direction=lighting.get("direction"),
                            lighting_mood=lighting.get("mood"),
                            palette=palette,
                            shot=composition.get("shot"),
                            seed=seed,
                            style=style,
                            quality=quality,
                        )
                    )
                except BackgroundProviderError as exc:
                    _lui_ve_cuc_bo(exc, bat_dau)
                    return None
                _ghi_nguon_cloud(provider, bat_dau, kq.prompt, kq.seed, kq.bo_qua, kq.model_version)
                return kq.anh

            nguon_hau_canh = _hau_canh_cloud

        # ── Luồng nhà cung cấp trọn gói (PO 25/09/2026) ─────────────────────
        ket_qua_ncc = None
        if la_cloud and compose_mode == "relight" and fill_mode != "pad":
            nha_cung_cap = thu_tu_nha_cung_cap(payload.get("provider"), payload.get("provider_order"))
            bat_dau_ncc = time.monotonic()
            try:
                ket_qua_ncc = dung_bien_the_nha_cung_cap(
                    master_bytes, preset, ratio, watermark, logo_bytes, ten_tiem, nha_cung_cap,
                    y_dinh={
                        "scene_prompt": payload.get("scene_prompt"), "composition": composition,
                        "lighting": lighting, "palette": list(palette), "seed": seed, "style": style,
                        "quality": quality, "upscale": upscale,
                    },
                    master_asset_id=master_asset_id, cache_dir=SEGMENTATION_CACHE_ROOT,
                    on_stage=lambda stage: _set_stage(conn, job["id"], stage),
                    nhan_preset=NHAN_PRESET.get(preset, "Bối cảnh do nhà cung cấp dựng"),
                )
            except TatCaNhaCungCapLoi as exc:
                ly_do = str(exc)[:300]
                nguon.update({"cloud_fallback": True, "cloud_fallback_reason": ly_do, "flow": "local_fallback"})
                log.warning("Mọi nhà cung cấp đều lỗi (job %s) — lùi về luồng cục bộ: %s", job["id"], ly_do)
                ghi_ai_request(
                    conn, job_id=job["id"], organization_id=organization_id, capability_code="AIC-17",
                    model_key="provider_scene", outcome="FAILED",
                    latency_ms=int((time.monotonic() - bat_dau_ncc) * 1000),
                )
                _emit_event(conn, job["id"], "log", {
                    "message": "Nhà cung cấp không dựng được cảnh — lùi về luồng cục bộ (phông Studio)",
                    "cloud_fallback": True, "reason": ly_do,
                })
                seed_phong = seed if seed is not None else random.randint(0, 4_294_967_294)
                nguon["seed"] = seed_phong
            else:
                nguon.update(ket_qua_ncc.nguon)
                nguon.update({
                    "flow": "provider_scene", "background_provider": ket_qua_ncc.nguon["provider"],
                    "model": f"{ket_qua_ncc.nguon['provider']}:scene",
                    "segmentation": {"model": f"{ket_qua_ncc.nguon['provider']}:provider", "license": "provider-api", "commercial_use": True},
                })
                if ket_qua_ncc.loi_ben_truoc:
                    _emit_event(conn, job["id"], "log", {
                        "message": "Nhà cung cấp trước lỗi — đã dùng nhà cung cấp kế tiếp",
                        "errors": ket_qua_ncc.loi_ben_truoc,
                    })
                ghi_ai_request(
                    conn, job_id=job["id"], organization_id=organization_id, capability_code="AIC-17",
                    model_key=f"{ket_qua_ncc.nguon['provider']}:{ket_qua_ncc.nguon['model_version']}",
                    outcome="ACCEPTED", latency_ms=int((time.monotonic() - bat_dau_ncc) * 1000),
                    image_count=len(ket_qua_ncc.bien_the),
                )

        if ket_qua_ncc is None:
            _set_stage(conn, job["id"], "SEGMENTING")

        # nợ #110 (18/09): KHÔNG ghi stage="COMPOSING" ở đây nữa — bước tách
        # chủ thể thật (nặng nhất) mới sắp chạy bên trong `dung_bien_the`.
        # Truyền `on_stage` để chính nó ghi "COMPOSING" đúng lúc chuyển việc.
        if ket_qua_ncc is not None:
            bien_the = ket_qua_ncc.bien_the
            do_trung = float(ket_qua_ncc.khoi_do.get("structure_ssim") or 0.0)
            expander_dung = None
        else:
            bat_dau_bien_the = time.monotonic()
            try:
                bien_the, do_trung, expander_dung = dung_bien_the(
                    master_bytes, preset, ratio, watermark, logo_bytes, ten_tiem,
                    expand_provider=payload.get("expand_provider"),
                    auto_enhance=auto_enhance,
                    master_asset_id=master_asset_id,
                    cache_dir=SEGMENTATION_CACHE_ROOT,
                    on_stage=lambda stage: _set_stage(conn, job["id"], stage),
                    hau_canh_bytes=hau_canh_bytes,
                    fill_mode=fill_mode,
                    composition=composition,
                    lighting=lighting,
                    nguon_hau_canh=nguon_hau_canh,
                    seed_phong=seed_phong,
                    upscale=upscale,
                    compose_mode=compose_mode,
                )
            except Exception:
                ghi_ai_request(
                    conn,
                    job_id=job["id"],
                    organization_id=organization_id,
                    capability_code="AIC-17",
                    model_key="rembg+studio_backdrop",
                    outcome="FAILED",
                    latency_ms=int((time.monotonic() - bat_dau_bien_the) * 1000),
                )
                raise
            # 100% cục bộ, không tiêu tiền nhà cung cấp nào (xem docstring đầu
            # file) — `cost_usd`/token để None, không ghi 0.
            ghi_ai_request(
                conn,
                job_id=job["id"],
                organization_id=organization_id,
                capability_code="AIC-17",
                model_key="rembg+studio_backdrop",
                outcome="ACCEPTED",
                latency_ms=int((time.monotonic() - bat_dau_bien_the) * 1000),
                image_count=len(bien_the),
            )

        if expander_dung is not None:
            # AIC-13 — mở rộng khung bằng model sinh nội dung (nợ #78,
            # 17/09). Chỉ ghi khi job THỰC SỰ yêu cầu provider khác mặc
            # định VÀ provider đó đã thật sự chạy (không tự lùi về
            # `PadExpander` bên trong — `dung_bien_the` đã đặt
            # `expander_dung = None` cho trường hợp đó). `so_do_chi_phi_luot`
            # tự trả `cost_usd = None` nếu provider không đo được, đúng
            # nguyên tắc "chưa đo được khác 0" xuyên suốt cả hai worker.
            ghi_ai_request(
                conn,
                job_id=job["id"],
                organization_id=organization_id,
                capability_code="AIC-13",
                model_key=getattr(expander_dung, "model_version", None) or expander_dung.name,
                outcome="ACCEPTED",
                latency_ms=int((time.monotonic() - bat_dau_bien_the) * 1000),
                image_count=1,
                **so_do_chi_phi_luot(expander_dung),
            )

        _set_stage(conn, job["id"], "VERIFYING")
        if ket_qua_ncc is not None:
            # Luồng nhà cung cấp: đo HÌNH DÁNG + CẤU TRÚC + MÀU (`image/do_giu_nguyen.py`) —
            # bó hoa được nhà cung cấp chỉnh sáng nên so từng điểm ảnh không áp dụng.
            kd = ket_qua_ncc.khoi_do
            bi_tu_choi = kd["result"] == "REJECTED"
            khoi_do = {
                "method": "perceptual",
                "subject_pixel_identity": do_trung,
                "structure_ssim": kd.get("structure_ssim"),
                "color_delta_e": kd.get("color_delta_e"),
                "shape_iou": kd.get("shape_iou"),
                "ai_relit": True,
                "generative_fill_used": True,
                "source_master_asset_id": master["id"],
                "ly_do": kd.get("ly_do") or [],
            }
        else:
            bi_tu_choi = do_trung < NGUONG_TU_CHOI
            khoi_do = {
                "method": "pixel_exact",
                "subject_pixel_identity": do_trung,
                "generative_fill_used": any(b["generative_fill_used"] for b in bien_the),
                "source_master_asset_id": master["id"],
                "ly_do": (
                    []
                    if not bi_tu_choi
                    else [
                        "Lõi chủ thể đã bị thay đổi trong lúc ghép bối cảnh — "
                        f"chỉ còn {do_trung:.4f} trùng khít với Master Image"
                    ]
                ),
            }
        _emit_event(conn, job["id"], "variant_integrity", khoi_do)

        asset_ids: list[str] = []
        if bi_tu_choi:
            # Bị từ chối thì KHÔNG ghi asset (Arch §2.4, `variant-rules.ts`).
            # 23/09/2026: gỡ nhánh "vẫn ghi asset, dán nhãn WARNING" — nhánh đó
            # ra đời vì phép đo co biên thiếu (3px < light wrap 4px) khiến mọi
            # biến thể hợp lệ bị đo thấp; lỗi đo đã sửa ở `DO_SAU_CO_BIEN`, nên
            # dưới ngưỡng bây giờ nghĩa là lõi bó hoa THẬT SỰ bị đổi.
            ket_qua = "REJECTED"
            _emit_event(
                conn,
                job["id"],
                "log",
                {"message": "Subject Integrity dưới ngưỡng — không ghi biến thể nào", "ly_do": khoi_do["ly_do"]},
            )
        else:
            if ket_qua_ncc is not None:
                ket_qua = ket_qua_ncc.khoi_do["result"]
            else:
                ket_qua = "WARNING" if do_trung < 0.999 else "SAFE"
            _set_stage(conn, job["id"], "GENERATING_OUTPUTS")
            for item in bien_the:
                asset_ids.append(
                    _ghi_asset_bien_the(conn, job, master, item, ratio, preset, do_trung, nguon)
                )

        output_payload = {
            "master_asset_id": master["id"],
            "variant_asset_ids": asset_ids,
            "preset": preset,
            "ratio": ratio,
            "watermark": watermark,
            "auto_enhance": auto_enhance,
            "subject_pixel_identity": do_trung,
            "engine": nguon.get("engine", "local_studio"),
            "background_provider": nguon.get("background_provider"),
            "cloud_fallback": bool(nguon.get("cloud_fallback", False)),
            "cloud_fallback_reason": nguon.get("cloud_fallback_reason"),
            "scene_index": scene_index,
            "scene_plan_id": scene_plan_id,
            "scene_plan_revision": scene_plan_revision,
            "fill_mode": fill_mode,
            "composition": next((b.get("composition") for b in bien_the if b.get("composition")), None),
            "light_direction": next((b.get("light_direction") for b in bien_the if b.get("light_direction")), None),
            "seed": nguon.get("seed"),
            "scene_prompt": nguon.get("scene_prompt"),
            "provider_ignored": nguon.get("provider_ignored") or [],
            "style": nguon.get("style"),
            "palette": nguon.get("palette") or [],
            "candidate_index": nguon.get("candidate_index"),
            "job_group_id": nguon.get("job_group_id"),
            "quality": nguon.get("quality", "standard"),
            "upscale": nguon.get("upscale_requested", "none"),
            "compose_mode": nguon.get("compose_mode", "paste"),
            "aesthetic": next((b.get("aesthetic") for b in bien_the if b.get("aesthetic")), None),
            "edge_fade": next((b.get("edge_fade") for b in bien_the if b.get("edge_fade")), None),
            "segmentation": nguon.get("segmentation"),
            # Luồng nhà cung cấp trọn gói (25/09/2026)
            "flow": nguon.get("flow") or ("provider_background" if la_cloud else "local"),
            "ai_relit": bool(nguon.get("ai_relit")),
            "integrity_method": khoi_do["method"],
            "provider_steps": nguon.get("provider_steps"),
        }
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE generation_jobs
                   SET status = 'COMPLETED', result = %s, stage = NULL, completed_at = now(),
                       output = %s
                 WHERE id = %s
                """,
                (ket_qua, json.dumps(output_payload), job["id"]),
            )
        conn.commit()
        _emit_event(
            conn,
            job["id"],
            "done",
            {"status": "COMPLETED", "result": ket_qua, **output_payload},
        )

    except Exception as exc:  # noqa: BLE001 — hỏng KỸ THUẬT, không phải phán quyết
        conn.rollback()
        with conn.cursor() as cur:
            thu_lai = ghi_job_loi(cur, job["id"], exc)
        conn.commit()
        _emit_event(conn, job["id"], "retry" if thu_lai else "done", {"status": "PENDING" if thu_lai else "FAILED", "error": str(exc)})
