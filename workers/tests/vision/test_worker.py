"""Test cho workers/vision/jobs/worker.py — mô phỏng `psycopg.Connection`
bằng đối tượng giả (không có Postgres thật trong sandbox này, port 5432
đóng). Test SQL/logic điều phối (claim_next, process_job, notify_channel_for);
KHÔNG kiểm hành vi thật của SKIP LOCKED/LISTEN dưới tải đồng thời — việc đó
chờ Tony chạy trên máy thật có Postgres, đúng như đã báo trong report P5.
"""

import os

os.environ.setdefault("OPENAI_API_KEY", "test-key-khong-that")

from vision.jobs import worker  # noqa: E402


def _normalize(sql: str) -> str:
    return " ".join(sql.split())


class _FakeCursor:
    def __init__(self, conn, row_factory=None):
        self.conn = conn
        self.row_factory = row_factory

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params=None):
        self.conn.executed.append((_normalize(sql), params))
        return self

    def fetchone(self):
        if self.conn.fetchone_queue:
            return self.conn.fetchone_queue.pop(0)
        return None

    def fetchall(self):
        if self.conn.fetchall_queue:
            return self.conn.fetchall_queue.pop(0)
        return []


class _FakeTransaction:
    def __init__(self, conn):
        self.conn = conn

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeConnection:
    def __init__(self, fetchone_queue=None, fetchall_queue=None):
        self.executed: list[tuple[str, object]] = []
        self.fetchone_queue = list(fetchone_queue or [])
        self.fetchall_queue = list(fetchall_queue or [])
        self.committed = 0
        self.rolled_back = 0

    def cursor(self, row_factory=None):
        return _FakeCursor(self, row_factory=row_factory)

    def transaction(self):
        return _FakeTransaction(self)

    def commit(self):
        self.committed += 1

    def rollback(self):
        self.rolled_back += 1

    def sql_containing(self, needle: str):
        return [s for s, _p in self.executed if needle in s]


class FakeProvider:
    """Giả `OpenAIStructuredProvider` — không gọi OpenAI thật."""

    name = "fake_provider"
    model_version = "fake-v0"

    def __init__(self, result=None, raise_exc=None):
        self._result = result if result is not None else {"confidence": 85}
        self._raise_exc = raise_exc
        self.calls = []

    def analyze(self, image_bytes, context):
        self.calls.append((image_bytes, context))
        if self._raise_exc:
            raise self._raise_exc
        return self._result


def test_notify_channel_for_khop_voi_ban_mirror_ts():
    # phải khớp `notifyChannelFor` phía TS (postgres-queue-provider.ts):
    # "alg_job_" + tên feature, ký tự không phải chữ/số/_ đổi thành "_" (kênh cũ "floraos_job_" vẫn nghe)
    assert worker.notify_channel_for("vision.analyze") == "alg_job_vision_analyze"
    assert worker.notify_channel_for("a-b c") == "alg_job_a_b_c"
    assert worker.legacy_notify_channel_for("vision.analyze") == "floraos_job_vision_analyze"


class TestClaimNext:
    def test_khong_co_job_tra_none(self):
        conn = FakeConnection(fetchone_queue=[])
        assert worker.claim_next(conn, "vision.analyze") is None
        assert conn.sql_containing("UPDATE generation_jobs SET status = 'PROCESSING'") == []

    def test_co_job_thi_khoa_va_tra_ve(self):
        job_row = {"id": "job-1", "organization_id": "org-1", "feature": "vision.analyze"}
        conn = FakeConnection(fetchone_queue=[job_row])
        job = worker.claim_next(conn, "vision.analyze")
        assert job == job_row
        updates = conn.sql_containing("UPDATE generation_jobs SET status = 'PROCESSING'")
        assert len(updates) == 1
        # UPDATE phải khóa đúng job vừa SELECT (bằng id), không suy từ nơi khác
        matching = [p for sql, p in conn.executed if "PROCESSING" in sql]
        assert matching[0] == ("job-1",)

    def test_select_loc_theo_feature_va_status_pending(self):
        conn = FakeConnection(fetchone_queue=[None])
        worker.claim_next(conn, "vision.analyze")
        selects = conn.sql_containing("SELECT * FROM generation_jobs")
        assert len(selects) == 1
        assert "status = 'PENDING'" in selects[0]
        assert "FOR UPDATE SKIP LOCKED" in selects[0]


