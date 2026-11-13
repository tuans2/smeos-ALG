import { existsSync } from "node:fs"

import { defineConfig, env } from "prisma/config"

// Prisma 7 không tự đọc `.env` nữa. Nạp tại chỗ khi tệp có mặt; trên CI biến
// đã nằm sẵn trong môi trường nên không có tệp và cũng không cần.
if (existsSync(".env")) process.loadEnvFile(".env")


/**
 * Cấu hình cho Prisma CLI (generate · db push · migrate · seed).
 *
 * Prisma 7 không còn nhận `url` trong `schema.prisma`. Chuỗi kết nối chỉ tồn
 * tại ở hai chỗ: tệp này cho lệnh dòng lệnh, và driver adapter cho
 * `PrismaClient` lúc chạy. Không chỗ nào khác đọc `DATABASE_URL`.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
})
