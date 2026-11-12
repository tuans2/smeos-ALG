-- Tách tài khoản CSDL theo vai trò (ADR-013 D-I1, checklist ALG 1.18). Người vận hành chạy MỘT lần bằng tài khoản
-- chủ sở hữu CSDL, sau đó đặt mật khẩu và chuỗi kết nối cho từng dịch vụ ở Render (không ghi mật khẩu vào kho mã):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/create-roles.sql
--   ALTER ROLE alg_app PASSWORD '…';  (lặp lại cho từng vai)
-- Chạy lại an toàn: chỉ tạo vai còn thiếu và cấp lại quyền.
-- Tên vai đổi từ smeos_* sang alg_* ngày 12/11/2026. CSDL đã có vai smeos_*: chạy scripts/db/rename-roles-to-alg.sql TRƯỚC (nếu không, tệp này tạo thêm vai alg_* mới bên cạnh vai cũ); sau đó chạy lại tệp này vẫn an toàn.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['alg_app', 'alg_worker', 'alg_system', 'alg_readonly'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE', r);
    END IF;
  END LOOP;
END $$;

-- Web và worker: đọc/ghi dữ liệu, không DDL, chịu RLS. Pool web và worker tự đặt app.org_id theo ngữ cảnh.
GRANT USAGE ON SCHEMA public TO alg_app, alg_worker, alg_system, alg_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO alg_app, alg_worker, alg_system;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO alg_app, alg_worker, alg_system;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO alg_readonly;

-- Nhật ký bất biến (ADR-013 D-I4): web và worker chỉ thêm dòng. Xoá chỉ qua đường purge (`app.purge_reason`) chạy bằng
-- alg_system; trigger `alg_append_only_guard` vẫn chặn mọi tài khoản kể cả khi quyền bị cấp lại nhầm.
REVOKE UPDATE, DELETE ON "audit_logs", "platform_audit_logs", "order_events", "job_events", "usage" FROM alg_app, alg_worker;

-- Bảng tạo sau này (migration chạy bằng chủ sở hữu) tự có cùng quyền
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO alg_app, alg_worker, alg_system;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO alg_app, alg_worker, alg_system;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO alg_readonly;

-- Bộ quét liên tổ chức, script vận hành: bỏ qua RLS. Không dùng cho request của người dùng.
ALTER ROLE alg_system BYPASSRLS;
-- Báo cáo/BI/điều tra: luôn chặn theo tổ chức — phải đặt app.org_id mới đọc được dữ liệu một tổ chức.
ALTER ROLE alg_readonly SET app.rls_mode = 'enforce';

-- Giới hạn truy vấn theo tài khoản (ADR-015 D-O5, bước O-8): request người dùng không giữ kết nối quá lâu; giao dịch bỏ
-- ngỏ bị cắt. Thao tác dài có chủ đích (xoá / nhập / khôi phục một tổ chức) tự đặt `SET LOCAL statement_timeout` riêng
-- trong giao dịch của nó. Có hiệu lực từ phiên kết nối mới (khởi động lại dịch vụ sau khi chạy).
ALTER ROLE alg_app SET statement_timeout = '15s';
ALTER ROLE alg_worker SET statement_timeout = '120s';
ALTER ROLE alg_system SET statement_timeout = '120s';
ALTER ROLE alg_readonly SET statement_timeout = '120s';
ALTER ROLE alg_app SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE alg_worker SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE alg_system SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE alg_readonly SET idle_in_transaction_session_timeout = '60s';
