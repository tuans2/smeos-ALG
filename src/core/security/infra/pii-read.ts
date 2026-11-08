import { asSystemDb } from "@/core/tenancy/db-context"

import { decryptPii, isPiiCiphertext, piiKeyVersion, piiMasterKey, requirePiiMasterKey } from "../pii-cipher"
import { PII_FIELDS, PII_JSON_KEYS, type PiiFieldSpec, type PiiModel } from "../pii-fields"
import { cachedDataKey, loadAllDataKeys } from "./pii-keys"

/**
 * ADR-014 D-P3: đọc cột cá nhân từ bản mã. Gắn ở client Prisma như trường tính toán (`result` extension) — áp cho cả truy
 * vấn trực tiếp lẫn truy vấn lồng (`include`, `select` lồng); Prisma tự lấy thêm `organization_id`. Từ P-5c chính cột chứa
 * bản mã; giá trị không có dạng bản mã (dòng ghi bằng SQL thô, chưa qua job) trả nguyên và job `encryptPendingPii` mã hoá
 * sau. Bản mã không giải được → lỗi (không trả rỗng: trả rỗng rồi lưu lại là mất dữ liệu).
 * Khoá dữ liệu phải có sẵn trong bộ nhớ (giải mã đồng bộ, khi mã đọc tới trường): `readWithPiiKeys` quét kết quả thô và
 * nạp khoá còn thiếu trước khi trả về; vẫn thiếu (khoá đã bị xoá) → `PiiKeyMissingError` lúc đọc trường.
 */

export class PiiKeyMissingError extends Error {
  constructor(readonly organizationId: string, readonly version: number) {
    super("Thiếu khoá dữ liệu để giải mã dữ liệu cá nhân")
  }
}

type Row = Record<string, unknown>
type Computed = Record<string, { needs: Record<string, true>; compute: (row: Row) => unknown }>

/** Giải một giá trị cột: bản mã → chữ rõ; giá trị khác (null, chưa mã hoá) → nguyên. */
export function decryptPiiValue(organizationId: string, value: unknown): unknown {
  const sealed = typeof value === "string" ? value : null
  if (!isPiiCiphertext(sealed)) return value
  requirePiiMasterKey()
  const version = piiKeyVersion(sealed)!
  const key = cachedDataKey(organizationId, version)
  if (!key) throw new PiiKeyMissingError(organizationId, version)
  return decryptPii(key, sealed)
}

function decryptField(row: Row, field: string, spec: PiiFieldSpec): unknown {
  const raw = row[field]
  const plain = decryptPiiValue(row.organization_id as string, raw)
  return spec.json && plain !== raw && typeof plain === "string" ? JSON.parse(plain) : plain
}

/**
 * Bản giải mã các cột cá nhân có trong một dòng thô của `model` (cần `organization_id` trên dòng). Dùng trong query
 * extension đọc kết quả lồng trước khi Prisma áp `result` extension (vd. `orders` ghép `recipient` vào `delivery_address`).
 */
export function decryptPiiRow<T>(model: PiiModel, row: T): T {
  if (!row || typeof row !== "object" || typeof (row as Row).organization_id !== "string") return row
  const out: Row = { ...(row as Row) }
  for (const [field, spec] of Object.entries(PII_FIELDS[model] as Record<string, PiiFieldSpec>)) {
    if (field in out) out[field] = decryptField(out, field, spec)
  }
  return out as T
}

/** Khai báo `result` extension cho mọi cột trong `PII_FIELDS` và khoá Json tách cột (`PII_JSON_KEYS`). */
export function piiResultExtension(): Record<string, Computed> {
  const out: Record<string, Computed> = {}
  for (const [model, fields] of Object.entries(PII_FIELDS)) {
    const computed: Computed = {}
    for (const [field, spec] of Object.entries(fields as Record<string, PiiFieldSpec>)) {
      computed[field] = { needs: { [field]: true, organization_id: true }, compute: (row) => decryptField(row, field, spec) }
    }
    const rule = PII_JSON_KEYS[model as PiiModel]
    if (rule) {
      computed[rule.column] = {
        needs: { [rule.column]: true, [rule.field]: true, organization_id: true },
        compute: (row) => {
          const json = row[rule.column]
          const phone = decryptPiiValue(row.organization_id as string, row[rule.field])
          if (phone === null || phone === undefined) return json
          const base = json && typeof json === "object" && !Array.isArray(json) ? (json as Row) : {}
          return { ...base, [rule.key]: phone }
        },
      }
    }
    out[model] = computed
  }
  return out
}

/** Cặp (tổ chức, phiên bản khoá) của mọi bản mã trong kết quả thô mà bộ nhớ chưa có khoá. */
function missingKeys(result: unknown, out: Set<string>, depth = 0): void {
  if (depth > 8 || result === null || typeof result !== "object") return
  if (Array.isArray(result)) {
    for (const item of result) missingKeys(item, out, depth + 1)
    return
  }
  if (result instanceof Date || Buffer.isBuffer(result)) return
  const row = result as Row
  const org = typeof row.organization_id === "string" ? row.organization_id : null
  for (const v of Object.values(row)) {
    if (org && isPiiCiphertext(v)) {
      const version = piiKeyVersion(v)!
      if (!cachedDataKey(org, version)) out.add(`${org}:${version}`)
    } else if (v && typeof v === "object") {
      missingKeys(v, out, depth + 1)
    }
  }
}

/**
 * Chạy lệnh Prisma rồi bảo đảm khoá của mọi bản mã trong kết quả đã ở bộ nhớ — Prisma tính trường giải mã khi mã đọc
 * tới (sau khi lệnh trả về), nên khoá phải có trước. Thiếu → nạp mọi khoá bằng quyền hệ thống (một lần mỗi lần thiếu).
 */
export async function readWithPiiKeys<T>(base: unknown, run: () => Promise<T>): Promise<T> {
  const result = await run()
  const missing = new Set<string>()
  missingKeys(result, missing)
  if (missing.size > 0) {
    const master = piiMasterKey()
    if (!master) return result // đọc trường sẽ báo `PiiKeyRequiredError`
    // Bảng khoá thuộc từng tổ chức (RLS): nạp toàn bộ bằng quyền hệ thống — khoá chỉ vào bộ nhớ tiến trình
    await asSystemDb("pii:load-keys", () => loadAllDataKeys(base as Parameters<typeof loadAllDataKeys>[0], master))
  }
  return result
}
