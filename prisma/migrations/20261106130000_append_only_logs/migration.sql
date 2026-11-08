-- ADR-013 D-I4, bước I-2a: nhật ký bất biến. `audit_logs`, `platform_audit_logs`, `order_events`, `job_events`, `usage`
-- chỉ được THÊM dòng: mọi UPDATE bị từ chối; DELETE (kể cả xoá dây chuyền từ `orders` / `generation_jobs`) chỉ được khi
-- giao dịch đã đặt `app.purge_reason` (`SELECT set_config('app.purge_reason', '<lý do>', true)` — chỉ trong giao dịch,
-- an toàn với pool). Đường purge: quy trình rời nền tảng của tenant và hạn lưu (ADR-014/016). Trigger chặn MỌI tài
-- khoản, kể cả chủ sở hữu; quyền UPDATE/DELETE của `smeos_app`/`smeos_worker` thu hồi ở `scripts/db/create-roles.sql`.
-- TRUNCATE không qua trigger theo dòng (chỉ dùng ở CSDL test). Không đổi schema Prisma; không đổi dữ liệu.
BEGIN;
SET LOCAL lock_timeout = '30s';

CREATE OR REPLACE FUNCTION smeos_append_only_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Nhật ký % chỉ được thêm dòng, không sửa (ADR-013 D-I4)', TG_TABLE_NAME
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF coalesce(current_setting('app.purge_reason', true), '') = '' THEN
    RAISE EXCEPTION 'Xoá nhật ký % cần app.purge_reason trong giao dịch (ADR-013 D-I4)', TG_TABLE_NAME
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER "audit_logs_append_only" BEFORE UPDATE OR DELETE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION smeos_append_only_guard();

CREATE TRIGGER "platform_audit_logs_append_only" BEFORE UPDATE OR DELETE ON "platform_audit_logs"
FOR EACH ROW EXECUTE FUNCTION smeos_append_only_guard();

CREATE TRIGGER "order_events_append_only" BEFORE UPDATE OR DELETE ON "order_events"
FOR EACH ROW EXECUTE FUNCTION smeos_append_only_guard();

CREATE TRIGGER "job_events_append_only" BEFORE UPDATE OR DELETE ON "job_events"
FOR EACH ROW EXECUTE FUNCTION smeos_append_only_guard();

CREATE TRIGGER "usage_append_only" BEFORE UPDATE OR DELETE ON "usage"
FOR EACH ROW EXECUTE FUNCTION smeos_append_only_guard();

COMMIT;
