import { newDataKey, unwrapDataKey } from "../pii-cipher"

/** Client gốc (chưa gắn extension) hoặc giao dịch — chỉ cần bảng khoá. */
export interface PiiKeyDb {
  tenant_data_keys: {
    findFirst(args: {
      where: { organization_id: string; version?: number; retired_at?: null }
      orderBy?: { version: "desc" }
      select: { version: true; wrapped_key: true }
    }): Promise<{ version: number; wrapped_key: string } | null>
    create(args: { data: { organization_id: string; version: number; wrapped_key: string }; select: { version: true } }): Promise<{ version: number }>
  }
}

export interface DataKey {
  key: Buffer
  version: number
}

const current = new Map<string, DataKey>()
const byVersion = new Map<string, Buffer>()

/** Xoá bộ nhớ đệm khoá (test, xoay khoá). */
export function resetPiiKeyCache(): void {
  current.clear()
  byVersion.clear()
}

/**
 * ADR-014 P-5a: khoá dữ liệu đang dùng của tổ chức; chưa có thì tạo phiên bản 1 (hai tiến trình tạo cùng lúc → bên
 * thua đọc lại). Khoá đã mở giữ trong bộ nhớ tiến trình, không ghi log, không trả ra ngoài.
 */
export async function currentDataKey(db: PiiKeyDb, master: Buffer, organizationId: string): Promise<DataKey> {
  const cached = current.get(organizationId)
  if (cached) return cached
  let row = await db.tenant_data_keys.findFirst({
    where: { organization_id: organizationId, retired_at: null },
    orderBy: { version: "desc" },
    select: { version: true, wrapped_key: true },
  })
  if (!row) {
    const fresh = newDataKey(master)
    try {
      await db.tenant_data_keys.create({ data: { organization_id: organizationId, version: 1, wrapped_key: fresh.wrapped }, select: { version: true } })
      row = { version: 1, wrapped_key: fresh.wrapped }
    } catch (error) {
      if ((error as { code?: unknown })?.code !== "P2002") throw error
      row = await db.tenant_data_keys.findFirst({ where: { organization_id: organizationId, version: 1 }, select: { version: true, wrapped_key: true } })
      if (!row) throw error
    }
  }
  const key: DataKey = { key: unwrapDataKey(master, row.wrapped_key), version: row.version }
  current.set(organizationId, key)
  byVersion.set(`${organizationId}:${row.version}`, key.key)
  return key
}

/** Khoá theo phiên bản ghi trong bản mã (giải mã, P-5b). */
export async function dataKeyByVersion(db: PiiKeyDb, master: Buffer, organizationId: string, version: number): Promise<Buffer | null> {
  const cacheKey = `${organizationId}:${version}`
  const cached = byVersion.get(cacheKey)
  if (cached) return cached
  const row = await db.tenant_data_keys.findFirst({ where: { organization_id: organizationId, version }, select: { version: true, wrapped_key: true } })
  if (!row) return null
  const key = unwrapDataKey(master, row.wrapped_key)
  byVersion.set(cacheKey, key)
  return key
}
