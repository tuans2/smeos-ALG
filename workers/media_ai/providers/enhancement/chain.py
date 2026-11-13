"""Chuỗi nhà cung cấp cho M04a (PO 25/09/2026): nhà cung cấp TRƯỚC, cục bộ chỉ là đường lùi.

Thứ tự đến từ core (`payload.config.provider_order` — bên chọn cho lượt này →
thứ tự của tiệm → mặc định, `provider-catalog.ts`). Mỗi bên chạy ở chế độ
`lui_cuc_bo=False`: lỗi thì NÉM để thử bên kế tiếp thay vì tự lùi cục bộ giữa
chừng. Mọi bên đều lỗi → `StudioEnhancer` một lần, kèm lý do từng bên. Kết quả
ghi `provider_attempts` để đối soát; `name`/`model_version` phản ánh bên thật
đã chạy (ghi vào `assets.provider`).
"""

from __future__ import annotations

from typing import Any, Callable

from media_ai.providers.base import KetQuaTangCuong
from media_ai.providers.enhancement._cloud_common import NhaCungCapLoi, lui_ve_cuc_bo


def _dung(key: str) -> Any:
    from media_ai.providers.enhancement.fal_enhancer import FalEnhancer
    from media_ai.providers.enhancement.imagen_enhancer import ImagenEnhancer
    from media_ai.providers.enhancement.openai_enhancer import OpenAIEnhancer
    from media_ai.providers.enhancement.photoroom_enhancer import PhotoroomEnhancer

    bang: dict[str, Callable[[], Any]] = {
        "photoroom": lambda: PhotoroomEnhancer(lui_cuc_bo=False),
        "fal_flux": lambda: FalEnhancer(lui_cuc_bo=False),
        "fal": lambda: FalEnhancer(lui_cuc_bo=False),
        "imagen": lambda: ImagenEnhancer(lui_cuc_bo=False),
        # OpenAIEnhancer tự lùi PIL bên trong — chuỗi đọc cờ `fallback` để coi là lỗi.
        "openai": OpenAIEnhancer,
    }
    if key not in bang:
        raise NhaCungCapLoi(key, "không có trong danh mục nhà cung cấp tối ưu ảnh")
    return bang[key]()


class ProviderChainEnhancer:
    def __init__(self, order: list[str], dung: Callable[[str], Any] = _dung) -> None:
        self.order = [k for k in dict.fromkeys(order) if k]
        self._dung = dung
        self.name = "provider_chain"
        self.model_version = "provider_chain"
        self.muc_dung_lan_cuoi = None

    def enhance(self, image: bytes, config: dict[str, Any]) -> KetQuaTangCuong:
        thu: list[dict[str, str]] = []
        for key in self.order:
            try:
                ben = self._dung(key)
                res = ben.enhance(image, config)
                params = res.get("parameters") or {}
                if params.get("fallback"):
                    raise NhaCungCapLoi(key, str(params.get("fallback_reason") or "nhà cung cấp tự lùi"))
            except NhaCungCapLoi as exc:
                thu.append({"provider": key, "error": exc.ly_do[:200]})
                continue
            except Exception as exc:  # noqa: BLE001 — lỗi bất ngờ của một bên không được chặn cả chuỗi
                thu.append({"provider": key, "error": f"{type(exc).__name__}: {exc}"[:200]})
                continue
            self.name = getattr(ben, "name", key)
            self.model_version = getattr(ben, "model_version", key)
            self.muc_dung_lan_cuoi = getattr(ben, "muc_dung_lan_cuoi", None)
            res.setdefault("parameters", {})["provider_attempts"] = thu + [{"provider": key, "ok": "true"}]
            return res

        ly_do = "; ".join(f"{t['provider']}: {t['error']}" for t in thu) or "Không có nhà cung cấp nào trong thứ tự"
        self.name = "studio"
        self.model_version = "studio-rembg-v1"
        res = lui_ve_cuc_bo(image, config, "provider_chain", ly_do)
        res["parameters"]["provider_attempts"] = thu
        return res
