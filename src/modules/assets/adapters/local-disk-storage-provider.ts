import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"

import type { StorageListPage, StorageProvider, StorageMethod } from "@/core/ports"

import { signStorageUrl } from "@/modules/assets/infra/storage-signing"

const STORAGE_ROOT = path.join(process.cwd(), "var", "storage")

function absolutePathFor(key: string): string {
  const normalized = path.normalize(key)
  if (normalized.startsWith("..")) throw new Error(`storage_key không hợp lệ: ${key}`)
  return path.join(STORAGE_ROOT, normalized)
}

/**
 * Adapter kho tệp tạm cho phát triển cục bộ — `POST /assets/upload-url` cần
 * MỘT adapter thật để URL trả về dùng được, và bản này chưa có khoá S3/R2
 * thật (`.env.example` đã có ô, chưa có giá trị). Cổng `StorageProvider`
 * không đổi khi thay bằng adapter S3 thật (kiến trúc V2 mục 3, đặc tả 05 mục
 * 5) — chỉ thay tệp này.
 *
 * Ghi ở `docs/dac-ta/TECHNICAL_DEBT.md`: không dùng được qua nhiều tiến
 * trình/máy chủ (đĩa cục bộ), phải thay trước khi lên production thật.
 */
export class LocalDiskStorageProvider implements StorageProvider {
  readonly name = "local-disk"

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    const target = absolutePathFor(key)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, body)
    await writeFile(`${target}.meta.json`, JSON.stringify({ contentType }))
  }

  async get(key: string): Promise<Uint8Array> {
    try {
      return await readFile(absolutePathFor(key))
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
        const { StorageFileNotFoundError } = await import("./s3-storage-provider")
        throw new StorageFileNotFoundError(key)
      }
      throw err
    }
  }

  async delete(key: string): Promise<void> {
    const target = absolutePathFor(key)
    await rm(target, { force: true })
    await rm(`${target}.meta.json`, { force: true })
  }

  /** Đĩa cục bộ chỉ dùng khi phát triển: trả một trang duy nhất. */
  async list(prefix: string): Promise<StorageListPage> {
    const entries = await readdir(STORAGE_ROOT, { recursive: true }).catch(() => [] as string[])
    const items = []
    for (const entry of entries) {
      const key = entry.split(path.sep).join("/")
      if (!key.startsWith(prefix) || key.endsWith(".meta.json")) continue
      const info = await stat(path.join(STORAGE_ROOT, entry))
      if (info.isFile()) items.push({ key, size: info.size })
    }
    return { items, nextCursor: null }
  }

  /** Route `/api/v1/storage/[...key]` nhận cả PUT lẫn GET trên cùng đường;
   *  chữ ký gắn với phương thức nên URL xem không dùng để ghi được. */
  async signedUrl(
    key: string,
    expiresInSeconds: number,
    method: StorageMethod = "GET"
  ): Promise<string> {
    const expiresAt = Date.now() + expiresInSeconds * 1000
    const signature = signStorageUrl(key, expiresAt, method)
    return `/api/v1/storage/${key}?exp=${expiresAt}&sig=${signature}`
  }
}
