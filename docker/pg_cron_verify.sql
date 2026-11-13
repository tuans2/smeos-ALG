-- Xác minh nhanh pg_cron đã đăng ký đúng 3 lịch Market Intelligence (D-MI3).
-- Chạy sau khi đã CREATE EXTENSION pg_cron và chạy pg_cron_market_intelligence.sql.

-- 1. Xem 3 job đã đăng ký (đúng tên, đúng lịch)
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;

-- 2. Xem múi giờ server (PHẢI là UTC — script lịch đã quy đổi giờ VN -> UTC sẵn)
SHOW timezone;

-- 3. Lịch sử các lần job đã chạy (rỗng nếu job chưa tới giờ chạy lần nào)
SELECT jobid, runid, status, return_message, start_time, end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;

-- 4. Kiểm tra research_runs có hàng PENDING mới sinh tự động không
SELECT id, run_type, status, created_at
FROM research_runs
ORDER BY created_at DESC
LIMIT 10;

-- Nếu muốn test nhanh không đợi tới giờ thật: tạo tạm 1 job chạy mỗi phút,
-- xác nhận research_runs sinh hàng đúng, rồi huỷ job tạm (không đụng 3 job thật).
--
-- SELECT cron.schedule('mi-test-mot-phut', '* * * * *',
--   $$INSERT INTO research_runs (id, run_type, status, created_at)
--     VALUES (gen_random_uuid(), 'MANUAL', 'PENDING', now());
--     NOTIFY market_intelligence_research;$$
-- );
--
-- -- ... đợi 1-2 phút, kiểm tra lại mục 4 ở trên ...
--
-- SELECT cron.unschedule('mi-test-mot-phut');