class TestProcessJob:
    def _job(self, asset_ids=("asset-1",), product_id=None):
        return {
            "id": "job-1",
            "organization_id": "org-1",
            "payload": {"asset_ids": list(asset_ids), "product_id": product_id},
        }

    def test_thanh_cong_ket_qua_ok_khi_confidence_cao(self, monkeypatch):
        monkeypatch.setattr(worker, "_read_asset_bytes", lambda key: b"anh-gia")
        conn = FakeConnection(fetchone_queue=[("storage-key-1",)])
        provider = FakeProvider(result={"confidence": 85})

        worker.process_job(conn, self._job(), provider)

        completed = conn.sql_containing("SET status = 'COMPLETED'")
        assert len(completed) == 1
        params = [p for sql, p in conn.executed if "COMPLETED" in sql][0]
        assert params[0] == "OK"
        inserts = conn.sql_containing("INSERT INTO product_analyses")
        assert len(inserts) == 1
        assert conn.rolled_back == 0

    def test_ket_qua_low_confidence_khi_duoi_nguong(self, monkeypatch):
        monkeypatch.setattr(worker, "_read_asset_bytes", lambda key: b"anh-gia")
        conn = FakeConnection(fetchone_queue=[("storage-key-1",)])
        provider = FakeProvider(result={"confidence": 40})

        worker.process_job(conn, self._job(), provider)

        params = [p for sql, p in conn.executed if "COMPLETED" in sql][0]
        assert params[0] == "LOW_CONFIDENCE"

    def test_loi_ky_thuat_thi_failed_va_khong_ghi_ket_qua_nao(self, monkeypatch):
        monkeypatch.setattr(worker, "_read_asset_bytes", lambda key: b"anh-gia")
        conn = FakeConnection(fetchone_queue=[("storage-key-1",)])
        provider = FakeProvider(raise_exc=RuntimeError("OpenAI lỗi giả lập"))

        worker.process_job(conn, self._job(), provider)

        failed = conn.sql_containing("failure_kind = %(loai)s")
        assert len(failed) == 1
        # Ảnh duy nhất của lô lỗi ngay nên không có kết quả nào để giữ lại.
        assert conn.sql_containing("INSERT INTO product_analyses") == []
        # Không `rollback()`: kết nối chạy autocommit nên lệnh đó không lấy
        # lại được gì, và những ảnh đã xong trước ảnh lỗi là kết quả thật.
        assert conn.rolled_back == 0

    def test_lo_hong_giua_chung_giu_lai_ket_qua_cac_anh_da_xong(self, monkeypatch):
        """Ba ảnh, ảnh thứ hai lỗi: ảnh đầu đã ghi xong thì giữ nguyên."""
        monkeypatch.setattr(worker, "_read_asset_bytes", lambda key: b"anh-gia")
        conn = FakeConnection(
            fetchone_queue=[("storage-key-1",), ("storage-key-2",), ("storage-key-3",)]
        )

        class _HongOAnhThuHai(FakeProvider):
            def analyze(self, image, context):
                self.calls.append((image, context))
                if len(self.calls) == 2:
                    raise RuntimeError("nhà cung cấp lỗi ở ảnh thứ hai")
                return {"confidence": 90}

        provider = _HongOAnhThuHai(result={"confidence": 90})
        worker.process_job(conn, self._job(asset_ids=("a1", "a2", "a3")), provider)

        assert len(conn.sql_containing("INSERT INTO product_analyses")) == 1
        assert conn.sql_containing("failure_kind = %(loai)s")
        assert conn.sql_containing("SET status = 'COMPLETED'") == []

    def test_chay_lai_bo_qua_anh_da_co_ket_qua(self, monkeypatch):
        """`POST /jobs/:id/retry` không được gọi lại nhà cung cấp cho ảnh cũ."""
        monkeypatch.setattr(worker, "_read_asset_bytes", lambda key: b"anh-gia")
        conn = FakeConnection(
            fetchone_queue=[("storage-key-2",)],
            fetchall_queue=[[("a1",)]],  # a1 đã phân tích xong ở lượt trước
        )
        provider = FakeProvider(result={"confidence": 88})

        worker.process_job(conn, self._job(asset_ids=("a1", "a2")), provider)

        assert [ctx["asset_id"] for _img, ctx in provider.calls] == ["a2"]
        assert len(conn.sql_containing("INSERT INTO product_analyses")) == 1
        assert conn.sql_containing("SET status = 'COMPLETED'")

    def test_insert_ket_qua_chong_ghi_trung(self):
        """Ràng buộc `@@unique([job_id, asset_id])` là thứ worker dựa vào."""
        conn = FakeConnection(fetchone_queue=[("storage-key-1",)])
        worker._insert_analysis(
            conn,
            {"id": "job-1", "organization_id": "org-1"},
            "a1",
            None,
            FakeProvider(),
            {"confidence": 90},
        )
        insert = conn.sql_containing("INSERT INTO product_analyses")[0]
        assert "ON CONFLICT (job_id, asset_id) DO NOTHING" in insert

    def test_storage_key_leo_ra_ngoai_kho_bi_chan(self):
        import pytest as _pytest

        with _pytest.raises(ValueError):
            worker._read_asset_bytes("../../../etc/passwd")

    def test_asset_khong_thuoc_to_chuc_thi_that_bai_khong_lo_du_lieu_cheo(self, monkeypatch):
        # _asset_storage_key trả None (không tìm thấy vì sai organization_id)
        # -> LookupError -> process_job bắt và đánh dấu FAILED, không rò rỉ
        # dữ liệu chéo tổ chức (luật 1).
        monkeypatch.setattr(worker, "_read_asset_bytes", lambda key: b"anh-gia")
        conn = FakeConnection(fetchone_queue=[None])
        provider = FakeProvider()

        worker.process_job(conn, self._job(), provider)

        assert conn.sql_containing("failure_kind = %(loai)s")
        assert provider.calls == []  # chưa từng gọi provider vì asset bị chặn trước

    def test_process_job_nganh_fashion(self, monkeypatch):
        monkeypatch.setattr(worker, "_read_asset_bytes", lambda key: b"anh-gia")
        conn = FakeConnection(fetchone_queue=[("storage-key-1",)])
        provider = FakeProvider(result={"confidence": 92})

        job = {
            "id": "job-fashion-1",
            "organization_id": "org-fashion",
            "payload": {
                "asset_ids": ["asset-f1"],
                "product_id": "prod-f1",
                "industry": "FASHION",
            },
        }

        worker.process_job(conn, job, provider)

        # Context passed to provider has industry
        assert len(provider.calls) == 1
        _img, ctx = provider.calls[0]
        assert ctx["industry"] == "FASHION"

        # Analysis insert has contract_name PhanTichSanPham_Fashion
        insert_params = [
            p for sql, p in conn.executed if "INSERT INTO product_analyses" in sql
        ][0]
        assert insert_params["contract_name"] == "PhanTichSanPham_Fashion"
