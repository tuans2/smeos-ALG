"""Kho tệp dùng chung cho mọi worker Python.

Đối xứng với `getStorageProvider()` phía TypeScript: bốn biến môi trường đủ
giá trị thì đọc/ghi qua kho tương thích S3 (S3, R2, MinIO), thiếu bất kỳ
biến nào thì rơi về `var/storage` trên đĩa của chính tiến trình.

Hai bên PHẢI quyết định giống nhau. Web ghi lên R2 còn worker đọc trên đĩa
là mọi job hỏng với "không tìm thấy tệp", và ngược lại là ảnh nằm lại một
máy mà giao diện không mở được. Tên bốn biến vì vậy chép nguyên văn từ
`.env.example`, không đặt tên khác.

Ký AWS SigV4 bằng thư viện chuẩn — không thêm phụ thuộc nào vào
`requirements.txt`, cùng lý do như bản TypeScript.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

THUAT_TOAN = "AWS4-HMAC-SHA256"
SHA256_RONG = hashlib.sha256(b"").hexdigest()


def _cau_hinh() -> dict | None:
    endpoint = (os.environ.get("STORAGE_ENDPOINT") or "").strip()
    bucket = (os.environ.get("STORAGE_BUCKET") or "").strip()
    access = (os.environ.get("STORAGE_ACCESS_KEY") or "").strip()
    secret = (os.environ.get("STORAGE_SECRET_KEY") or "").strip()
    if not (endpoint and bucket and access and secret):
        return None
    return {
        "endpoint": endpoint,
        "bucket": bucket,
        "access": access,
        "secret": secret,
        "region": (os.environ.get("STORAGE_REGION") or "auto").strip(),
    }


def dang_dung_kho_dung_chung() -> bool:
    return _cau_hinh() is not None


def _ma_hoa(value: str) -> str:
    return urllib.parse.quote(value, safe="~_.-")


def _ma_hoa_duong_dan(path: str) -> str:
    return "/".join(_ma_hoa(p) for p in path.split("/"))


def _khoa_ky(secret: str, ngay: str, region: str, service: str) -> bytes:
    k = hmac.new(f"AWS4{secret}".encode(), ngay.encode(), hashlib.sha256).digest()
    k = hmac.new(k, region.encode(), hashlib.sha256).digest()
    k = hmac.new(k, service.encode(), hashlib.sha256).digest()
    return hmac.new(k, b"aws4_request", hashlib.sha256).digest()


def _ky(cfg: dict, method: str, canonical_uri: str, payload_hash: str) -> tuple[str, dict]:
    # Chỉ lấy scheme + host từ STORAGE_ENDPOINT, bỏ mọi path đi kèm (vd.
    # endpoint đã có sẵn "/<bucket>"). Đối xứng với `S3StorageProvider` phía
    # TypeScript, dùng `new URL(endpoint).host` — ghép nguyên endpoint (có
    # path) với canonical_uri sẽ nhân đôi đoạn bucket trong URL thật, lệch
    # với chữ ký đã ký cho canonical_uri, và kho trả 403 dù key tồn tại.
    diem_cuoi = urllib.parse.urlparse(cfg["endpoint"])
    host = diem_cuoi.netloc
    now = datetime.now(timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    ngay = amz_date[:8]
    pham_vi = f"{ngay}/{cfg['region']}/s3/aws4_request"

    headers = {
        "host": host,
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": amz_date,
    }
    ten = sorted(headers)
    canonical_headers = "".join(f"{k}:{headers[k].strip()}\n" for k in ten)
    signed_headers = ";".join(ten)

    canonical = "\n".join(
        [method, canonical_uri, "", canonical_headers, signed_headers, payload_hash]
    )
    string_to_sign = "\n".join(
        [THUAT_TOAN, amz_date, pham_vi, hashlib.sha256(canonical.encode()).hexdigest()]
    )
    signature = hmac.new(
        _khoa_ky(cfg["secret"], ngay, cfg["region"], "s3"),
        string_to_sign.encode(),
        hashlib.sha256,
    ).hexdigest()

    headers["Authorization"] = (
        f"{THUAT_TOAN} Credential={cfg['access']}/{pham_vi}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )
    return f"{diem_cuoi.scheme}://{host}{canonical_uri}", headers


def _duong_dan_s3(cfg: dict, storage_key: str) -> str:
    return f"/{_ma_hoa_duong_dan(cfg['bucket'])}/{_ma_hoa_duong_dan(storage_key)}"


def _duong_dan_dia(goc: Path, storage_key: str) -> Path:
    """Rào chống `..`. Giữ nguyên ở cả hai đường: một `storage_key` giả mạo
    trong bảng phải bị chặn dù kho nào đang chạy."""
    goc = goc.resolve()
    path = (goc / storage_key).resolve()
    if path != goc and goc not in path.parents:
        raise ValueError(f"storage_key nằm ngoài kho: {storage_key}")
    return path


def doc_bytes(storage_key: str, goc_dia: Path) -> bytes:
    cfg = _cau_hinh()
    if cfg is None:
        return _duong_dan_dia(goc_dia, storage_key).read_bytes()

    _duong_dan_dia(goc_dia, storage_key)  # cùng một rào, chạy trước khi ra mạng
    url, headers = _ky(cfg, "GET", _duong_dan_s3(cfg, storage_key), SHA256_RONG)
    req = urllib.request.Request(url, method="GET", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return res.read()
    except urllib.error.HTTPError as exc:
        raise RuntimeError(
            f"Kho tệp từ chối đọc {storage_key}: {exc.code} {exc.reason}"
        ) from exc


def ghi_bytes(storage_key: str, body: bytes, content_type: str, goc_dia: Path) -> None:
    cfg = _cau_hinh()
    if cfg is None:
        path = _duong_dan_dia(goc_dia, storage_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)
        return

    _duong_dan_dia(goc_dia, storage_key)
    payload_hash = hashlib.sha256(body).hexdigest()
    url, headers = _ky(cfg, "PUT", _duong_dan_s3(cfg, storage_key), payload_hash)
    headers["Content-Type"] = content_type
    req = urllib.request.Request(url, data=body, method="PUT", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120):
            return
    except urllib.error.HTTPError as exc:
        raise RuntimeError(
            f"Kho tệp từ chối ghi {storage_key}: {exc.code} {exc.reason}"
        ) from exc
