import { currentDbContext } from "@/core/tenancy/db-context"
import { Prisma } from "@/generated/prisma/client"

import { encryptPii, phoneHash, phoneLast4, requirePiiMasterKey } from "../pii-cipher"
import { isPiiModel, PII_FIELDS, PII_JSON_KEYS, type PiiFieldSpec, type PiiModel } from "../pii-fields"
import { currentDataKey, type PiiKeyDb } from "./pii-keys"

/**
 * ADR-014 D-P3: mỗi lệnh ghi Prisma vào cột cá nhân của `PII_FIELDS` được đổi thành bản mã ngay trong lệnh (cùng giao
 * dịch), kèm `*_hash`/`*_last4` cho số điện thoại. Từ P-5c cột chỉ còn bản mã: không xác định được tổ chức → lỗi (không
 * bao giờ ghi chữ rõ); chưa có khoá chủ → lỗi. Bản mã ghi thêm vào cột `legacyEnc` của P-5a để quay lại bản trước được
 * (bỏ ở P-5d). `PII_JSON_KEYS`: khoá cá nhân trong cột Json (vd. `metadata.customerPhone`) tách sang cột riêng.
 */

type Data = Record<string, unknown>
type Args = Record<string, unknown> & { data?: unknown; where?: Data; create?: Data; update?: Data }
type ModelDelegate = {
  findFirst(args: { where: unknown; select: { organization_id: true } }): Promise<{ organization_id: string } | null>
  findMany(args: { where: unknown; select: { organization_id: true }; distinct: ["organization_id"]; take: number }): Promise<Array<{ organization_id: string }>>
}
export type PiiBaseClient = PiiKeyDb & Record<string, unknown>

export class PiiOrganizationUnknownError extends Error {
  constructor(readonly model: string) {
    super(`Không xác định được tổ chức để mã hoá dữ liệu cá nhân (${model}) — ghi theo từng tổ chức`)
  }
}

const WRITES = new Set(["create", "createMany", "createManyAndReturn", "update", "updateMany", "updateManyAndReturn", "upsert"])

function isNullType(v: unknown): boolean {
  return v === Prisma.DbNull || v === Prisma.JsonNull || v === Prisma.AnyNull
}

function isPlainObject(v: unknown): v is Data {
  return v !== null && typeof v === "object" && !Array.isArray(v) && !isNullType(v)
}

/** Giá trị rõ của một cột trong `data`: chưa có trong lệnh ghi → `present: false`. */
function plainValue(raw: unknown, spec: PiiFieldSpec): { present: boolean; value: string | null } {
  if (raw === undefined) return { present: false, value: null }
  const v = isPlainObject(raw) && "set" in raw ? raw.set : raw
  if (v === null || v === undefined || isNullType(v)) return { present: true, value: null }
  if (typeof v === "string") return { present: true, value: v }
  if (spec.json) return { present: true, value: JSON.stringify(v) }
  return { present: false, value: null } // phép toán khác (increment…) — không có trên cột chữ
}

/** `metadata.customerPhone` → cột `customer_phone`; ghi cả `metadata` mà không có khoá → xoá số (ghi đè cả cột Json). */
function splitJsonKey(model: PiiModel, data: Data): Data {
  const rule = PII_JSON_KEYS[model]
  if (!rule || data[rule.column] === undefined) return data
  const raw = data[rule.column]
  const out: Data = { ...data }
  let phone: unknown = null
  if (isPlainObject(raw)) {
    const { [rule.key]: picked, ...rest } = raw
    phone = typeof picked === "string" && picked.trim() ? picked : null
    out[rule.column] = rest
  }
  if (out[rule.field] === undefined) out[rule.field] = phone
  return out
}

async function encryptData(base: PiiBaseClient, master: Buffer, model: PiiModel, input: Data, organizationId: string): Promise<Data> {
  const data = splitJsonKey(model, input)
  const out: Data = { ...data }
  const specs = PII_FIELDS[model] as Record<string, PiiFieldSpec>
  for (const [field, spec] of Object.entries(specs)) {
    const { present, value } = plainValue(data[field], spec)
    if (!present) continue
    if (value === null) {
      out[field] = spec.json ? (isNullType(data[field]) ? data[field] : Prisma.DbNull) : null
      if (spec.legacyEnc) out[spec.legacyEnc] = null
    } else {
      const key = await currentDataKey(base, master, organizationId)
      const sealed = encryptPii(key.key, key.version, value)
      out[field] = sealed
      if (spec.legacyEnc) out[spec.legacyEnc] = sealed
    }
    if (spec.hash) out[spec.hash] = value !== null ? (phoneHash(master, organizationId, value) ?? "") : null
    if (spec.last4) out[spec.last4] = value !== null ? phoneLast4(value) : null
  }
  return out
}

