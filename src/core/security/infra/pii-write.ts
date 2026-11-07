import { log } from "@/core/observability/log"
import { currentDbContext } from "@/core/tenancy/db-context"
import { Prisma } from "@/generated/prisma/client"

import { encryptPii, phoneHash, phoneLast4, piiMasterKey } from "../pii-cipher"
import { isPiiModel, PII_FIELDS, type PiiFieldSpec, type PiiModel } from "../pii-fields"
import { currentDataKey, type PiiKeyDb } from "./pii-keys"

/**
 * ADR-014 D-P3, bước P-5a (ghi kép): mỗi lệnh ghi Prisma vào cột cá nhân rõ của `PII_FIELDS` ghi luôn bản mã `*_enc`, và
 * với số điện thoại cả `*_hash`/`*_last4`. Gắn ở client Prisma (`src/core/tenancy/infra/prisma.ts`), cùng lệnh ghi nên
 * cùng giao dịch. Không xác định được tổ chức (ví dụ `updateMany` nhiều tổ chức) → cột bản mã đặt `null`, job
 * `encryptPendingPii` mã hoá sau — không bao giờ để bản mã lệch với chữ rõ. Chưa có khoá chủ (production trước khi
 * vận hành đặt `PII_ENCRYPTION_KEY`) → giữ nguyên lệnh ghi.
 */

type Data = Record<string, unknown>
type Args = Record<string, unknown> & { data?: unknown; where?: Data; create?: Data; update?: Data }
type ModelDelegate = { findFirst(args: { where: unknown; select: { organization_id: true } }): Promise<{ organization_id: string } | null> }
export type PiiBaseClient = PiiKeyDb & Record<string, unknown>

const WRITES = new Set(["create", "createMany", "createManyAndReturn", "update", "updateMany", "updateManyAndReturn", "upsert"])
let warned = false

function isNullType(v: unknown): boolean {
  return v === Prisma.DbNull || v === Prisma.JsonNull || v === Prisma.AnyNull
}

/** Giá trị rõ của một cột trong `data`: chưa có trong lệnh ghi → `present: false`. */
function plainValue(raw: unknown, spec: PiiFieldSpec): { present: boolean; value: string | null } {
  if (raw === undefined) return { present: false, value: null }
  const v = raw !== null && typeof raw === "object" && !Array.isArray(raw) && "set" in (raw as Data) ? (raw as Data).set : raw
  if (v === null || v === undefined || isNullType(v)) return { present: true, value: null }
  if (typeof v === "string") return { present: true, value: v }
  if (spec.json) return { present: true, value: JSON.stringify(v) }
  return { present: false, value: null } // phép toán khác (increment…) — không có trên cột chữ
}

async function encryptData(base: PiiBaseClient, master: Buffer, model: PiiModel, data: Data, organizationId: string | null): Promise<Data> {
  const out: Data = { ...data }
  const specs = PII_FIELDS[model] as Record<string, PiiFieldSpec>
  for (const [field, spec] of Object.entries(specs)) {
    const { present, value } = plainValue(data[field], spec)
    if (!present) continue
    const key = value !== null && organizationId ? await currentDataKey(base, master, organizationId) : null
    out[spec.enc] = value !== null && key ? encryptPii(key.key, key.version, value) : null
    if (spec.hash) out[spec.hash] = value !== null && organizationId ? (phoneHash(master, organizationId, value) ?? "") : null
    if (spec.last4) out[spec.last4] = value !== null ? phoneLast4(value) : null
  }
  return out
}

function touchesPii(model: PiiModel, data: unknown): boolean {
  if (!data || typeof data !== "object") return false
  const fields = Object.keys(PII_FIELDS[model])
  return (Array.isArray(data) ? data : [data]).some((d) => d && typeof d === "object" && fields.some((f) => (d as Data)[f] !== undefined))
}

function orgOfData(data: Data | undefined): string | null {
  if (!data) return null
  if (typeof data.organization_id === "string") return data.organization_id
  const connect = (data.organization as { connect?: { id?: unknown } } | undefined)?.connect?.id
  return typeof connect === "string" ? connect : null
}

/** Tổ chức của dòng sắp sửa: trong `where` (kể cả khoá ghép), tra dòng, hoặc ngữ cảnh tổ chức của request. */
async function orgOfWhere(base: PiiBaseClient, model: PiiModel, where: Data | undefined, single: boolean): Promise<string | null> {
  if (where) {
    if (typeof where.organization_id === "string") return where.organization_id
    for (const v of Object.values(where)) {
      if (v && typeof v === "object" && typeof (v as Data).organization_id === "string") return (v as Data).organization_id as string
    }
    if (single) {
      const row = await (base[model] as ModelDelegate).findFirst({ where, select: { organization_id: true } })
      if (row) return row.organization_id
    }
  }
  const ctx = currentDbContext()
  return ctx?.kind === "tenant" && ctx.organizationId ? ctx.organizationId : null
}

/** Lệnh ghi đã bổ sung bản mã/băm cho cột cá nhân (hoặc nguyên lệnh nếu không đụng cột cá nhân). */
export async function encryptPiiWriteArgs(base: PiiBaseClient, model: string | undefined, operation: string, args: Args): Promise<Args> {
  if (!model || !isPiiModel(model) || !WRITES.has(operation)) return args
  const touched = touchesPii(model, args.data) || touchesPii(model, args.create) || touchesPii(model, args.update)
  if (!touched) return args
  const master = piiMasterKey()
  if (!master) {
    if (!warned) log.warn("pii.encryption_disabled", { reason: "PII_ENCRYPTION_KEY chưa đặt" })
    warned = true
    return args
  }
  if (operation === "create" || operation === "createMany" || operation === "createManyAndReturn") {
    const rows = Array.isArray(args.data) ? (args.data as Data[]) : [args.data as Data]
    const ctxOrg = await orgOfWhere(base, model, undefined, false)
    const done = await Promise.all(rows.map((d) => encryptData(base, master, model, d, orgOfData(d) ?? ctxOrg)))
    return { ...args, data: Array.isArray(args.data) ? done : done[0] }
  }
  if (operation === "upsert") {
    const org = orgOfData(args.create) ?? (await orgOfWhere(base, model, args.where, true))
    return {
      ...args,
      create: await encryptData(base, master, model, args.create ?? {}, org),
      update: await encryptData(base, master, model, args.update ?? {}, org),
    }
  }
  const org = orgOfData(args.data as Data) ?? (await orgOfWhere(base, model, args.where, operation === "update"))
  return { ...args, data: await encryptData(base, master, model, args.data as Data, org) }
}
