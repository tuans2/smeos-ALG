/**
 * Trần chung của mọi route `/integration/*` (audit API-09, 07/11/2026): đếm theo danh tính ĐÃ xác
 * thực — token (một app của một tổ chức) hoặc người dùng SSO — không theo IP, vì app chị em gọi từ vài
 * máy chủ dùng chung IP. 600/phút (10/giây) đủ rộng cho luồng ghi usage/job hiện tại, chỉ chặn vòng lặp
 * chạy vô hạn hay token bị lộ. Thuần — OpenAPI đọc được mà không nạp tầng CSDL.
 */
export const INTEGRATION_RATE_LIMIT = { limit: 600, windowMs: 60_000 } as const
