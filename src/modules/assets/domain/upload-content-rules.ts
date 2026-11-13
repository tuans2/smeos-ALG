/**
 * Kiểm nội dung tệp tải lên qua `PUT /api/v1/storage/<key>` (SDAGF-008,
 * audit `docs/audit/sdagf-2026-10/04-control-assessment.md`).
 *
 * Kiểu tệp lấy từ phần mở rộng của `storage_key` — đường dẫn do máy chủ ký
 * (`create-upload-url.ts`), không lấy từ `content-type` client gửi. Byte đầu
 * tệp phải khớp phần mở rộng: tệp HTML/SVG/script đổi tên thành `.jpg` không
 * lọt vào kho.
 *
 * Thuần: không import hạ tầng.
 */

const MB = 1024 * 1024

interface UploadKind {
  contentType: string
  maxBytes: number
  matches: (head: Uint8Array) => boolean
}

function startsWith(head: Uint8Array, bytes: readonly number[], offset = 0): boolean {
  if (head.length < offset + bytes.length) return false
  return bytes.every((b, i) => head[offset + i] === b)
}

function ascii(text: string): number[] {
  return Array.from(text, (c) => c.charCodeAt(0))
}

const IMAGE_MAX_BYTES = 20 * MB
const VIDEO_MAX_BYTES = 100 * MB
const SPREADSHEET_MAX_BYTES = 25 * MB

/** Hộp ISO BMFF (mp4/mov): cỡ 4 byte rồi tên hộp ở byte 4–7. */
const ISO_BMFF_BOXES = ["ftyp", "moov", "mdat", "wide", "free", "skip"].map(ascii)

const UPLOAD_KINDS: Readonly<Record<string, UploadKind>> = {
  jpg: { contentType: "image/jpeg", maxBytes: IMAGE_MAX_BYTES, matches: (h) => startsWith(h, [0xff, 0xd8, 0xff]) },
  png: {
    contentType: "image/png",
    maxBytes: IMAGE_MAX_BYTES,
    matches: (h) => startsWith(h, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  gif: {
    contentType: "image/gif",
    maxBytes: IMAGE_MAX_BYTES,
    matches: (h) => startsWith(h, ascii("GIF87a")) || startsWith(h, ascii("GIF89a")),
  },
  webp: {
    contentType: "image/webp",
    maxBytes: IMAGE_MAX_BYTES,
    matches: (h) => startsWith(h, ascii("RIFF")) && startsWith(h, ascii("WEBP"), 8),
  },
  mp4: { contentType: "video/mp4", maxBytes: VIDEO_MAX_BYTES, matches: (h) => startsWith(h, ascii("ftyp"), 4) },
  mov: {
    contentType: "video/quicktime",
    maxBytes: VIDEO_MAX_BYTES,
    matches: (h) => ISO_BMFF_BOXES.some((box) => startsWith(h, box, 4)),
  },
  webm: { contentType: "video/webm", maxBytes: VIDEO_MAX_BYTES, matches: (h) => startsWith(h, [0x1a, 0x45, 0xdf, 0xa3]) },
  xlsx: {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    maxBytes: SPREADSHEET_MAX_BYTES,
    matches: (h) => startsWith(h, [0x50, 0x4b, 0x03, 0x04]),
  },
  xls: {
    contentType: "application/vnd.ms-excel",
    maxBytes: SPREADSHEET_MAX_BYTES,
    matches: (h) => startsWith(h, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  },
  // CSV không có chữ ký byte: chỉ chặn tệp nhị phân (có byte 0).
  csv: { contentType: "text/csv", maxBytes: SPREADSHEET_MAX_BYTES, matches: (h) => !h.includes(0) },
}

export type UploadCheck =
  | { ok: true; contentType: string }
  | { ok: false; reason: "unsupported_type" | "too_large" | "content_mismatch" }

function extensionOf(key: string): string {
  const name = key.split("/").pop() ?? ""
  const dot = name.lastIndexOf(".")
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase()
}

/** Giới hạn byte cho `key`, hoặc `null` nếu kiểu tệp không được tải lên qua đường này. */
export function maxUploadBytes(key: string): number | null {
  return UPLOAD_KINDS[extensionOf(key)]?.maxBytes ?? null
}

export function checkUploadContent(key: string, body: Uint8Array): UploadCheck {
  const kind = UPLOAD_KINDS[extensionOf(key)]
  if (!kind) return { ok: false, reason: "unsupported_type" }
  if (body.length > kind.maxBytes) return { ok: false, reason: "too_large" }
  if (body.length === 0 || !kind.matches(body.subarray(0, 4096))) return { ok: false, reason: "content_mismatch" }
  return { ok: true, contentType: kind.contentType }
}
