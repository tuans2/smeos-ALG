-- =============================================================================
-- Market Intelligence Engine — Lập lịch nghiên cứu tự động qua pg_cron
-- Đợt A (D-MI3).
--
-- Lưu ý múi giờ: Postgres container mặc định chạy UTC.
-- Giờ Việt Nam là Asia/Saigon (UTC+7).
-- =============================================================================

-- Bật extension pg_cron (yêu cầu shared_preload_libraries = 'pg_cron' trong postgresql.conf)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Daily Deep Research: 06:00 giờ VN = 23:00 UTC hôm trước
SELECT cron.schedule(
  'mi-daily-deep',
  '0 23 * * *',
  $$INSERT INTO research_runs (id, run_type, status, created_at)
    VALUES (gen_random_uuid(), 'DAILY_DEEP', 'PENDING', now());
    NOTIFY market_intelligence_research;$$
);

-- 2. Intraday Pulse: mỗi 3 giờ (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC)
SELECT cron.schedule(
  'mi-intraday-pulse',
  '0 */3 * * *',
  $$INSERT INTO research_runs (id, run_type, status, created_at)
    VALUES (gen_random_uuid(), 'INTRADAY_PULSE', 'PENDING', now());
    NOTIFY market_intelligence_research;$$
);

-- 3. Weekly Deep Research: 05:00 Thứ Hai giờ VN = 22:00 Chủ Nhật UTC
SELECT cron.schedule(
  'mi-weekly-deep',
  '0 22 * * 0',
  $$INSERT INTO research_runs (id, run_type, status, created_at)
    VALUES (gen_random_uuid(), 'WEEKLY_DEEP', 'PENDING', now());
    NOTIFY market_intelligence_research;$$
);
