/**
 * Mô-đun rỗng thay cho `server-only` khi chạy test — xem lời giải thích ở
 * `vitest.config.ts`.
 *
 * `server-only` tồn tại để trình dựng Next.js chặn một mô-đun máy chủ bị
 * lỡ import vào bó mã trình duyệt. Bộ chạy test không có hai bó mã đó, và
 * mã đang thử chính là mã máy chủ, nên chốt này không có gì để chặn.
 *
 * Giữ nguyên `import "server-only"` ở mã sản xuất: chốt thật vẫn làm việc
 * ở bản dựng, chỉ bộ chạy test mới thay nó bằng tệp này.
 */

export {}
