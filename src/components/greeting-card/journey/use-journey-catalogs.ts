"use client"

import { useCallback } from "react"
import useSWR from "swr"

export interface CatalogOption {
  id: string
  name: string
  code: string
  itemCount: number
  /** Cấu hình JSON của bộ sưu tập; `templateId` là giao diện khách xem. */
  filters: Record<string, unknown> | null
  /** Người tạo — Sale chỉ sửa bộ sưu tập của mình (PO 16/10/2026) */
  createdBy?: string | null | undefined
}

type CatalogListResponse = {
  data?: Array<{
    id: string
    name: string
    code: string
    filters?: Record<string, unknown> | null
    created_by?: string | null
    _count?: { items: number }
  }>
}

const CATALOG_API = "/api/v1/greeting-card/catalogs"

/** Chuẩn hóa mã link: chữ thường, chỉ a-z, 0-9 và dấu gạch ngang. */
export function normalizeLinkCode(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Đường dẫn công khai của bộ sưu tập; rỗng khi chưa biết slug cửa hàng. */
export function catalogPublicPath(orgSlug: string, catalog: CatalogOption): string {
  if (orgSlug && catalog.code) return `bst/${orgSlug}/${catalog.code}`
  return `g/${catalog.id}`
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const json = (await res.json()) as { error?: { message?: string } | string }
    if (typeof json.error === "string") return json.error
    return json.error?.message ?? fallback
  } catch {
    return fallback
  }
}

/** Dữ liệu và thao tác bộ sưu tập dùng cho luồng gửi thẻ chào (SWR — không tải bằng useEffect). */
export function useJourneyCatalogs() {
  const list = useSWR<CatalogOption[]>(CATALOG_API, async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(await readError(res, "Không tải được danh sách bộ sưu tập."))
    const json = (await res.json()) as CatalogListResponse
    return (json.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      itemCount: c._count?.items ?? 0,
      filters: c.filters ?? null,
      createdBy: c.created_by ?? null,
    }))
  })
  // Không có slug (lỗi/không quyền) → dùng link dạng g/<id>
  const org = useSWR<{ slug?: string }>("/api/v1/organizations/current", (url: string) =>
    fetch(url).then((r) => (r.ok ? r.json() : {}))
  )
  // Luôn trả array — tránh crash khi SWR đang revalidating (data tạm undefined)
  const catalogs: CatalogOption[] = Array.isArray(list.data) ? list.data : []
  const orgSlug = org.data?.slug ?? ""
  const loading = list.isLoading
  const loadError = list.error instanceof Error ? list.error.message : null

  const { mutate } = list

  /** Cập nhật lạc quan danh sách đang có (vd. số mẫu sau khi thêm/xoá trong picker). */
  const setCatalogs = useCallback(
    (update: (prev: CatalogOption[]) => CatalogOption[]) => {
      void mutate((prev) => update(Array.isArray(prev) ? prev : []), { revalidate: false })
    },
    [mutate],
  )

  const reload = useCallback(async (): Promise<CatalogOption[]> => {
    const result = await mutate()
    return Array.isArray(result) ? result : []
  }, [mutate])

  const createCatalog = useCallback(
    async (input: { name: string; code?: string; productIds?: string[] }): Promise<string> => {
      const code = normalizeLinkCode(input.code ?? "") || `bst-${Date.now().toString(36)}`
      const res = await fetch(CATALOG_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name.trim(),
          code,
          type: "STANDARD",
          ...(input.productIds ? { product_ids: input.productIds } : {}),
        }),
      })
      if (!res.ok) throw new Error(await readError(res, "Không tạo được bộ sưu tập. Mã link có thể đã được dùng."))
      const json = (await res.json()) as { data?: { id: string } }
      if (!json.data?.id) throw new Error("Máy chủ không trả về bộ sưu tập vừa tạo.")
      await reload()
      return json.data.id
    },
    [reload],
  )

  const cloneCatalog = useCallback(
    async (sourceId: string, input: { name: string; code: string }) => {
      const res = await fetch(`${CATALOG_API}/${sourceId}`)
      if (!res.ok) throw new Error(await readError(res, "Không đọc được sản phẩm của bộ sưu tập gốc."))
      const json = (await res.json()) as { data?: { items?: Array<{ product: { id: string } }> } }
      const productIds = json.data?.items?.map((item) => item.product.id) ?? []
      const id = await createCatalog({ ...input, productIds })
      return { id, itemCount: productIds.length }
    },
    [createCatalog],
  )

  const createSendLink = useCallback(
    async (input: { catalogId: string; customerName: string; customerPhone: string }) => {
      const res = await fetch("/api/v1/greeting-card/send-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalog_id: input.catalogId,
          customer_name: input.customerName.trim() || undefined,
          customer_phone: input.customerPhone.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error(await readError(res, "Không tạo được link gửi khách. Vui lòng thử lại."))
      const json = (await res.json()) as { data?: { sendCode: string; shareUrl: string } }
      if (!json.data) throw new Error("Máy chủ không trả về link gửi khách.")
      return json.data
    },
    [],
  )

  /** Lưu giao diện khách xem vào `filters.templateId`, giữ nguyên các khóa khác. */
  const saveTemplate = useCallback(async (catalog: CatalogOption, templateId: string) => {
    const filters = { ...(catalog.filters ?? {}), templateId }
    const res = await fetch(`${CATALOG_API}/${catalog.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters }),
    })
    if (!res.ok) throw new Error(await readError(res, "Không lưu được giao diện. Vui lòng thử lại."))
    setCatalogs((items) => items.map((c) => (c.id === catalog.id ? { ...c, filters } : c)))
  }, [setCatalogs])

  return { saveTemplate, catalogs, setCatalogs, orgSlug, loading, loadError, reload, createCatalog, cloneCatalog, createSendLink }
}
