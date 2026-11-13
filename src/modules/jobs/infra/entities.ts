import type { Prisma } from "@/generated/prisma/client"

/** Xem quy ước ở `src/modules/organization/infra/entities.ts`. */
export type { generation_jobs, job_events, job_status } from "@/generated/prisma/client"

/** Kiểu ghi cho cột Json. Dùng cái này thay cho `as never`: `never`
 *  nhận MỌI giá trị nên nó nuốt luôn lỗi kiểu thật — đúng cách một cột
 *  `String?` nhận nhầm một object đã lọt qua `tsc` và chỉ vỡ trên Postgres. */
export type InputJsonValue = Prisma.InputJsonValue
