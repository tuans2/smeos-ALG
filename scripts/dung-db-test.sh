#!/usr/bin/env bash
#
# Dựng cơ sở dữ liệu RIÊNG cho `npm run test:tenant` — trả nợ #46.
#
# Bộ test cách ly `TRUNCATE` 22 bảng trước mỗi ca thử. Việc đó đúng (bộ test
# phải bắt đầu từ CSDL rỗng), nhưng trước ngày 09/10 nó chạy trên CHÍNH
# database phát triển, nên mỗi lần chạy cổng bắt buộc là mất sạch dữ liệu
# AVI GIFT. Đã mất thật hai lần trong một tối.
#
# Chạy một lần sau `docker compose up -d`, rồi quên nó đi.
set -euo pipefail

URL_TEST="${DATABASE_URL_TEST:-postgresql://alg:alg@localhost:5433/alg_test}"

# Cắt query string rồi lấy phần sau dấu "/" cuối — tên database.
KHONG_QUERY="${URL_TEST%%\?*}"
TEN_DB="${KHONG_QUERY##*/}"

case "$TEN_DB" in
  *_test) ;;
  *)
    echo "Tên database phải kết thúc bằng _test, đang là: $TEN_DB" >&2
    echo "Đó là chốt chặn của tests/helpers/database.ts — đừng lách nó." >&2
    exit 1
    ;;
esac

if docker compose exec -T db psql -U alg -d postgres -tAc \
     "SELECT 1 FROM pg_database WHERE datname='$TEN_DB'" | grep -q 1; then
  echo "Database $TEN_DB đã có."
else
  docker compose exec -T db psql -U alg -d postgres -c "CREATE DATABASE \"$TEN_DB\""
  echo "Đã tạo database $TEN_DB."
fi

# Đẩy lược đồ. `--accept-data-loss` an toàn ở ĐÂY và chỉ ở đây: database này
# tồn tại để bị xoá sạch trước mỗi ca thử, không giữ dữ liệu của ai.
#
# KHÔNG có `--skip-generate`: Prisma 7 bỏ cờ đó. Truyền vào thì CLI in trang
# trợ giúp và không đẩy gì cả — database được tạo nhưng RỖNG, và lỗi chỉ lộ ra
# ở `npm run test:tenant` dưới dạng `relation "integration_tokens" does not
# exist`. Gặp thật 09/10.
DATABASE_URL="$URL_TEST" npx prisma db push --accept-data-loss

# Nghiệm thu tại chỗ: một bảng có thật thì mới coi là xong. Không tin mã thoát
# của lệnh trên một mình — chính cờ sai ở trên đã từng "thành công" mà không
# tạo bảng nào.
# Cột mới nhất (24/09/2026 khuya): `campaign_packages.video_job_ids` — DB test cũ
# thiếu cột thì route gói trả 500. `tests/helpers/database.ts` còn so đủ mọi cột.
# Kiểm cả bảng MỚI NHẤT, không chỉ bảng cũ: DB test dựng trước migration
# `campaign_packages` (23/09) vẫn qua được kiểm `integration_tokens` (24/09/2026).
if ! docker compose exec -T db psql -U alg -d "$TEN_DB" -tAc \
       "SELECT to_regclass('public.integration_tokens'), to_regclass('public.campaign_packages'), to_regclass('public.voice_clones')" \
     | grep -q "integration_tokens|campaign_packages|voice_clones"; then
  echo "" >&2
  echo "ĐẨY LƯỢC ĐỒ HỎNG: database $TEN_DB vẫn chưa có bảng. Xem lỗi phía trên." >&2
  exit 1
fi

echo ""
echo "Xong. npm run test:tenant từ giờ chạy trên $TEN_DB, không đụng dữ liệu phát triển."
