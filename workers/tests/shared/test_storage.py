"""Test cho `workers/shared/storage.py`.

Bug đã sửa: `STORAGE_ENDPOINT` trên production kèm sẵn path bucket (vd.
`https://<tài-khoản>.r2.cloudflarestorage.com/smeos`, xem cấu hình thật trên
Render). `_ky()` từng ghép nguyên văn endpoint đó với `/<bucket>/<key>`,
nhân đôi đoạn bucket trong URL thật ("/smeos/smeos/...") trong khi chữ ký
SigV4 chỉ ký cho "/smeos/...". Kho tương thích S3 (R2) nhận request có path
không khớp chữ ký nên trả 403, dù tệp tồn tại — đúng triệu chứng người dùng
gặp trên màn "Quét ảnh hoa".
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

from shared import storage


def _cfg(endpoint: str) -> dict:
    return {
        "endpoint": endpoint,
        "bucket": "smeos",
        "access": "access-test",
        "secret": "secret-test",
        "region": "auto",
    }


def test_ky_bo_path_trong_endpoint_khong_nhan_doi_bucket():
    """`STORAGE_ENDPOINT` kèm sẵn `/smeos` không được nhân đôi đoạn bucket."""
    cfg = _cfg("https://acct.r2.cloudflarestorage.com/smeos")
    url, headers = storage._ky(cfg, "GET", "/smeos/org/abc/unfiled/x.jpg", storage.SHA256_RONG)

    assert url == "https://acct.r2.cloudflarestorage.com/smeos/org/abc/unfiled/x.jpg"
    assert headers["host"] == "acct.r2.cloudflarestorage.com"


def test_ky_endpoint_khong_path_van_dung_nhu_truoc():
    """Endpoint không có path (dạng phổ biến nhất) vẫn ra URL đúng như cũ."""
    cfg = _cfg("https://acct.r2.cloudflarestorage.com")
    url, _headers = storage._ky(cfg, "GET", "/smeos/org/abc/unfiled/x.jpg", storage.SHA256_RONG)

    assert url == "https://acct.r2.cloudflarestorage.com/smeos/org/abc/unfiled/x.jpg"


def test_doc_bytes_goi_dung_url_khi_endpoint_co_path(tmp_path: Path, monkeypatch):
    """Bài test cấp cao: `doc_bytes` phải gọi `urlopen` với URL không nhân đôi bucket."""
    monkeypatch.setenv("STORAGE_ENDPOINT", "https://acct.r2.cloudflarestorage.com/smeos")
    monkeypatch.setenv("STORAGE_BUCKET", "smeos")
    monkeypatch.setenv("STORAGE_ACCESS_KEY", "access-test")
    monkeypatch.setenv("STORAGE_SECRET_KEY", "secret-test")
    monkeypatch.setenv("STORAGE_REGION", "auto")

    fake_response = MagicMock()
    fake_response.read.return_value = b"\xff\xd8\xff"
    fake_response.__enter__.return_value = fake_response
    fake_response.__exit__.return_value = False

    with patch("shared.storage.urllib.request.urlopen", return_value=fake_response) as urlopen:
        body = storage.doc_bytes("org/abc/unfiled/x.jpg", tmp_path)

    assert body == b"\xff\xd8\xff"
    req = urlopen.call_args[0][0]
    assert req.full_url == "https://acct.r2.cloudflarestorage.com/smeos/org/abc/unfiled/x.jpg"
