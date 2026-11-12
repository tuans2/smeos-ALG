-- ADR-015 D-O6, bước O-10: dọn `generation_jobs` đã xong / lỗi / huỷ quá 30 ngày qua job hạn lưu (ADR-014 D-P4). Chỉ
-- thêm một dòng `retention_policies`, `enforce = false` — job đêm chỉ đếm cho tới khi PO bật. Không đổi lược đồ.
BEGIN;
SET LOCAL lock_timeout = '30s';

INSERT INTO "retention_policies" ("category", "retention_months", "action") VALUES
    ('finished_jobs', 1, 'DELETE')
ON CONFLICT ("category") DO NOTHING;

COMMIT;
