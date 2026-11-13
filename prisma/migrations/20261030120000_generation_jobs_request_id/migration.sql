-- ROADMAP E1.1: mã yêu cầu web tạo job, nối log web và worker.
ALTER TABLE "generation_jobs" ADD COLUMN "request_id" TEXT;
