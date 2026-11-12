"""Stability AI — nhà cung cấp trọn gói (25/09/2026).

Dùng toàn bộ tính năng Stability có cho việc này:
  - tách nền: `POST /v2beta/stable-image/edit/remove-background` (trả PNG có alpha);
  - dựng cảnh + ghép + CHỈNH SÁNG: `POST /v2beta/stable-image/edit/replace-background-and-relight`
    (bất đồng bộ: trả `id`, hỏi `GET /v2beta/results/{id}` tới khi 200) —
    `background_prompt`, `preserve_original_subject` (giữ chủ thể, đặt cao),
    `light_source_direction` (left/right/above/below) + `light_source_strength`, `seed`;
  - tăng nét: `POST /v2beta/stable-image/upscale/fast` (×4, rồi co về hệ số cần).

Tên tham số theo hiểu biết về API v2beta (trang tài liệu chính thức không tải
được nội dung tự động; đã đối chiếu qua tài liệu node ComfyUI/SDK bên thứ ba) —
CHƯA gọi thật: tài khoản đang HTTP 402 và máy agent bị chặn mạng. Xác nhận bằng
`scripts/thu-nha-cung-cap-canh.py` (nợ #138).

Replace Background & Relight không có tham số phong cách / bậc chất lượng → phong
cách đi qua prompt, `quality=high` ghi `bo_qua`. Hướng "front" không có tham số
tương ứng → ghi `bo_qua`, vẫn mô tả trong prompt.
"""

from __future__ import annotations

import os
import random
import time
from io import BytesIO
from typing import Any

import httpx
from PIL import Image

from media_ai.providers.background.base import NEGATIVE_MAC_DINH, BackgroundRequest, dung_prompt_hau_canh
from media_ai.providers.scene.base import (
    PHONG_CACH_THANH_PROMPT,
    NangLucCanh,
    SceneProviderError,
    SceneRequest,
    SceneResult,
)

API = "https://api.stability.ai/v2beta"
MODEL_CANH = "stable-image-edit-replace-background-and-relight-v2beta"
HUONG_SANG_STABILITY = {"left": "left", "right": "right", "above": "above"}
# Giữ chủ thể ở mức cao nhất API cho phép dò — ALG không muốn bó hoa bị vẽ lại.
GIU_CHU_THE = 0.95
DO_MANH_SANG = 0.3
SEED_TOI_DA = 4_294_967_294
SO_LAN_POLL = 90

_DE_HIEU = {
    401: "Khoá STABILITY_API_KEY sai hoặc đã bị thu hồi",
    402: "Tài khoản Stability hết credit",
    403: "Stability từ chối yêu cầu (kiểm duyệt nội dung hoặc tài khoản bị hạn chế)",
    429: "Stability đang giới hạn tần suất",
}


def _png(anh: Image.Image) -> bytes:
    buf = BytesIO()
    anh.save(buf, format="PNG")
    return buf.getvalue()


