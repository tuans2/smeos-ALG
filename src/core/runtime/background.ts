import { log } from "@/core/observability/log"

/**
 * Chạy việc phụ SAU khi thao tác chính đã xong (gửi thông báo...) mà không
 * bắt người dùng chờ, và không để lỗi việc phụ làm hỏng thao tác chính.
 * Máy chủ Node chạy lâu dài (Render) nên promise vẫn hoàn tất sau khi trả
 * response. Test gọi `flushBackground()` để chờ hết.
 */

const pending = new Set<Promise<unknown>>()

export function runInBackground(name: string, task: () => Promise<unknown>): void {
  const p = task()
    .catch((error: unknown) => {
      log.error("background.task_failed", { task: name, message: error instanceof Error ? error.message : String(error) })
    })
    .finally(() => pending.delete(p))
  pending.add(p)
}

export async function flushBackground(): Promise<void> {
  while (pending.size > 0) await Promise.allSettled([...pending])
}
