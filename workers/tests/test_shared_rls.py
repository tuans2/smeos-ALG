"""Checklist ALG 1.18 — worker đặt ngữ cảnh tổ chức cho RLS theo dòng job."""

from shared.rls import job_db_context, set_db_context


class _Conn:
    def __init__(self) -> None:
        self.calls: list[tuple] = []

    def execute(self, sql: str, params: tuple) -> None:
        self.calls.append(params)


def test_tat_rls_khong_dat_gi(monkeypatch):
    monkeypatch.delenv("DB_RLS_MODE", raising=False)
    conn = _Conn()
    set_db_context(conn, "org-a")
    assert conn.calls == []


def test_job_chay_trong_to_chuc_cua_job_xong_tra_ve_he_thong(monkeypatch):
    monkeypatch.setenv("DB_RLS_MODE", "enforce")
    conn = _Conn()
    with job_db_context(conn, {"id": "j1", "organization_id": "org-a"}):
        assert conn.calls[-1] == ("org-a", "", "enforce")
    assert conn.calls[-1] == ("", "on", "enforce")


def test_loi_trong_job_van_tra_ve_he_thong(monkeypatch):
    monkeypatch.setenv("DB_RLS_MODE", "audit")
    conn = _Conn()
    try:
        with job_db_context(conn, {"organization_id": "org-b"}):
            raise RuntimeError("hỏng")
    except RuntimeError:
        pass
    assert conn.calls == [("org-b", "", "audit"), ("", "on", "audit")]
