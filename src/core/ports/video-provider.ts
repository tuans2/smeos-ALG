/**
 * Cổng sinh video — `AIC-19` (đặc tả 10 mục 6.2).
 *
 * Tách `submit` và `poll` vì mọi nhà cung cấp video đều bất đồng bộ và lâu hơn
 * một lượt ảnh nhiều bậc. `providerJobId` lưu trong `payload` của
 * `generation_jobs`; worker poll theo chu kỳ và cập nhật `stage`. Ép video vào
 * một lời gọi đồng bộ là cách nhanh nhất để một job treo mười lăm phút rồi bị
 * tiến trình quét đánh `FAILED` trong khi nhà cung cấp vẫn đang chạy
 * (`YC-J10`).
 *
 * Khung đầu và khung cuối LUÔN là ảnh đã duyệt — mô hình video không nhận lệnh
 * tạo hình sản phẩm (`YC-M4`).
 */
import type { AssetRef, ProviderMedia } from "./shared-media"

export interface VideoGenerationInput {
  readonly frames: {
    readonly first: AssetRef
    readonly last?: AssetRef
  }
  readonly motion: string
  readonly durationSeconds: number
  readonly aspectRatio: string
}

export type VideoPollResult =
  | { readonly state: "RUNNING" }
  | { readonly state: "DONE"; readonly media: ProviderMedia }
  | { readonly state: "FAILED"; readonly reason: string }

export interface VideoProvider {
  readonly name: string
  readonly modelVersion: string
  submit(input: VideoGenerationInput): Promise<{ readonly providerJobId: string }>
  poll(providerJobId: string): Promise<VideoPollResult>
}
