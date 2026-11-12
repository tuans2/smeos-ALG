"""Luồng NHÀ CUNG CẤP TRỌN GÓI cho biến thể Khu vực D (PO 25/09/2026).

Khi job chạy trên đám mây (`media.variant.cloud`, `compose_mode=relight` — mặc
định của nhánh đám mây), MỌI bước chất lượng do nhà cung cấp làm:

    SEGMENTING            tách nền Master          → provider.tach_nen
    (ALG)             đặt bó hoa vào khung đích theo kịch bản (bố cục là ý
                          định của ALG) + làm mờ cẳng tay chạm mép ảnh gốc
    GENERATING_BACKGROUND dựng cảnh + ghép + chỉnh sáng → provider.dung_canh
    (upscale=2x)          tăng nét cả ảnh             → provider.tang_net
    VERIFYING             tách nền ảnh ra + đo hình dáng / cấu trúc / màu
                          (`image/do_giu_nguyen.py`) — nhà cung cấp không trả
                          phép đo nào, cổng vẫn là của ALG

Một nhà cung cấp làm trọn các bước của mình; bước nào lỗi → thử NHÀ CUNG CẤP KẾ
TIẾP từ đầu (vai trò tương đương, thứ tự ở `providers/scene/registry.py`). Mọi
bên đều lỗi → `TatCaNhaCungCapLoi`, worker lùi về luồng cục bộ và ghi rõ lý do.

Không dùng ở đây (chỉ thuộc luồng cục bộ): phông tự dựng, ghép dán nguyên khối +
bóng/light wrap tự vẽ, `harmonize`, tăng nét LANCZOS — nhà cung cấp làm tốt hơn.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path
from typing import Any, Callable

from PIL import Image

from media_ai.image.brand_watermark import dong_dau
from media_ai.image.cham_tham_my import cham_ky_thuat
from media_ai.image.composition import tinh_bo_cuc
from media_ai.image.do_giu_nguyen import do_giu_nguyen
from media_ai.image.mo_mep_cat import lam_mo_mep_cat
from media_ai.image.ratio_frame import dong_khung, kich_thuoc_xuat
from media_ai.providers.scene.base import SceneProvider, SceneProviderError, SceneRequest

log = logging.getLogger("media_ai.jobs.variant_nha_cung_cap")

NGUONG_HOP_BO_CUC = 32


class TatCaNhaCungCapLoi(RuntimeError):
    def __init__(self, ly_do: list[str]) -> None:
        super().__init__("; ".join(ly_do) or "Không có nhà cung cấp nào được cấu hình khoá")
        self.ly_do = ly_do


@dataclass
class KetQuaNhaCungCap:
    bien_the: list[dict[str, Any]]
    khoi_do: dict[str, Any]
    nguon: dict[str, Any]
    loi_ben_truoc: list[str] = field(default_factory=list)


def _png(anh: Image.Image) -> bytes:
    buf = BytesIO()
    anh.save(buf, format="PNG")
    return buf.getvalue()


def _tach_nen_co_cache(p: SceneProvider, master: Image.Image, master_asset_id: str | None, cache_dir: Path | None) -> Image.Image:
    duong = None
    if master_asset_id and cache_dir is not None:
        an_toan = "".join(k if k.isalnum() or k in "-_" else "_" for k in master_asset_id)
        duong = cache_dir / f"{an_toan}_ncc-{p.name}_alpha.png"
        if duong.exists():
            a = Image.open(duong)
            a.load()
            return a.convert("L")
    a = p.tach_nen(master).convert("L")
    if duong is not None:
        cache_dir.mkdir(parents=True, exist_ok=True)
        a.save(duong, format="PNG")
    return a


def _chay_mot_ben(
    p: SceneProvider,
    ben_khac: list[SceneProvider],
    master: Image.Image,
    preset: str,
    ratio: str,
    watermark: bool,
    logo_bytes: bytes | None,
    ten_tiem: str | None,
    y_dinh: dict[str, Any],
    master_asset_id: str | None,
    cache_dir: Path | None,
    on_stage: Callable[[str], None] | None,
    nhan_preset: str,
) -> KetQuaNhaCungCap:
    if on_stage:
        on_stage("SEGMENTING")
    alpha = _tach_nen_co_cache(p, master, master_asset_id, cache_dir)
    rgba = master.convert("RGBA")
    rgba.putalpha(alpha)

    # Chuẩn bị đầu vào theo Ý ĐỊNH ALG: bố cục + làm mờ cẳng tay chạm mép.
    rgba_ghep, alpha_ghep, mo_mep = lam_mo_mep_cat(rgba, alpha)
    upscale = y_dinh.get("upscale") or "none"
    he_so_xuat = 2 if upscale == "2x" else 1
    comp = y_dinh.get("composition") or {}
    hop = alpha_ghep.point(lambda v: 255 if v > NGUONG_HOP_BO_CUC else 0).getbbox() or (0, 0, master.width, master.height)
    bx, by, bx2, by2 = hop
    bc = tinh_bo_cuc(bx2 - bx, by2 - by, ratio, shot=comp.get("shot"), placement=comp.get("placement"),
                     cao_xuat=kich_thuoc_xuat(ratio, he_so_xuat)[1])
    khung = Image.new("RGBA", (bc.rong, bc.cao), (0, 0, 0, 0))
    khung.paste(rgba_ghep, (bc.x - bx, bc.y - by))

    if on_stage:
        on_stage("GENERATING_BACKGROUND")
    lighting = y_dinh.get("lighting") or {}
    kq = p.dung_canh(
        SceneRequest(
            chu_the_png=_png(khung), ratio=ratio, rong=bc.rong, cao=bc.cao,
            scene_prompt=y_dinh.get("scene_prompt"), lighting_direction=lighting.get("direction"),
            lighting_mood=lighting.get("mood"), palette=tuple(y_dinh.get("palette") or ()),
            shot=bc.shot, seed=y_dinh.get("seed"), style=y_dinh.get("style"),
            quality=y_dinh.get("quality") or "standard",
        )
    )
    anh = kq.anh.convert("RGB")
    if anh.size != khung.size:
        anh = anh.resize(khung.size, Image.LANCZOS)

    anh_xuat_nguon = anh
    tang_net_ben = None
    if upscale == "2x":
        anh_xuat_nguon = p.tang_net(anh, 2)
        tang_net_ben = p.name
        anh_do = anh_xuat_nguon.resize(khung.size, Image.LANCZOS)  # đo SAU mọi bước của nhà cung cấp
    else:
        anh_do = anh

    if on_stage:
        on_stage("VERIFYING")
    alpha_ra = None
    ben_do = None
    for q in [p, *ben_khac]:
        try:
            alpha_ra = q.tach_nen(anh_do)
            ben_do = q.name
            break
        except SceneProviderError as exc:
            log.warning("Tách nền ảnh ra để đo bằng %s lỗi: %s", q.name, exc)
    khoi_do = do_giu_nguyen(khung, anh_do, alpha_ra)
    khoi_do["segmentation_for_measure"] = ben_do

    anh_styled = dong_khung(anh_xuat_nguon, ratio, he_so_xuat)
    try:
        tham_my = cham_ky_thuat(anh_styled, khung.split()[3])
    except Exception:  # noqa: BLE001 — chấm là phụ
        tham_my = None
    bien_the: list[dict[str, Any]] = [
        {
            "key": "transparent", "title": "Tách nền trong suốt (PNG)", "background": "Trong suốt (Alpha)",
            "image": dong_khung(rgba, ratio), "watermark": False, "generative_fill_used": False,
        },
        {
            "key": "styled", "title": nhan_preset, "background": nhan_preset, "image": anh_styled,
            "watermark": False, "generative_fill_used": True,
            "subject_box": tuple(round(v * anh_styled.height / bc.cao) for v in (bc.x, bc.y, bx2 - bx, by2 - by)),
            "composition": {"shot": bc.shot, "placement": bc.placement, "fill_mode": "full_frame"},
            "light_direction": lighting.get("direction"),
            "aesthetic": tham_my,
            "upscale": {"factor": 2, "engine": f"{tang_net_ben}:provider"} if tang_net_ben else None,
            "compose_mode": "relight",
            "edge_fade": {"edges": mo_mep.mep, "skin": mo_mep.co_da_nguoi, "band_px": mo_mep.dai_mo_px} if mo_mep.mep else None,
        },
    ]
    if watermark and (logo_bytes or ten_tiem):
        bien_the.append({
            "key": "branded", "title": "Bản đóng dấu thương hiệu", "background": nhan_preset,
            "image": dong_khung(dong_dau(anh_xuat_nguon.convert("RGBA"), logo_bytes, ten_tiem), ratio, he_so_xuat),
            "watermark": True, "generative_fill_used": True,
        })
    nguon = {
        "provider": p.name,
        "model_version": kq.model_version,
        "scene_prompt": kq.prompt,
        "seed": kq.seed,
        "provider_ignored": kq.bo_qua,
        "provider_params": kq.tham_so,
        "provider_steps": {"segmentation": p.name, "scene": kq.model_version, "upscale": tang_net_ben, "measure_segmentation": ben_do},
        "ai_relit": True,
    }
    return KetQuaNhaCungCap(bien_the=bien_the, khoi_do=khoi_do, nguon=nguon)


def dung_bien_the_nha_cung_cap(
    master_bytes: bytes,
    preset: str,
    ratio: str,
    watermark: bool,
    logo_bytes: bytes | None,
    ten_tiem: str | None,
    nha_cung_cap: list[SceneProvider],
    y_dinh: dict[str, Any],
    master_asset_id: str | None = None,
    cache_dir: Path | None = None,
    on_stage: Callable[[str], None] | None = None,
    nhan_preset: str = "Bối cảnh do nhà cung cấp dựng",
) -> KetQuaNhaCungCap:
    """Thử lần lượt từng nhà cung cấp; bên đầu tiên chạy trọn các bước thắng."""
    master = Image.open(BytesIO(master_bytes)).convert("RGB")
    loi: list[str] = []
    for i, p in enumerate(nha_cung_cap):
        try:
            kq = _chay_mot_ben(p, nha_cung_cap[i + 1:], master, preset, ratio, watermark, logo_bytes, ten_tiem,
                               y_dinh, master_asset_id, cache_dir, on_stage, nhan_preset)
            kq.loi_ben_truoc = loi
            return kq
        except SceneProviderError as exc:
            log.warning("Nhà cung cấp %s lỗi — thử bên kế tiếp: %s", p.name, exc)
            loi.append(f"{p.name}: {str(exc)[:200]}")
    raise TatCaNhaCungCapLoi(loi)
