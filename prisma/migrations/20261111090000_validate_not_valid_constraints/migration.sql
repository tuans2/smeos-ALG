-- Dọn khoá NOT VALID còn sót sau đợt hoàn thiện CSDL (kế hoạch GĐ1, VAN_HANH_CAP_NHAT_CSDL.md §7).
-- Các migration 20261105160000 / 190000 / 200000 và 20261108000000 thêm khoá NOT VALID rồi tự VALIDATE khi dữ liệu
-- sạch; khoá nào vướng dòng cũ sai thì còn NOT VALID. Dữ liệu có thể đã được sửa từ đó: thử VALIDATE lại từng khoá.
-- Khoá còn dòng sai (hoặc bảng đang bận quá lock_timeout) giữ nguyên NOT VALID và báo NOTICE — không sửa, không xoá
-- dòng nào. Người vận hành xem số dòng bằng `npm run db:not-valid`, dọn tay rồi `npm run db:not-valid -- --validate`.
-- VALIDATE CONSTRAINT chỉ giữ khoá SHARE UPDATE EXCLUSIVE: đọc/ghi dòng vẫn chạy trong lúc kiểm.
BEGIN;
SET LOCAL lock_timeout = '30s';

DO $$
DECLARE
  r record;
  remaining integer := 0;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, c.conname
    FROM pg_constraint c
    WHERE NOT c.convalidated AND c.contype IN ('f', 'c') AND c.connamespace = 'public'::regnamespace
    ORDER BY c.conrelid::regclass::text, c.conname
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %I', r.tbl, r.conname);
    EXCEPTION WHEN foreign_key_violation OR check_violation OR lock_not_available THEN
      remaining := remaining + 1;
      RAISE NOTICE 'Khoá % trên % còn NOT VALID (%) — xem npm run db:not-valid', r.conname, r.tbl, SQLERRM;
    END;
  END LOOP;
  IF remaining > 0 THEN
    RAISE NOTICE 'Còn % khoá NOT VALID — dọn dòng sai rồi chạy npm run db:not-valid -- --validate', remaining;
  END IF;
END $$;

COMMIT;
