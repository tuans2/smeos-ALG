import { FieldCatalogRepository, getFieldCatalogRepository } from "../infra/field-catalog-repository"

export interface TenantCatalogValueView {
  code: string
  label: string
  sortOrder: number
  behavior: string | null
  params: Record<string, unknown> | null
}

export interface TenantCatalogView {
  key: string
  label: string
  governance: string
  behaviorKind: string | null
  values: TenantCatalogValueView[]
}

/**
 * ĐP-4a.1 (26/09/2026) — đọc CHỈ ĐỌC danh mục cho FORM NHẬP LIỆU của tổ chức
 * (T01…). Khác `platform/list-catalogs.ts` (đòi `PlatformContext` + N12):
 * hàm này chỉ đòi đã đăng nhập tổ chức (R1, kiểm ở route bằng
 * `requireTenantContext`), KHÔNG có thao tác ghi, và CHỈ trả giá trị đang
 * `is_active` — ẩn giá trị đã tắt khỏi ô chọn (form nhập liệu không cần
 * biết giá trị đã tắt, khác Console quản trị danh mục cần thấy cả để bật lại).
 *
 * `field_catalogs`/`field_catalog_values` là bảng NỀN TẢNG (không có
 * `organization_id` — chung cho mọi tổ chức, ĐP-3 §16.2), nên hàm này không
 * nhận `TenantContext` để lọc theo tổ chức.
 */
export async function listCatalogsForTenant(keys?: readonly string[]): Promise<TenantCatalogView[]> {
  const repo = getFieldCatalogRepository()
  const all = await repo.listCatalogs()
  const filtered = keys && keys.length > 0 ? all.filter((c) => keys.includes(c.key)) : all
  return Promise.all(
    filtered.map(async (c) => {
      const values = await repo.listValues(c.key)
      return {
        key: c.key,
        label: c.label,
        governance: c.governance,
        behaviorKind: c.behavior_kind,
        values: values
          .filter((v) => v.is_active)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((v) => ({
            code: v.code,
            label: v.label,
            sortOrder: v.sort_order,
            behavior: v.behavior,
            params: (v.params as Record<string, unknown> | null) ?? null,
          })),
      }
    })
  )
}
