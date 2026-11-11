"""Tác vụ phụ của worker media (âm thanh, video) chỉ được nhận khi bản cài có mô-đun xử lý.

Bản giao GD1 bỏ `media_ai/audio` và `media_ai/video` (docs/plan/BANGIAO_GD1_PHAM_VI.md §5): worker
không được LISTEN/claim các tác vụ đó, nếu không job bị trừ credit rồi lỗi vì thiếu mô-đun. Test không
import mô-đun âm thanh/video thật để vẫn chạy được trên bản cắt.
"""

import sys
import types
from contextlib import contextmanager
from pathlib import Path

from media_ai.jobs import worker


def _tao_tep(root: Path, module: str) -> None:
    path = root / f"{module.replace('.', '/')}.py"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("")


def test_du_mo_dun_thi_nhan_ca_ba_tac_vu_phu_theo_thu_tu(tmp_path: Path):
    for _, module, _ in worker.OPTIONAL_JOBS:
        _tao_tep(tmp_path, module)
    features = [feature for feature, _, _ in worker.available_optional_jobs(tmp_path)]
    assert features == ["audio.generate", "audio.voice_clone", "video.render"]


def test_ban_cat_thieu_mo_dun_thi_khong_nhan(tmp_path: Path):
    _tao_tep(tmp_path, "media_ai.audio.audio_worker")
    assert [f for f, _, _ in worker.available_optional_jobs(tmp_path)] == ["audio.generate"]
    assert worker.available_optional_jobs(tmp_path / "trong") == []


def test_mac_dinh_doc_dung_thu_muc_workers():
    for feature, module, _ in worker.available_optional_jobs():
        assert (Path(worker.__file__).resolve().parents[2] / f"{module.replace('.', '/')}.py").is_file(), feature


def test_nhan_tac_vu_dau_tien_dang_cho_va_goi_dung_ham(monkeypatch):
    calls = []
    jobs = {"fake.two": {"id": "j1"}}
    fake = types.ModuleType("fake_optional_worker")
    fake.chay = lambda conn, job: calls.append(("run", job["id"]))
    monkeypatch.setitem(sys.modules, "fake_optional_worker", fake)
    monkeypatch.setattr(worker, "claim_next", lambda conn, feature: jobs.get(feature))

    @contextmanager
    def _ctx(conn, job):
        calls.append(("ctx", job["id"]))
        yield

    monkeypatch.setattr(worker, "job_db_context", _ctx)
    optional = [("fake.one", "fake_optional_worker", "chay"), ("fake.two", "fake_optional_worker", "chay")]
    assert worker._claim_optional(object(), optional) is True
    assert calls == [("ctx", "j1"), ("run", "j1")]

    jobs.clear()
    assert worker._claim_optional(object(), optional) is False
