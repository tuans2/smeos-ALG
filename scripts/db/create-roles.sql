-- Tách tài khoản CSDL theo vai trò (ADR-013 D-I1, checklist ALG 1.18). Người vận hành chạy MỘT lần bằng tài khoản
-- chủ sở hữu CSDL, sau đó đặt mật khẩu và chuỗi kết nối cho từng dịch vụ ở Render (không ghi mật khẩu vào kho mã):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/create-roles.sql
--   ALTER ROLE smeos_app PASSWORD '…';  (lặp lại cho từng vai)
-- Chạy lại an toàn: chỉ tạo vai còn thiếu và cấp lại quyền.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['smeos_app', 'smeos_worker', 'smeos_system', 'smeos_readonly'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE', r);
    END IF;
  END LOOP;
END $$;

-- Web và worker: đọc/ghi dữ liệu, không DDL, chịu RLS. Pool web và worker tự đặt app.org_id theo ngữ cảnh.
GRANT USAGE ON SCHEMA public TO smeos_app, smeos_worker, smeos_system, smeos_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO smeos_app, smeos_worker, smeos_system;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO smeos_app, smeos_worker, smeos_system;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO smeos_readonly;

-- Nhật ký bất biến (ADR-013 D-I4): web và worker chỉ thêm dòng. Xoá chỉ qua đường purge (`app.purge_reason`) chạy bằng
-- smeos_system; trigger `smeos_append_only_guard` vẫn chặn mọi tài khoản kể cả khi quyền bị cấp lại nhầm.
REVOKE UPDATE, DELETE ON "audit_logs", "platform_audit_logs", "order_events", "job_events", "usage" FROM smeos_app, smeos_worker;

-- Bảng tạo sau này (migration chạy bằng chủ sở hữu) tự có cùng quyền
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO smeos_app, smeos_worker, smeos_system;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO smeos_app, smeos_worker, smeos_system;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO smeos_readonly;

-- Bộ quét liên tổ chức, script vận hành: bỏ qua RLS. Không dùng cho request của người dùng.
ALTER ROLE smeos_system BYPASSRLS;
-- Báo cáo/BI/điều tra: luôn chặn theo tổ chức — phải đặt app.org_id mới đọc được dữ liệu một tổ chức.
ALTER ROLE smeos_readonly SET app.rls_mode = 'enforce';
