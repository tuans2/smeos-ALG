"""Điều phối `process_variant_job` theo LUỒNG (PO 25/09/2026) — không cần Postgres.

- job đám mây (mặc định `relight`) → nhà cung cấp trọn gói, đo perceptual;
- mọi nhà cung cấp lỗi → lùi luồng cục bộ, ghi `cloud_fallback`, đo từng điểm ảnh;
- job cục bộ xin `relight` → ghi `provider_ignored`, chạy `paste`.
"""

from __future__ import annotations

import json
from io import BytesIO

import numpy as np
import pytest
from PIL import Image

from media_ai.jobs import variant_worker as vw
from media_ai.providers.scene.base import NangLucCanh, SceneProviderError, SceneResult


class _Cur:
    def __init__(self, sql: list) -> None:
        self.sql = sql

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def execute(self, q, params=None):
        self.sql.append((q, params))


class _Conn:
    def __init__(self) -> None:
        self.sql: list = []

    def cursor(self, *a, **k):
        return _Cur(self.sql)

    def commit(self):
        pass

    def rollback(self):
        pass


def _png(anh):
    buf = BytesIO()
    anh.save(buf, format="PNG")
    return buf.getvalue()


def _master_va_alpha():
    rng = np.random.default_rng(3)
    arr = np.full((240, 240, 3), 250, dtype=np.uint8)
    a = np.zeros((240, 240), dtype=np.uint8)
    arr[40:200, 60:180] = rng.integers(30, 230, (160, 120, 3), dtype=np.uint8)
    a[40:200, 60:180] = 255
    return Image.fromarray(arr), a


class _Ncc:
    nang_luc = NangLucCanh(True, True, True, True, False, frozenset(), False)

    def __init__(self, alpha, loi=False):
        self.name, self._a, self._loi = "fal", alpha, loi

    def co_khoa(self):
        return True

    def tach_nen(self, anh):
        if anh.size == (240, 240):
            return Image.fromarray(self._a)
        arr = np.asarray(anh.convert("RGB")).astype(np.int16)
        return Image.fromarray(((np.abs(arr - 128).max(axis=2) > 3) * 255).astype(np.uint8))

    def dung_canh(self, req):
        if self._loi:
            raise SceneProviderError("HTTP 402", 402)
        k = Image.open(BytesIO(req.chu_the_png)).convert("RGBA")
        nen = Image.new("RGB", k.size, (128, 128, 128))
        nen.paste(k, (0, 0), k)
        return SceneResult(anh=nen, prompt="p", seed=None, model_version="fal-ai/bria/product-shot", bo_qua=["seed"])

    def tang_net(self, anh, he_so):
        return anh.resize((anh.width * he_so, anh.height * he_so))


@pytest.fixture
def moi_truong(monkeypatch):
    master, a = _master_va_alpha()
    ghi: dict = {"assets": [], "events": [], "stages": []}
    monkeypatch.setattr(vw, "_doc_asset", lambda *_a: {"id": "m-1", "kind": "MASTER", "approval_state": "APPROVED",
                                                      "storage_key": "k", "product_id": "p-1"})
    monkeypatch.setattr(vw, "_doc_thuong_hieu", lambda *_a: (None, None))
    monkeypatch.setattr(vw, "doc_bytes", lambda *_a: _png(master))
    monkeypatch.setattr(vw, "ghi_ai_request", lambda *a, **k: None)
    monkeypatch.setattr(vw, "_emit_event", lambda conn, jid, ev, p: ghi["events"].append((ev, p)))
    monkeypatch.setattr(vw, "_set_stage", lambda conn, jid, st: ghi["stages"].append(st))
    monkeypatch.setattr(vw, "_ghi_asset_bien_the",
                        lambda conn, job, m, item, ratio, preset, do, nguon: ghi["assets"].append((item["key"], dict(nguon))) or "a")
    rgba = master.convert("RGBA")
    rgba.putalpha(Image.fromarray(a))
    monkeypatch.setattr(vw, "_doan_chu_the", lambda *_x, **_k: (rgba, Image.fromarray(a)))
    ghi["alpha"] = a
    return ghi


def _job(feature: str, **payload):
    return {"id": "j-1", "organization_id": "o-1", "user_id": "u-1", "feature": feature, "job_group_id": None,
            "payload": {"master_asset_id": "m-1", "preset": "wedding", "ratio": "9:16", "watermark": False, **payload}}


def _output(conn: _Conn) -> dict:
    q, params = next(x for x in conn.sql if "UPDATE generation_jobs" in x[0] and "COMPLETED" in x[0])
    return {"result": params[0], **json.loads(params[1])}


def test_dam_may_mac_dinh_la_nha_cung_cap_tron_goi(moi_truong, monkeypatch):
    monkeypatch.setattr(vw, "thu_tu_nha_cung_cap", lambda *_a, **_k: [_Ncc(moi_truong["alpha"])])
    conn = _Conn()
    vw.process_variant_job(conn, _job(vw.CLOUD_FEATURE, scene_prompt="table"))
    out = _output(conn)
    assert out["flow"] == "provider_scene" and out["ai_relit"] is True and out["integrity_method"] == "perceptual"
    assert out["result"] in ("SAFE", "WARNING")
    ev = next(p for e, p in moi_truong["events"] if e == "variant_integrity")
    assert ev["method"] == "perceptual" and ev["shape_iou"] is not None
    assert {k for k, _ in moi_truong["assets"]} >= {"styled", "transparent"}
    assert "GENERATING_BACKGROUND" in moi_truong["stages"]


def test_moi_nha_cung_cap_loi_thi_lui_cuc_bo(moi_truong, monkeypatch):
    monkeypatch.setattr(vw, "thu_tu_nha_cung_cap", lambda *_a, **_k: [_Ncc(moi_truong["alpha"], loi=True)])
    conn = _Conn()
    vw.process_variant_job(conn, _job(vw.CLOUD_FEATURE))
    out = _output(conn)
    assert out["cloud_fallback"] is True and "402" in out["cloud_fallback_reason"]
    assert out["integrity_method"] == "pixel_exact" and out["result"] == "SAFE"
    assert out["flow"] == "local_fallback"


def test_cuc_bo_xin_relight_thi_noi_that_va_chay_paste(moi_truong, monkeypatch):
    goi: list = []
    monkeypatch.setattr(vw, "thu_tu_nha_cung_cap", lambda *_a, **_k: goi.append(1) or [])
    conn = _Conn()
    vw.process_variant_job(conn, _job(vw.FEATURE, compose_mode="relight"))
    out = _output(conn)
    assert goi == []  # không gọi nhà cung cấp nào
    assert out["compose_mode"] == "paste" and "compose_mode:relight" in out["provider_ignored"]
    assert out["integrity_method"] == "pixel_exact"


def test_dam_may_paste_van_la_luong_hau_canh_giu_tung_diem_anh(moi_truong, monkeypatch):
    goi: list = []
    monkeypatch.setattr(vw, "thu_tu_nha_cung_cap", lambda *_a, **_k: goi.append(1) or [])
    monkeypatch.setenv("STABILITY_API_KEY", "")
    conn = _Conn()
    vw.process_variant_job(conn, _job(vw.CLOUD_FEATURE, compose_mode="paste"))
    out = _output(conn)
    assert goi == [] and out["integrity_method"] == "pixel_exact"