function touchesPii(model: PiiModel, data: unknown): boolean {
  if (!data || typeof data !== "object") return false
  const fields: string[] = Object.keys(PII_FIELDS[model])
  const json = PII_JSON_KEYS[model]
  if (json) fields.push(json.column)
  return (Array.isArray(data) ? data : [data]).some((d) => d && typeof d === "object" && fields.some((f) => (d as Data)[f] !== undefined))
}

/** Bỏ cột cá nhân khỏi lệnh ghi không khớp dòng nào (không có tổ chức để mã hoá, cũng không có gì để ghi). */
function withoutPii(model: PiiModel, data: Data): Data {
  const out = splitJsonKey(model, data)
  for (const field of Object.keys(PII_FIELDS[model])) delete out[field]
  return out
}

function orgOfData(data: Data | undefined): string | null {
  if (!data) return null
  if (typeof data.organization_id === "string") return data.organization_id
  const connect = (data.organization as { connect?: { id?: unknown } } | undefined)?.connect?.id
  return typeof connect === "string" ? connect : null
}

function orgOfContext(): string | null {
  const ctx = currentDbContext()
  return ctx?.kind === "tenant" && ctx.organizationId ? ctx.organizationId : null
}

/** Tổ chức của các dòng sắp sửa: trong `where` (kể cả khoá ghép), tra dòng, hoặc ngữ cảnh tổ chức. `null` = không khớp dòng nào. */
async function orgOfWhere(base: PiiBaseClient, model: PiiModel, where: Data | undefined): Promise<string | null> {
  if (where) {
    if (typeof where.organization_id === "string") return where.organization_id
    for (const v of Object.values(where)) {
      if (v && typeof v === "object" && typeof (v as Data).organization_id === "string") return (v as Data).organization_id as string
    }
  }
  const ctxOrg = orgOfContext()
  if (ctxOrg) return ctxOrg
  const rows = await (base[model] as ModelDelegate).findMany({
    where: where ?? {}, select: { organization_id: true }, distinct: ["organization_id"], take: 2,
  })
  if (rows.length > 1) throw new PiiOrganizationUnknownError(model)
  return rows[0]?.organization_id ?? null
}

/** Lệnh ghi đã đổi cột cá nhân thành bản mã/băm (hoặc nguyên lệnh nếu không đụng cột cá nhân). */
export async function encryptPiiWriteArgs(base: PiiBaseClient, model: string | undefined, operation: string, args: Args): Promise<Args> {
  if (!model || !isPiiModel(model) || !WRITES.has(operation)) return args
  const touched = touchesPii(model, args.data) || touchesPii(model, args.create) || touchesPii(model, args.update)
  if (!touched) return args
  const master = requirePiiMasterKey()
  if (operation === "create" || operation === "createMany" || operation === "createManyAndReturn") {
    const rows = Array.isArray(args.data) ? (args.data as Data[]) : [args.data as Data]
    const done = await Promise.all(rows.map((d) => {
      const org = orgOfData(d) ?? orgOfContext()
      if (!org) throw new PiiOrganizationUnknownError(model)
      return encryptData(base, master, model, d, org)
    }))
    return { ...args, data: Array.isArray(args.data) ? done : done[0] }
  }
  if (operation === "upsert") {
    const org = orgOfData(args.create) ?? (await orgOfWhere(base, model, args.where))
    if (!org) throw new PiiOrganizationUnknownError(model)
    return {
      ...args,
      create: await encryptData(base, master, model, args.create ?? {}, org),
      update: await encryptData(base, master, model, args.update ?? {}, org),
    }
  }
  const data = args.data as Data
  const org = orgOfData(data) ?? (await orgOfWhere(base, model, args.where))
  if (!org) return { ...args, data: withoutPii(model, data) } // không khớp dòng nào (`update` → Prisma tự báo P2025)
  return { ...args, data: await encryptData(base, master, model, data, org) }
}
