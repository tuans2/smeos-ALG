import { Prisma } from "@/generated/prisma/client"

import { encryptPii, phoneHash, phoneLast4, piiMasterKey } from "../pii-cipher"
import { PII_FIELDS, PII_PRIMARY_KEY, type PiiFieldSpec, type PiiModel } from "../pii-fields"
import { currentDataKey, type PiiKeyDb } from "./pii-keys"

type Row = Record<string, unknown>
type Delegate = {
  findMany(args: { where: unknown; take: number; select: Record<string, true> }): Promise<Row[]>
  update(args: { where: Row; data: Row }): Promise<unknown>
}
export type PiiBackfillClient = PiiKeyDb & Record<string, unknown>

/** Điều kiện "còn cột rõ chưa mã hoá / chưa băm" của một bảng. */
function pendingWhere(specs: Record<string, PiiFieldSpec>): Row {
  const or: Row[] = []
  for (const [field, spec] of Object.entries(specs)) {
    const present = spec.required ? {} : { [field]: spec.json ? { not: Prisma.DbNull } : { not: null } }
    or.push({ ...present, [spec.enc]: null })
    if (spec.hash) or.push({ ...present, [spec.hash]: null })
  }
  return { OR: or }
}

/**
 * ADR-014 P-5a: mã hoá theo lô các dòng còn cột rõ mà chưa có bản mã/băm — dữ liệu có từ trước P-5a và lệnh ghi không
 * xác định được tổ chức. Chạy trong lượt quét nền 5 phút (`/internal/chain-dispatch-sweep`) và bằng
 * `npm run pii:backfill` khi vừa đặt khoá. Có trần mỗi bảng mỗi lượt; trả số dòng đã xử lý theo bảng.
 */
export async function encryptPendingPii(db: PiiBackfillClient, options: { batch?: number } = {}): Promise<Partial<Record<PiiModel, number>>> {
  const master = piiMasterKey()
  if (!master) return {}
  const batch = options.batch ?? 200
  const done: Partial<Record<PiiModel, number>> = {}
  for (const model of Object.keys(PII_FIELDS) as PiiModel[]) {
    const specs = PII_FIELDS[model] as Record<string, PiiFieldSpec>
    const pk = PII_PRIMARY_KEY[model]
    const select: Record<string, true> = { [pk]: true, organization_id: true }
    for (const f of Object.keys(specs)) select[f] = true
    const delegate = db[model] as Delegate
    const rows = await delegate.findMany({ where: pendingWhere(specs), take: batch, select })
    for (const row of rows) {
      const org = row.organization_id as string
      const data: Row = {}
      for (const [field, spec] of Object.entries(specs)) {
        const raw = row[field]
        if (raw === null || raw === undefined) continue
        const value = spec.json ? JSON.stringify(raw) : String(raw)
        const key = await currentDataKey(db, master, org)
        data[spec.enc] = encryptPii(key.key, key.version, value)
        if (spec.hash) data[spec.hash] = phoneHash(master, org, value) ?? "" // không có chữ số: đánh dấu đã xử lý
        if (spec.last4) data[spec.last4] = phoneLast4(value)
      }
      await delegate.update({ where: { [pk]: row[pk] }, data })
    }
    done[model] = rows.length
  }
  return done
}

/** Một lượt mã hoá theo lô trên client của ứng dụng (lượt quét nền, script vận hành). */
export async function runPiiBackfill(batch = 200): Promise<Partial<Record<PiiModel, number>>> {
  const { prisma } = await import("@/core/tenancy/infra/prisma")
  return encryptPendingPii(prisma as unknown as PiiBackfillClient, { batch })
}
