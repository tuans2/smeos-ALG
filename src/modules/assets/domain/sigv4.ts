import { createHash, createHmac } from "node:crypto"

/**
 * Ký AWS Signature Version 4 — đủ cho S3 và mọi kho tương thích S3 (R2,
 * MinIO, Wasabi). Viết tay thay vì kéo `@aws-sdk/*` về vì D19 ("không thêm
 * hạ tầng") và vì bộ SDK kéo theo hàng chục megabyte cùng một lớp phụ thuộc
 * gốc theo nền tảng — cho đúng ba thao tác mà cổng `StorageProvider` cần.
 *
 * Tệp thuần: mọi hàm ở đây là hàm của đầu vào, không đọc biến môi trường,
 * không mở kết nối. Ca thử khoá chúng bằng hai bộ vector chính thức của AWS.
 */

export const THUAT_TOAN = "AWS4-HMAC-SHA256" as const
export const PAYLOAD_KHONG_KY = "UNSIGNED-PAYLOAD" as const
/** sha256 của chuỗi rỗng — thân rỗng của GET và DELETE. */
export const SHA256_RONG =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as const

export type ThongTinKy = {
  readonly accessKey: string
  readonly secretKey: string
  readonly region: string
  /** `s3` cho kho tệp. Tách ra để hàm này không chỉ phục vụ một dịch vụ. */
  readonly service: string
}

export function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex")
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest()
}

/**
 * Mã hoá theo RFC 3986. `encodeURIComponent` để sót năm ký tự mà AWS đòi
 * phải mã hoá; bỏ sót chúng là chữ ký sai cho đúng những khoá có dấu.
 */
export function maHoaRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

/** Mã hoá đường dẫn, giữ nguyên dấu `/` ngăn cách đoạn. */
export function maHoaDuongDan(path: string): string {
  return path.split("/").map(maHoaRfc3986).join("/")
}

/** `20130524T000000Z` và `20130524`. */
export function dauThoiGian(now: Date): { amzDate: string; ngay: string } {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "")
  return { amzDate, ngay: amzDate.slice(0, 8) }
}

export function phamVi(ngay: string, region: string, service: string): string {
  return `${ngay}/${region}/${service}/aws4_request`
}

export function chuoiTruyVanChuanTac(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${maHoaRfc3986(k)}=${maHoaRfc3986(params[k] as string)}`)
    .join("&")
}

export function yeuCauChuanTac(input: {
  method: string
  canonicalUri: string
  canonicalQuery: string
  headers: Record<string, string>
  payloadHash: string
}): { canonical: string; signedHeaders: string } {
  const ten = Object.keys(input.headers)
    .map((k) => k.toLowerCase())
    .sort()
  const canonicalHeaders = ten
    .map((k) => {
      const goc = Object.keys(input.headers).find((h) => h.toLowerCase() === k) as string
      return `${k}:${(input.headers[goc] as string).trim().replace(/\s+/g, " ")}\n`
    })
    .join("")
  const signedHeaders = ten.join(";")

  const canonical = [
    input.method,
    input.canonicalUri,
    input.canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    input.payloadHash,
  ].join("\n")

  return { canonical, signedHeaders }
}

export function khoaKy(info: ThongTinKy, ngay: string): Buffer {
  const kDate = hmac(`AWS4${info.secretKey}`, ngay)
  const kRegion = hmac(kDate, info.region)
  const kService = hmac(kRegion, info.service)
  return hmac(kService, "aws4_request")
}

export function chuKy(info: ThongTinKy, amzDate: string, canonical: string): string {
  const ngay = amzDate.slice(0, 8)
  const stringToSign = [
    THUAT_TOAN,
    amzDate,
    phamVi(ngay, info.region, info.service),
    sha256Hex(canonical),
  ].join("\n")
  return createHmac("sha256", khoaKy(info, ngay)).update(stringToSign, "utf8").digest("hex")
}

/**
 * URL ký sẵn (chữ ký nằm trong chuỗi truy vấn). Client tải thẳng lên kho
 * hoặc tải ảnh về mà không đi qua máy chủ ứng dụng.
 */
export function urlKySan(input: {
  info: ThongTinKy
  method: string
  host: string
  canonicalUri: string
  expiresInSeconds: number
  now: Date
  protocol?: string
  queryThem?: Record<string, string>
}): string {
  const { amzDate, ngay } = dauThoiGian(input.now)
  const params: Record<string, string> = {
    ...(input.queryThem ?? {}),
    "X-Amz-Algorithm": THUAT_TOAN,
    "X-Amz-Credential": `${input.info.accessKey}/${phamVi(ngay, input.info.region, input.info.service)}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(input.expiresInSeconds),
    "X-Amz-SignedHeaders": "host",
  }

  const canonicalQuery = chuoiTruyVanChuanTac(params)
  const { canonical } = yeuCauChuanTac({
    method: input.method,
    canonicalUri: input.canonicalUri,
    canonicalQuery,
    headers: { host: input.host },
    payloadHash: PAYLOAD_KHONG_KY,
  })

  const signature = chuKy(input.info, amzDate, canonical)
  const protocol = input.protocol ?? "https"
  return `${protocol}://${input.host}${input.canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`
}

/** Chữ ký đặt ở tiêu đề `Authorization` — cho lời gọi từ chính máy chủ. */
export function tieuDeUyQuyen(input: {
  info: ThongTinKy
  method: string
  host: string
  canonicalUri: string
  canonicalQuery?: string
  headers: Record<string, string>
  payloadHash: string
  now: Date
}): Record<string, string> {
  const { amzDate, ngay } = dauThoiGian(input.now)
  const headers: Record<string, string> = {
    ...input.headers,
    host: input.host,
    "x-amz-content-sha256": input.payloadHash,
    "x-amz-date": amzDate,
  }

  const { canonical, signedHeaders } = yeuCauChuanTac({
    method: input.method,
    canonicalUri: input.canonicalUri,
    canonicalQuery: input.canonicalQuery ?? "",
    headers,
    payloadHash: input.payloadHash,
  })

  const signature = chuKy(input.info, amzDate, canonical)
  headers["authorization"] =
    `${THUAT_TOAN} Credential=${input.info.accessKey}/${phamVi(ngay, input.info.region, input.info.service)}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`

  return headers
}
