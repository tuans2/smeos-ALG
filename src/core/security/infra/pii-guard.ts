import { Prisma } from "@/generated/prisma/client"

import { isPiiModel, PII_FIELDS } from "../pii-fields"

/**
 * ADR-014 D-P3, P-5c: cột cá nhân chỉ chứa bản mã (mỗi lần ghi một IV mới) — lọc, sắp xếp, `distinct`, `groupBy` theo
 * cột đó không bao giờ đúng mà cũng không báo lỗi. Chặn ngay ở client Prisma: lệnh có điều kiện trên cột cá nhân (trừ so
 * với `null`) → `PiiFilterError`. Tra số điện thoại dùng `src/core/security/pii-lookup.ts`. Duyệt cả `AND`/`OR`/`NOT` và
 * bộ lọc quan hệ (theo mô hình dữ liệu lúc chạy của Prisma).
 */

export class PiiFilterError extends Error {
  constructor(readonly model: string, readonly field: string) {
    super(`Không lọc/sắp xếp theo cột dữ liệu cá nhân ${model}.${field} (bản mã) — tra số điện thoại qua pii-lookup`)
  }
}

type Data = Record<string, unknown>
type RuntimeField = { name: string; kind: string; type: string }
export type RuntimeModels = Record<string, { fields: RuntimeField[] } | undefined>

const LOGICAL = new Set(["AND", "OR", "NOT"])
const RELATION_OPS = new Set(["is", "isNot", "some", "every", "none"])
const NULL_TYPES = new Set<unknown>([null, Prisma.DbNull, Prisma.JsonNull, Prisma.AnyNull])

/** `null`, `{ equals: null }`, `{ not: null }` — bản mã null ⇔ chữ rõ null nên vẫn đúng. */
function isNullCheck(v: unknown): boolean {
  if (NULL_TYPES.has(v)) return true
  if (!v || typeof v !== "object" || Array.isArray(v)) return false
  const keys = Object.keys(v)
  return keys.length > 0 && keys.every((k) => (k === "equals" || k === "not") && NULL_TYPES.has((v as Data)[k]))
}

function relationTarget(models: RuntimeModels, model: string, field: string): string | null {
  const f = models[model]?.fields.find((x) => x.name === field)
  return f?.kind === "object" ? f.type : null
}

function checkWhere(models: RuntimeModels, model: string, where: unknown, depth = 0): void {
  if (depth > 12 || !where || typeof where !== "object") return
  if (Array.isArray(where)) {
    for (const w of where) checkWhere(models, model, w, depth + 1)
    return
  }
  const pii: Record<string, unknown> = isPiiModel(model) ? PII_FIELDS[model] : {}
  for (const [key, value] of Object.entries(where as Data)) {
    if (value === undefined) continue
    if (LOGICAL.has(key)) {
      checkWhere(models, model, value, depth + 1)
    } else if (key in pii) {
      if (!isNullCheck(value)) throw new PiiFilterError(model, key)
    } else {
      const target = relationTarget(models, model, key)
      if (!target || !value || typeof value !== "object") continue
      const ops = Object.keys(value).filter((k) => RELATION_OPS.has(k))
      if (ops.length === 0) checkWhere(models, target, value, depth + 1)
      for (const op of ops) checkWhere(models, target, (value as Data)[op], depth + 1)
    }
  }
}

function checkOrderBy(model: string, orderBy: unknown): void {
  if (!isPiiModel(model) || !orderBy) return
  for (const o of Array.isArray(orderBy) ? orderBy : [orderBy]) {
    for (const key of Object.keys((o ?? {}) as Data)) if (key in PII_FIELDS[model]) throw new PiiFilterError(model, key)
  }
}

function checkFieldList(model: string, list: unknown): void {
  if (!isPiiModel(model) || !list) return
  for (const key of Array.isArray(list) ? list : [list]) if (typeof key === "string" && key in PII_FIELDS[model]) throw new PiiFilterError(model, key)
}

/** Ném `PiiFilterError` khi lệnh lọc/sắp xếp theo cột cá nhân của bảng đang truy vấn hoặc bảng quan hệ. */
export function assertNoPiiFilter(models: RuntimeModels | undefined, model: string | undefined, args: unknown): void {
  if (!model || !models || !args || typeof args !== "object") return
  const a = args as Data
  checkWhere(models, model, a.where)
  checkWhere(models, model, a.cursor)
  checkWhere(models, model, a.having)
  checkOrderBy(model, a.orderBy)
  checkFieldList(model, a.distinct)
  checkFieldList(model, a.by)
}
