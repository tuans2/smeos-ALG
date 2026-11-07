import { prisma } from "@/core/tenancy/infra/prisma"

/** Trần thời gian một lượt giữ khoá — quá thì giao dịch giữ khoá bị huỷ, khoá được nhả, lượt sau chạy lại. */
export const DEFAULT_EXCLUSIVE_RUN_MS = 10 * 60 * 1000

/**
 * Chạy `fn` ở đúng MỘT tiến trình trong cụm (khoá cố vấn Postgres theo tên, cùng mẫu với
 * `ChainDispatchSweepQuery.withSweepLock`). Tiến trình khác đang giữ khoá → trả `null` ngay, không chờ.
 *
 * Audit hành trình S2 (gói UJ-11): các bộ quét `setInterval` khởi trong `instrumentation.ts` chạy ở MỌI tiến
 * trình web — chạy từ hai instance trở lên là cùng một việc (khớp chuyển khoản, tự huỷ đơn, tạo lead cứu đơn)
 * chạy song song. Khoá giữ trong một giao dịch mở suốt lượt chạy (chiếm một kết nối), nhả khi xong hoặc lỗi.
 */
export async function runExclusive<T>(name: string, fn: () => Promise<T>, maxRunMs = DEFAULT_EXCLUSIVE_RUN_MS): Promise<T | null> {
  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_xact_lock(hashtext(${name})) AS locked`
      if (!rows[0]?.locked) return null
      return fn()
    },
    { maxWait: 5_000, timeout: maxRunMs }
  )
}
