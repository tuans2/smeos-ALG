"""`LOG_LEVEL` của worker: để trống (mẫu .env.example) thì dùng INFO, không làm worker dừng lúc khởi động."""

from __future__ import annotations

import logging

import pytest

import shared.log_json as log_json


@pytest.fixture(autouse=True)
def _giu_root_logger(monkeypatch):
    root = logging.getLogger()
    cu = (root.level, root.handlers[:])
    monkeypatch.delenv("SENTRY_DSN", raising=False)
    yield
    root.setLevel(cu[0])
    root.handlers[:] = cu[1]


@pytest.mark.parametrize("gia_tri", [None, "", "  "])
def test_de_trong_thi_dung_info(monkeypatch, gia_tri):
    if gia_tri is None:
        monkeypatch.delenv("LOG_LEVEL", raising=False)
    else:
        monkeypatch.setenv("LOG_LEVEL", gia_tri)
    log_json.cau_hinh_log()
    assert logging.getLogger().level == logging.INFO


def test_nhan_ca_chu_thuong(monkeypatch):
    monkeypatch.setenv("LOG_LEVEL", "debug")
    log_json.cau_hinh_log()
    assert logging.getLogger().level == logging.DEBUG
