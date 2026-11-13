/**
 * Cổng xác minh "người thật" cho form công khai (thu khách tiềm năng…).
 *
 * Mặc định chỉ ô bẫy + giới hạn tần suất (miễn phí, không gọi ra ngoài). Đầu nối
 * Cloudflare Turnstile dựng sẵn ở `modules/acquisition/adapters/` — bật khi khai
 * `TURNSTILE_SECRET_KEY`. Use-case chỉ biết cổng này, không biết nhà cung cấp.
 */

export interface HumanVerificationInput {
  /** Mã do widget phía trình duyệt cấp (bỏ trống khi chưa bật nhà cung cấp). */
  readonly token?: string | undefined
  /** IP đã qua proxy tin cậy — nhà cung cấp dùng để chấm điểm, không lưu. */
  readonly remoteIp?: string | undefined
}

export interface HumanVerifier {
  /** Tên để ghi log/nhận diện, vd. "honeypot", "turnstile". */
  readonly name: string
  verify(input: HumanVerificationInput): Promise<boolean>
}
