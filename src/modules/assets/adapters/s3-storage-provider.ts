import type { StorageListPage, StorageProvider, StorageMethod } from "@/core/ports"

/** Ném khi kho tệp trả 404 — route serve ảnh bắt để trả HTTP 404 thay vì 500. */
export class StorageFileNotFoundError extends Error {
  readonly code = "STORAGE_NOT_FOUND"
  constructor(key: string) {
    super(`Không tìm thấy tệp trong kho: ${key}`)
    this.name = "StorageFileNotFoundError"
  }
}

import {
  chuoiTruyVanChuanTac,
  maHoaDuongDan,
  sha256Hex,
  tieuDeUyQuyen,
  urlKySan,
  type ThongTinKy,
} from "@/modules/assets/domain/sigv4"

export type CauHinhS3 = {
  /** Ví dụ `https://<tài-khoản>.r2.cloudflarestorage.com` hoặc `https://s3.ap-southeast-1.amazonaws.com`. */
  readonly endpoint: string
  readonly bucket: string
  readonly accessKey: string
  readonly secretKey: string
  /** R2 dùng `auto`; S3 dùng tên vùng thật. */
  readonly region: string
}

/**
 * Kho tệp dùng chung, tương thích S3 — Amazon S3, Cloudflare R2, MinIO,
 * Wasabi. Thay `LocalDiskStorageProvider` ở mọi môi trường có nhiều hơn một
 * tiến trình: web và worker không còn phải đứng trên cùng một đĩa, và một
 * lượt triển khai lại không xoá ảnh của khách.
 *
 * Dùng đường dẫn kiểu path-style (`<endpoint>/<bucket>/<key>`) vì R2 và
 * MinIO chỉ nhận kiểu này, còn S3 nhận cả hai.
 *
 * Cổng `StorageProvider` không đổi hình dạng ngoài việc `signedUrl` nay nhận
 * thêm phương thức: URL tải LÊN và URL tải VỀ là hai chữ ký khác nhau ở S3,
 * trong khi bản đĩa cục bộ dùng chung một đường.
 */
export class S3StorageProvider implements StorageProvider {
  readonly name = "s3"

  private readonly host: string
  private readonly protocol: string
  private readonly info: ThongTinKy

  constructor(private readonly config: CauHinhS3) {
    const url = new URL(config.endpoint)
    this.host = url.host
    this.protocol = url.protocol.replace(":", "")
    this.info = {
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      region: config.region,
      service: "s3",
    }
  }

  private duongDan(key: string): string {
    return `/${maHoaDuongDan(this.config.bucket)}/${maHoaDuongDan(key)}`
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    const canonicalUri = this.duongDan(key)
    const payloadHash = sha256Hex(body)
    const headers = tieuDeUyQuyen({
      info: this.info,
      method: "PUT",
      host: this.host,
      canonicalUri,
      headers: { "content-type": contentType },
      payloadHash,
      now: new Date(),
    })

    const res = await fetch(`${this.protocol}://${this.host}${canonicalUri}`, {
      method: "PUT",
      headers,
      body: body as unknown as BodyInit,
    })

    if (!res.ok) {
      throw new Error(`Kho tệp từ chối ghi ${key}: ${res.status} ${await res.text()}`)
    }
  }

  async get(key: string): Promise<Uint8Array> {
    const canonicalUri = this.duongDan(key)
    const headers = tieuDeUyQuyen({
      info: this.info,
      method: "GET",
      host: this.host,
      canonicalUri,
      headers: {},
      payloadHash: sha256Hex(""),
      now: new Date(),
    })

    const res = await fetch(`${this.protocol}://${this.host}${canonicalUri}`, {
      method: "GET",
      headers,
    })

    if (res.status === 404) {
      throw new StorageFileNotFoundError(key)
    }
    if (!res.ok) {
      throw new Error(`Kho tệp từ chối đọc ${key}: ${res.status}`)
    }

    return new Uint8Array(await res.arrayBuffer())
  }

  async delete(key: string): Promise<void> {
    const canonicalUri = this.duongDan(key)
    const headers = tieuDeUyQuyen({
      info: this.info,
      method: "DELETE",
      host: this.host,
      canonicalUri,
      headers: {},
      payloadHash: sha256Hex(""),
      now: new Date(),
    })

    const res = await fetch(`${this.protocol}://${this.host}${canonicalUri}`, {
      method: "DELETE",
      headers,
    })

    // S3/R2 trả 204 cả khi khoá không tồn tại; 404 cũng coi là đã xoá.
    if (!res.ok && res.status !== 404) {
      throw new Error(`Kho tệp từ chối xoá ${key}: ${res.status}`)
    }
  }

  async list(prefix: string, cursor?: string | null): Promise<StorageListPage> {
    const canonicalUri = `/${maHoaDuongDan(this.config.bucket)}`
    const query = chuoiTruyVanChuanTac({
      "list-type": "2",
      "max-keys": "1000",
      prefix,
      ...(cursor ? { "continuation-token": cursor } : {}),
    })
    const headers = tieuDeUyQuyen({
      info: this.info,
      method: "GET",
      host: this.host,
      canonicalUri,
      canonicalQuery: query,
      headers: {},
      payloadHash: sha256Hex(""),
      now: new Date(),
    })

    const res = await fetch(`${this.protocol}://${this.host}${canonicalUri}?${query}`, { method: "GET", headers })
    if (!res.ok) {
      throw new Error(`Kho tệp từ chối liệt kê ${prefix}: ${res.status}`)
    }
    return parseListObjectsV2(await res.text())
  }

  async signedUrl(
    key: string,
    expiresInSeconds: number,
    method: StorageMethod = "GET"
  ): Promise<string> {
    // AWS SigV4 / Cloudflare R2 giới hạn X-Amz-Expires tối đa 7 ngày (604800 giây)
    const maxS3Expires = Math.min(expiresInSeconds, 604800)
    return urlKySan({
      info: this.info,
      method,
      host: this.host,
      canonicalUri: this.duongDan(key),
      expiresInSeconds: maxS3Expires,
      now: new Date(),
      protocol: this.protocol,
    })
  }
}

function xmlText(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
}

/** Đọc phản hồi XML của ListObjectsV2 (S3/R2) — chỉ các trường cần cho đối soát. */
export function parseListObjectsV2(xml: string): StorageListPage {
  const items = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map((m) => ({
    key: xmlText(/<Key>([\s\S]*?)<\/Key>/.exec(m[1]!)?.[1] ?? ""),
    size: Number(/<Size>(\d+)<\/Size>/.exec(m[1]!)?.[1] ?? 0),
  }))
  const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml)
  const token = /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1]
  return { items, nextCursor: truncated && token ? xmlText(token) : null }
}
