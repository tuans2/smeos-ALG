-- ADR-014 D-P4, bước P-6b: thêm 3 loại dữ liệu vào `retention_policies` (PO 12/11/2026). Chỉ thêm dòng, không đổi
-- lược đồ; `enforce = false` nên job đêm chỉ đếm cho tới khi PO bật từng loại. Chứng từ ghi sổ 10 năm chưa thêm.
BEGIN;
SET LOCAL lock_timeout = '30s';

INSERT INTO "retention_policies" ("category", "retention_months", "action") VALUES
    ('customer_conversations', 3, 'ANONYMIZE'),
    ('customer_profiles', 24, 'ANONYMIZE'),
    ('non_ledger_documents', 60, 'DELETE')
ON CONFLICT ("category") DO NOTHING;

COMMIT;
