import { z } from "zod"

/**
 * Chạy trên trình duyệt trước khi app tương tác (Next.js `instrumentation-client`).
 *
 * CSP chặn thật không cho `eval` (ARC-022 A6). Zod 4 thử `new Function("")` một lần để chọn chế độ JIT — lệnh thử bị
 * chặn và bắt lỗi êm, nhưng trình duyệt vẫn gửi một báo cáo `csp.violation` mỗi lần nạp trang. `jitless` bỏ bước thử,
 * Zod chạy thẳng chế độ không JIT (chính là chế độ nó sẽ rơi về khi bị chặn).
 */
z.config({ jitless: true })
