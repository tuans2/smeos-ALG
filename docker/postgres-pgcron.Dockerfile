# Postgres 16 + pg_cron — dùng cho Market Intelligence Engine (D-MI3, Đợt A).
#
# Image `postgres:16` gốc không có extension pg_cron. File này build thêm
# gói `postgresql-16-cron` từ kho apt.postgresql.org (đã có sẵn trong image
# gốc, không cần thêm repo mới).
#
# Việc bật extension thật (CREATE EXTENSION pg_cron) và bật
# shared_preload_libraries nằm ở docker-compose.yml (mục `command`), không
# nằm trong Dockerfile này — theo đúng khuyến nghị chính thức của pg_cron
# (image chỉ lo phần "có sẵn nhị phân", cấu hình chạy lúc khởi động).

FROM postgres:16

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-16-cron \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
