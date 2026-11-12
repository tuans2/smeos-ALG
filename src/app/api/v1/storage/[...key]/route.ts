import { jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { verifyStorageSignature, type StorageUrlMethod } from "@/modules/assets/infra/storage-signing"
import { StorageFileNotFoundError } from "@/modules/assets/adapters/s3-storage-provider"
import { checkUploadContent, maxUploadBytes } from "@/modules/assets/domain/upload-content-rules"
import { defineRoute } from "@/core/http/define-route"

/** Tham số bắt-tất-cả: khai kiểu cho `defineRoute` (mặc định là `Record<string, string>`). */
type Signed = { kind: "custom"; reason: string }
type KeyParams = { key: string[] }

/**
 * Đích của URL ký sẵn do `LocalDiskStorageProvider.signedUrl` sinh ra — xem
 * ghi chú nợ kỹ thuật ở tệp đó. Route này KHÔNG đọc phiên đăng nhập: chữ ký
 * HMAC theo `key` + hạn dùng (`exp`) + phương thức là cơ chế xác thực duy
 * nhất, đúng tinh thần "URL ký sẵn, client tải thẳng lên kho" (đặc tả 06
 * mục 6). Không có tiền tố nào được miễn chữ ký (audit SDAGF R-01: `videos/`
 * từng được miễn cả đọc lẫn ghi).
 */
function verifyOrThrow(key: string, url: URL, method: StorageUrlMethod): void {
  const exp = Number(url.searchParams.get("exp"))
  const sig = url.searchParams.get("sig")
  if (!exp || !sig || !verifyStorageSignature(key, exp, sig, method)) {
    throw validationFailed({ signature: "URL ký sẵn không hợp lệ hoặc đã hết hạn" })
  }
}

const UPLOAD_ERRORS = {
  unsupported_type: "Kiểu tệp không được hỗ trợ",
  too_large: "Tệp vượt quá dung lượng cho phép",
  content_mismatch: "Nội dung tệp không khớp kiểu tệp",
} as const

/** Đọc thân yêu cầu, dừng ngay khi vượt `maxBytes` — không nạp cả tệp quá cỡ vào bộ nhớ. */
async function readBodyCapped(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get("content-length"))
  if (declared > maxBytes) return null
  if (!request.body) return new Uint8Array()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.length
  }
  return body
}

export const PUT = defineRoute<Signed, undefined, undefined, KeyParams>({
  auth: { kind: "custom", reason: "URL ký sẵn — chữ ký kiểm trong handler (verifyOrThrow)" },
  handler: async ({ request, params }) => {
    const { key: segments } = params
    const key = segments.join("/")
    verifyOrThrow(key, new URL(request.url), "PUT")

    const maxBytes = maxUploadBytes(key)
    if (maxBytes === null) throw validationFailed({ file: UPLOAD_ERRORS.unsupported_type })
    const body = await readBodyCapped(request, maxBytes)
    if (!body) throw validationFailed({ file: UPLOAD_ERRORS.too_large })

    // Kiểu tệp lấy từ phần mở rộng của key đã ký, không từ `content-type` client gửi.
    const check = checkUploadContent(key, body)
    if (!check.ok) throw validationFailed({ file: UPLOAD_ERRORS[check.reason] })
    await getStorageProvider().put(key, body, check.contentType)

    return jsonResponse({ ok: true, key })
  },
})

export const GET = defineRoute<Signed, undefined, undefined, KeyParams>({
  auth: { kind: "custom", reason: "URL ký sẵn — chữ ký kiểm trong handler (verifyOrThrow)" },
  handler: async ({ request, params }) => {
    const { key: segments } = params
    const key = segments.join("/")
    verifyOrThrow(key, new URL(request.url), "GET")

    const bytes = await getStorageProvider().get(key).catch((err: unknown) => {
      if (err instanceof StorageFileNotFoundError) return null
      throw err
    })
    if (!bytes) {
      return new Response(null, { status: 404 })
    }
    let contentType = "application/octet-stream"
    if (key.endsWith(".jpg") || key.endsWith(".jpeg")) contentType = "image/jpeg"
    else if (key.endsWith(".png")) contentType = "image/png"
    else if (key.endsWith(".webp")) contentType = "image/webp"
    else if (key.endsWith(".gif")) contentType = "image/gif"
    else if (key.endsWith(".svg")) contentType = "image/svg+xml"
    else if (key.endsWith(".mp4")) contentType = "video/mp4"
    else if (key.endsWith(".mov")) contentType = "video/quicktime"
    else if (key.endsWith(".webm")) contentType = "video/webm"
    // Âm thanh Khu vực C (23/09/2026) — thiếu MIME thì Safari không phát được.
    else if (key.endsWith(".m4a")) contentType = "audio/mp4"
    else if (key.endsWith(".mp3")) contentType = "audio/mpeg"
    else if (key.endsWith(".wav")) contentType = "audio/wav"
    else if (key.endsWith(".ogg")) contentType = "audio/ogg"
    else if (key.endsWith(".xlsx")) contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else if (key.endsWith(".xls")) contentType = "application/vnd.ms-excel"
    else if (key.endsWith(".csv")) contentType = "text/csv; charset=utf-8"

    const isSpreadsheet = key.endsWith(".xlsx") || key.endsWith(".xls") || key.endsWith(".csv")
    const filename = key.split("/").pop() ?? "download"

    const baseHeaders: Record<string, string> = {
      "content-type": contentType,
      "cache-control": isSpreadsheet ? "private, max-age=3600" : "public, max-age=86400, immutable",
      "accept-ranges": "bytes",
      "x-content-type-options": "nosniff",
      ...(isSpreadsheet ? { "content-disposition": `attachment; filename="${filename}"` } : {}),
      // SVG mở trực tiếp chạy được script cùng origin: chặn bằng CSP sandbox (audit SDAGF R-02).
      ...(key.endsWith(".svg") ? { "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
    }

    // Hỗ trợ `Range` — trình phát <audio>/<video> (nhất là Safari) đòi 206 để
    // tua và để bắt đầu phát.
    const range = request.headers.get("range")
    const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null
    if (match && bytes.length > 0) {
      const total = bytes.length
      let start = match[1] ? Number(match[1]) : NaN
      let end = match[2] ? Number(match[2]) : total - 1
      if (Number.isNaN(start)) {
        // `bytes=-N`: N byte cuối
        start = Math.max(0, total - end)
        end = total - 1
      }
      end = Math.min(end, total - 1)
      if (start > end || start >= total) {
        return new Response(null, { status: 416, headers: { ...baseHeaders, "content-range": `bytes */${total}` } })
      }
      const chunk = bytes.subarray(start, end + 1)
      return new Response(chunk as unknown as BodyInit, {
        status: 206,
        headers: {
          ...baseHeaders,
          "content-range": `bytes ${start}-${end}/${total}`,
          "content-length": String(chunk.length),
        },
      })
    }

    return new Response(bytes as unknown as BodyInit, {
      status: 200,
      headers: { ...baseHeaders, "content-length": String(bytes.length) },
    })
  },
})