class StabilitySceneProvider:
    name = "stability"
    nang_luc = NangLucCanh(
        tach_nen=True, dung_canh=True, tang_net=True, seed=True,
        phong_cach_rieng=False, huong_sang=frozenset(HUONG_SANG_STABILITY), bac_chat_luong=False,
    )

    def __init__(self, api_key: str | None = None, client: httpx.Client | None = None,
                 timeout_s: float = 120.0, khoang_poll_s: float = 2.0) -> None:
        self._api_key = api_key if api_key is not None else os.environ.get("STABILITY_API_KEY")
        self._client = client
        self._timeout_s = timeout_s
        self._khoang = khoang_poll_s

    def co_khoa(self) -> bool:
        return bool(self._api_key)

    # ── HTTP ──────────────────────────────────────────────────────────────
    def _goi(self, method: str, duong: str, **kw: Any) -> httpx.Response:
        if not self._api_key:
            raise SceneProviderError("Thiếu STABILITY_API_KEY")
        client = self._client or httpx.Client(timeout=self._timeout_s)
        try:
            headers = {"Authorization": f"Bearer {self._api_key}", **kw.pop("headers", {})}
            return client.request(method, f"{API}{duong}", headers=headers, **kw)
        except httpx.HTTPError as exc:
            raise SceneProviderError(f"Lỗi mạng khi gọi Stability {duong}: {exc}") from exc
        finally:
            if self._client is None:
                client.close()

    @staticmethod
    def _loi(resp: httpx.Response, duong: str) -> SceneProviderError:
        de_hieu = _DE_HIEU.get(resp.status_code)
        return SceneProviderError(
            f"{de_hieu} (HTTP {resp.status_code})" if de_hieu else f"Stability {duong} trả HTTP {resp.status_code}: {resp.text[:160]}",
            resp.status_code,
        )

    @staticmethod
    def _anh(resp: httpx.Response) -> Image.Image:
        if not resp.headers.get("content-type", "").startswith("image/"):
            raise SceneProviderError(f"Stability trả dữ liệu không phải ảnh ({resp.headers.get('content-type')})")
        try:
            anh = Image.open(BytesIO(resp.content))
            anh.load()
            return anh
        except OSError as exc:
            raise SceneProviderError(f"Ảnh Stability không đọc được: {exc}") from exc

    # ── Cổng ─────────────────────────────────────────────────────────────
    def tach_nen(self, anh: Image.Image) -> Image.Image:
        duong = "/stable-image/edit/remove-background"
        r = self._goi("POST", duong, headers={"Accept": "image/*"},
                      files={"image": ("master.png", _png(anh.convert("RGB")), "image/png")},
                      data={"output_format": "png"})
        if r.status_code != 200:
            raise self._loi(r, duong)
        ra = self._anh(r)
        if ra.mode != "RGBA":
            raise SceneProviderError("Stability remove-background không trả kênh alpha")
        a = ra.getchannel("A")
        return a.resize(anh.size, Image.BILINEAR) if a.size != anh.size else a

    def dung_canh(self, req: SceneRequest) -> SceneResult:
        prompt, bo_qua = dung_prompt_hau_canh(
            BackgroundRequest(
                ratio=req.ratio, rong=req.rong, cao=req.cao, scene_prompt=req.scene_prompt,
                lighting_direction=req.lighting_direction, lighting_mood=req.lighting_mood,
                palette=req.palette, shot=req.shot,
            )
        )
        if req.style in PHONG_CACH_THANH_PROMPT:
            prompt = PHONG_CACH_THANH_PROMPT[req.style] + ". " + prompt
        if req.quality != "standard":
            bo_qua.append("quality")
        seed = req.seed if req.seed is not None else random.randint(0, SEED_TOI_DA)
        seed = max(0, min(int(seed), SEED_TOI_DA))
        tham_so: dict[str, Any] = {
            "background_prompt": prompt,
            "negative_prompt": NEGATIVE_MAC_DINH,
            "preserve_original_subject": str(GIU_CHU_THE),
            "seed": str(seed),
            "output_format": "png",
        }
        huong = HUONG_SANG_STABILITY.get(req.lighting_direction or "")
        if huong:
            tham_so["light_source_direction"] = huong
            tham_so["light_source_strength"] = str(DO_MANH_SANG)
        elif req.lighting_direction:
            bo_qua.append(f"lighting_direction:{req.lighting_direction}")

        duong = "/stable-image/edit/replace-background-and-relight"
        r = self._goi("POST", duong, files={"subject_image": ("subject.png", req.chu_the_png, "image/png")}, data=tham_so)
        if r.status_code != 200:
            raise self._loi(r, duong)
        job_id = (r.json() or {}).get("id")
        if not job_id:
            raise SceneProviderError("Stability không trả id cho Replace Background & Relight")
        for _ in range(SO_LAN_POLL):
            kq = self._goi("GET", f"/results/{job_id}", headers={"Accept": "image/*"})
            if kq.status_code == 202:
                time.sleep(self._khoang)
                continue
            if kq.status_code != 200:
                raise self._loi(kq, "/results")
            anh = self._anh(kq).convert("RGB")
            return SceneResult(anh=anh, prompt=prompt, seed=seed, model_version=MODEL_CANH, bo_qua=bo_qua,
                               tham_so={k: v for k, v in tham_so.items()})
        raise SceneProviderError("Stability Replace Background & Relight quá thời gian chờ")

    def tang_net(self, anh: Image.Image, he_so: int) -> Image.Image:
        duong = "/stable-image/upscale/fast"
        r = self._goi("POST", duong, headers={"Accept": "image/*"},
                      files={"image": ("in.png", _png(anh.convert("RGB")), "image/png")},
                      data={"output_format": "png"})
        if r.status_code != 200:
            raise self._loi(r, duong)
        ra = self._anh(r).convert("RGB")
        return ra.resize((anh.width * he_so, anh.height * he_so), Image.LANCZOS)
