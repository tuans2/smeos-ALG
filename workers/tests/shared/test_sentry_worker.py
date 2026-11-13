"""Test bật Sentry ở worker (ROADMAP E1.5) — không gửi gì ra mạng."""

from __future__ import annotations

import sentry_sdk

import shared.log_json as log_json


def test_khong_co_dsn_thi_khong_bat(monkeypatch):
    monkeypatch.delenv("SENTRY_DSN", raising=False)
    assert log_json.bat_sentry() is False


def test_co_dsn_bat_voi_cau_hinh_khong_gui_du_lieu_khach(monkeypatch):
    goi: dict = {}
    monkeypatch.setenv("SENTRY_DSN", "https://public@example.invalid/1")
    monkeypatch.setattr(sentry_sdk, "init", lambda **kw: goi.update(kw))
    monkeypatch.setattr(log_json, "_sentry_bat", False)

    assert log_json.bat_sentry() is True
    assert goi["send_default_pii"] is False
    assert goi["include_local_variables"] is False
    assert goi["traces_sample_rate"] == 0
    assert goi["before_send"] is log_json.loc_su_kien_sentry
    monkeypatch.setattr(log_json, "_sentry_bat", False)


def test_loc_su_kien_bo_request_user_bien_cuc_bo():
    event = {
        "message": "boom",
        "request": {"data": {"phone": "0900000000"}},
        "user": {"email": "a@example.test"},
        "breadcrumbs": {"values": [{"message": "tên khách"}]},
        "extra": {"payload": "..."},
        "exception": {"values": [{"stacktrace": {"frames": [{"function": "xu_ly", "vars": {"so_dien_thoai": "09"}}]}}]},
    }
    assert log_json.loc_su_kien_sentry(event) == {
        "message": "boom",
        "exception": {"values": [{"stacktrace": {"frames": [{"function": "xu_ly"}]}}]},
    }
