"""Test `shared/job_failure.py` — phân loại lỗi, backoff, tự thử lại (ROADMAP E5.1)."""

from __future__ import annotations

from shared.job_failure import (
    BACKOFF_TOI_DA_GIAY,
    MAX_LAN_THU,
    NEEDS_ACTION,
    RETRYABLE,
    backoff_giay,
    ghi_job_loi,
    phan_loai_loi,
)


class LoiHttp(Exception):
    def __init__(self, status_code: int):
        super().__init__(f"HTTP {status_code}")
        self.status_code = status_code


class RateLimitError(Exception):
    """Cùng tên lớp với SDK openai/anthropic."""


class ConTro:
    """Con trỏ giả: ghi lại câu lệnh, trả trạng thái CSDL quyết định (`RETURNING status`)."""

    def __init__(self, trang_thai: str):
        self.trang_thai = trang_thai
        self.lenh: list[tuple[str, dict]] = []

    def execute(self, sql: str, params: dict) -> None:
        self.lenh.append((" ".join(sql.split()), params))

    def fetchone(self):
        return {"status": self.trang_thai}


def test_phan_loai_loi_tam_thoi():
    for exc in (TimeoutError("hết giờ"), ConnectionResetError(), LoiHttp(503), LoiHttp(429), RateLimitError("chậm lại")):
        assert phan_loai_loi(exc) == RETRYABLE, exc


def test_phan_loai_loi_can_nguoi_xu_ly():
    for exc in (ValueError("ảnh hỏng"), LoiHttp(400), LoiHttp(401), KeyError("thiếu trường")):
        assert phan_loai_loi(exc) == NEEDS_ACTION, exc


def test_phan_loai_theo_nguyen_nhan_goc():
    try:
        try:
            raise TimeoutError("nhà cung cấp không trả lời")
        except TimeoutError as goc:
            raise RuntimeError("tạo biến thể thất bại") from goc
    except RuntimeError as boc:
        assert phan_loai_loi(boc) == RETRYABLE


def test_backoff_nhan_doi_co_tran_va_ngau_nhien():
    assert backoff_giay(1, lambda: 0.0) == 15
    assert backoff_giay(1, lambda: 0.999) < 30
    assert backoff_giay(2, lambda: 0.0) == 30
    assert backoff_giay(10, lambda: 0.999) < BACKOFF_TOI_DA_GIAY


def test_loi_tam_thoi_xin_thu_lai_va_bao_dung_khi_csdl_hen_lai():
    cur = ConTro("PENDING")
    assert ghi_job_loi(cur, "job-1", TimeoutError("x"), ngau_nhien=lambda: 0.0) is True
    sql, p = cur.lenh[-1]
    assert "attempts + 1 < %(max)s" in sql and "RETURNING g.status" in sql
    assert p["thu_lai"] is True and p["max"] == MAX_LAN_THU and p["he_so"] == 0.5 and p["loai"] == RETRYABLE


def test_csdl_bao_het_luot_thi_tra_false():
    assert ghi_job_loi(ConTro("FAILED"), "job-1", TimeoutError("x")) is False


def test_loi_can_nguoi_xu_ly_khong_xin_thu_lai():
    cur = ConTro("FAILED")
    assert ghi_job_loi(cur, "job-1", ValueError("ảnh hỏng")) is False
    p = cur.lenh[-1][1]
    assert p["thu_lai"] is False and p["loai"] == NEEDS_ACTION and p["loi"] == "ảnh hỏng"


def test_tat_thu_lai_cho_luong_co_bang_trang_thai_rieng():
    cur = ConTro("FAILED")
    ghi_job_loi(cur, "job-1", TimeoutError("x"), cho_phep_thu_lai=False)
    assert cur.lenh[-1][1]["thu_lai"] is False
