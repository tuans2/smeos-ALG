import { Prisma } from "@/generated/prisma/client"

import { piiMasterKey } from "../pii-cipher"
import { PII_FIELDS, PII_JSON_KEYS, PII_PRIMARY_KEY, type PiiFieldSpec, type PiiModel } from "../pii-fields"
import type { PiiKeyDb } from "./pii-keys"

type Row = Record<string, unknown>
type Delegate = {
  findMany(args: { where: Row; select: Record<string, true> }): Promise<Row[]>
  update(args: { where: Row; data: Row }): Promise<unknown>
}
export type PiiBackfillClient = PiiKeyDb & Record<string, unknown> & {
  $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>
}

/** Điều kiện SQL "cột còn chữ rõ hoặc số chưa băm" (tên bảng/cột lấy từ hằng `PII_FIELDS`, không từ dữ liệu). */
function pendingSql(model: PiiModel): Prisma.Sql {
  const specs = PII_FIELDS[model] as Record<string, PiiFieldSpec>
  const parts: string[] = []
  for (const [field, spec] of Object.entries(specs)) {
    const col = `"${field}"`
    parts.push(spec.json
      ? `(${col} IS NOT NULL AND jsonb_typeof(${col}) <> 'null' AND (jsonb_typeof(${col}) <> 'string' OR (${col} #>> '{}') NOT LIKE 'pii1.%'))`
      : `(${col} IS NOT NULL AND ${col} NOT LIKE 'pii1.%')`)
    if (spec.hash) parts.push(`(${col} IS NOT NULL AND "${spec.hash}" IS NULL)`)
  }
  const json = PII_JSON_KEYS[model]
  if (json) parts.push(`("${json.column}" ? '${json.key}')`)
  return Prisma.raw(parts.join(" OR "))
}

/**
 * ADR-014 D-P3, P-5c: mã hoá các dòng còn chữ rõ trong cột cá nhân — dòng ghi bằng SQL thô, dòng do bản cũ ghi trong lúc
 * deploy, SĐT khách lẻ còn trong `metadata.customerPhone` — và băm các số chưa băm. Ghi lại qua client Prisma: lệnh ghi
 * tự mã hoá (pii-write.ts). Chạy trong lượt quét nền 5 phút (`/internal/chain-dispatch-sweep`) và bằng
 * `npm run pii:backfill`. Có trần mỗi bảng mỗi lượt; trả số dòng đã xử lý theo bảng.
 */
export async function encryptPendingPii(db: PiiBackfillClient, options: { batch?: number } = {}): Promise<Partial<Record<PiiModel, number>>> {
  if (!piiMasterKey()) return {}
  const batch = options.batch ?? 200
  const done: Partial<Record<PiiModel, number>> = {}
  for (const model of Object.keys(PII_FIELDS) as PiiModel[]) {
    const pk = PII_PRIMARY_KEY[model]
    const ids = await db.$queryRaw<Array<{ pk: string }>>(
      Prisma.sql`SELECT ${Prisma.raw(`"${pk}"`)} AS pk FROM ${Prisma.raw(`"${model}"`)} WHERE ${pendingSql(model)} LIMIT ${batch}`,
    )
    const json = PII_JSON_KEYS[model]
    const select: Record<string, true> = { [pk]: true, organization_id: true }
    for (const f of Object.keys(PII_FIELDS[model])) select[f] = true
    if (json) select[json.column] = true
    const delegate = db[model] as Delegate
    const rows = ids.length ? await delegate.findMany({ where: { [pk]: { in: ids.map((r) => r.pk) } }, select }) : []
    for (const row of rows) {
      // Đọc qua client đã giải mã (chữ rõ trả nguyên) → ghi lại → lệnh ghi mã hoá và băm
      const { [pk]: id, organization_id: organizationId, ...data } = row
      if (json && data[json.column] === null) delete data[json.column]
      for (const [k, v] of Object.entries(data)) if (v === null) delete data[k]
      await delegate.update({ where: { [pk]: id, organization_id: organizationId }, data })
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
