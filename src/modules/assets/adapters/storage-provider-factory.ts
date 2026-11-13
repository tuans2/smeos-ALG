import "server-only"

import type { StorageProvider } from "@/core/ports"
import { log } from "@/core/observability/log"

import { localStorageAllowed, missingStorageVars } from "../domain/storage-config"
import { LocalDiskStorageProvider } from "./local-disk-storage-provider"
import { S3StorageProvider } from "./s3-storage-provider"

/**
 * Chỗ DUY NHẤT trong `floraos-core` quyết định kho tệp nào đang chạy.
 *
 * Trước đây mười ba tệp tự dựng `new LocalDiskStorageProvider()`, nên đổi
 * kho là sửa mười ba chỗ và quên một chỗ thì một phần ảnh nằm lại trên đĩa
 * của một tiến trình. Mọi use-case nay hỏi hàm này.
 *
 * Bốn biến môi trường đủ giá trị thì chạy kho dùng chung; thiếu bất kỳ biến
 * nào thì rơi về đĩa cục bộ và nói rõ điều đó một lần trong nhật ký, để
 * không ai vô tình chạy production trên đĩa của một máy.
 */
let daCanhBao = false
let daDung: StorageProvider | null = null

export function getStorageProvider(): StorageProvider {
  if (daDung) return daDung

  const endpoint = process.env.STORAGE_ENDPOINT?.trim()
  const bucket = process.env.STORAGE_BUCKET?.trim()
  const accessKey = process.env.STORAGE_ACCESS_KEY?.trim()
  const secretKey = process.env.STORAGE_SECRET_KEY?.trim()
  const region = process.env.STORAGE_REGION?.trim() || "auto"

  if (endpoint && bucket && accessKey && secretKey) {
    daDung = new S3StorageProvider({ endpoint, bucket, accessKey, secretKey, region })
    return daDung
  }

  const thieu = missingStorageVars(process.env)
  // Production thiếu kho dùng chung → hỏng to thay vì ghi tệp xuống đĩa sẽ mất khi deploy (P0-05).
  if (!localStorageAllowed(process.env)) {
    log.error("kho_tep.thieu_cau_hinh", { thieu })
    throw new Error(
      `Thiếu cấu hình kho tệp dùng chung (${thieu.join(", ")}). Production không được lưu tệp xuống đĩa cục bộ; ` +
        "đặt các biến STORAGE_* hoặc ALLOW_LOCAL_STORAGE=true nếu đây là môi trường thử."
    )
  }

  if (!daCanhBao) {
    daCanhBao = true
    log.warn("kho_tep.dia_cuc_bo", {
      thieu,
      hau_qua:
        "Chỉ đúng khi web và worker ở cùng một máy, cùng một thư mục; ảnh mất sau mỗi lần triển khai lại.",
    })
  }

  daDung = new LocalDiskStorageProvider()
  return daDung
}

/** Kho dùng chung đang bật hay không — giao diện vận hành cần biết. */
export function dangDungKhoDungChung(): boolean {
  return getStorageProvider().name === "s3"
}

/** Chỉ dùng trong ca thử: quên bộ nhớ đệm giữa hai lượt đổi biến môi trường. */
export function _resetStorageProviderCache(): void {
  daDung = null
  daCanhBao = false
}
