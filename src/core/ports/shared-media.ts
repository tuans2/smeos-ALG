/**
 * Kiểu dùng chung cho các cổng sinh media — đặc tả 10 mục 6.2.
 *
 * Adapter KHÔNG ghi kho tệp. Nó trả byte hoặc một handle tạm; ghi vào kho và
 * tạo bản ghi `assets` là việc của use-case qua `StorageProvider`. Đây là điều
 * kiện để `YC-A1` (asset gốc bất biến) và `YC-T5` (đường dẫn theo tổ chức) nằm
 * ở một chỗ duy nhất thay vì lặp lại trong từng adapter.
 */

/** Trỏ tới một asset đã có trong kho. Adapter tự đọc byte qua StorageProvider. */
export interface AssetRef {
  readonly assetId: string
  readonly storageKey: string
}

export interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface Point {
  readonly x: number
  readonly y: number
}

/** Mặt nạ dạng PNG một kênh alpha, hoặc đa giác. */
export interface MaskData {
  readonly kind: "png_alpha" | "polygon"
  readonly bytes?: Uint8Array
  readonly polygon?: readonly Point[]
}

export interface ProviderMedia {
  readonly bytes: Uint8Array | { readonly tempHandle: string }
  readonly mimeType: string
  readonly modelVersion: string
  readonly costUsd?: number
  /**
   * Cờ do nhà cung cấp báo về, ví dụ `generative_fill_used`. Use-case chuyển
   * nguyên sang `assets.generated_flags` — `YC-A5` cấm mặc định ngầm, nên
   * thiếu cờ là lỗi ở use-case, không phải chỗ để điền giá trị mặc định.
   */
  readonly providerFlags?: Readonly<Record<string, boolean>>
}
