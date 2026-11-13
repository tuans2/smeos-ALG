/**
 * Cổng sinh và sửa ảnh — `AIC-08`, `AIC-12`, `AIC-13`, `AIC-15`, `AIC-17`.
 *
 * `edit` nhận HAI mặt nạ, không phải một: `mask` là vùng ĐƯỢC phép đổi,
 * `protectMask` là vùng KHÔNG được đổi. Với `AIC-13` (mở rộng khung) thì
 * `protectMask` chính là mặt nạ sản phẩm, và đó là thứ giữ cho một lượt mở
 * rộng nền không sửa vào bó hoa (`YC-M2`, `YC-M3`).
 */
import type { AssetRef, MaskData, ProviderMedia } from "./shared-media"

export interface ImageGenerationInput {
  readonly prompt: string
  readonly reference?: readonly AssetRef[]
  readonly aspectRatio: string
}

export interface ImageEditInput {
  readonly imageRef: AssetRef
  readonly prompt: string
  readonly mask?: MaskData
  readonly protectMask?: MaskData
  readonly aspectRatio?: string
  readonly imageBytes?: Uint8Array | undefined
}

export interface ImageProvider {
  readonly name: string
  readonly modelVersion: string
  generate(input: ImageGenerationInput): Promise<ProviderMedia>
  edit(input: ImageEditInput): Promise<ProviderMedia>
}
