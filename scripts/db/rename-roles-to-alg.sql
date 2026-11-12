-- Đổi tên vai CSDL smeos_* → alg_* (đổi thương hiệu ALG, 12/11/2026). Người vận hành chạy MỘT lần trên CSDL
-- đã có vai smeos_* (đã từng chạy create-roles.sql), bằng tài khoản có quyền CREATEROLE:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/rename-roles-to-alg.sql
--
-- ALTER ROLE … RENAME giữ nguyên mọi quyền đã cấp, BYPASSRLS, `app.rls_mode` và quyền mặc định; chính sách RLS không
-- tham chiếu tên vai nên không cần sửa. Lưu ý:
--   1. Chuỗi kết nối của dịch vụ đang dùng `smeos_*` sẽ ĐĂNG NHẬP HỎNG ngay sau khi chạy — đổi user trong
--      DATABASE_URL (web, worker, cron) sang `alg_*` cùng lúc, rồi khởi động lại dịch vụ (xem OPERATIONS_RUNBOOK).
--   2. Mật khẩu kiểu MD5 bị Postgres XOÁ khi đổi tên (MD5 dùng tên vai làm salt); SCRAM (mặc định từ PG 14) giữ nguyên.
--      Script báo vai nào đang dùng MD5 — đặt lại mật khẩu cho vai đó: ALTER ROLE alg_app PASSWORD '…';
-- Chạy lại an toàn: vai đã đổi tên thì bỏ qua.
DO $$
DECLARE
  r text;
  md5 boolean;
BEGIN
  FOREACH r IN ARRAY ARRAY['app', 'worker', 'system', 'readonly'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'smeos_' || r) THEN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alg_' || r) THEN
        RAISE EXCEPTION 'Đã có cả smeos_% và alg_% — xử lý tay trước khi đổi tên', r, r;
      END IF;
      SELECT coalesce(rolpassword LIKE 'md5%', false) INTO md5 FROM pg_authid WHERE rolname = 'smeos_' || r;
      EXECUTE format('ALTER ROLE %I RENAME TO %I', 'smeos_' || r, 'alg_' || r);
      IF md5 THEN
        RAISE NOTICE 'alg_%: mật khẩu MD5 đã bị xoá khi đổi tên — đặt lại bằng ALTER ROLE alg_% PASSWORD ...', r, r;
      ELSE
        RAISE NOTICE 'smeos_% → alg_% (mật khẩu giữ nguyên)', r, r;
      END IF;
    ELSE
      RAISE NOTICE 'Không có smeos_% — bỏ qua', r;
    END IF;
  END LOOP;
END $$;
