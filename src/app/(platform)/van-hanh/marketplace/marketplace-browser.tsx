"use client"

// Danh sách chợ đối tác dùng chung cho console (N1) và link chia sẻ công khai.
// Lọc: ô tìm nhanh + dropdown nhiều tiêu chí (HOẶC trong nhóm, VÀ giữa nhóm).
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Search } from "@/components/ui/icon-set/search"
import { Store } from "@/components/ui/icon-set/store"
import { PageHeader } from "@/components/ui/page-header"
import { PageContainer } from "@/components/ui/page-container"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { InlineError } from "@/components/ui/inline-error"
import type { PartnerStoreMarketplaceEntity } from "@/modules/platform/domain/partner-marketplace.types"
import { buildFacetGroups, matchesFacets, type FacetSelection } from "@/modules/platform/domain/partner-marketplace-facets"
import { searchTextOf } from "@/modules/platform/domain/partner-marketplace-row-mapper"
import { MarketplaceStoreCard } from "./marketplace-store-card"
import { MarketplaceProfileModal } from "./marketplace-profile-modal"
import { MarketplaceBulkDeleteBar, type BulkDeleteRequest, type BulkDeleteResult } from "./marketplace-bulk-delete-bar"
import { MarketplaceFacetFilter } from "./marketplace-facet-filter"

export type MarketplaceLoadResult = { stores: PartnerStoreMarketplaceEntity[] } & Record<string, unknown>

interface MarketplaceBrowserProps {
  endpoint: string
  title: string
  /** Câu báo lỗi theo mã HTTP; `null` → câu chung. */
  errorFor: (status: number) => string | null
  actions?: (ctx: { loading: boolean; refresh: () => Promise<void> }) => React.ReactNode
  emptyHint: string
  /** Gọi khi tải xong — trang công khai đọc thêm hạn link. */
  onLoaded?: (data: MarketplaceLoadResult) => void
  /** Thay toàn bộ nội dung khi lỗi (vd. link hết hạn). */
  renderError?: (status: number) => React.ReactNode | null
  readOnly?: boolean
  /** Xoá một hồ sơ (chỉ trang console truyền khi người xem có quyền xoá). Trả câu lỗi hoặc null. */
  deleteStore?: (store: PartnerStoreMarketplaceEntity) => Promise<string | null>
  /** Xoá hàng loạt (chọn nhiều / toàn bộ) — cùng điều kiện với `deleteStore`. */
  deleteStores?: (request: BulkDeleteRequest) => Promise<BulkDeleteResult>
}

export function MarketplaceBrowser({ endpoint, title, errorFor, actions, emptyHint, onLoaded, renderError, readOnly = false, deleteStore, deleteStores }: MarketplaceBrowserProps) {
  const [stores, setStores] = useState<PartnerStoreMarketplaceEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<{ status: number; message: string } | null>(null)
  const [search, setSearch] = useState("")
  const [selection, setSelection] = useState<FacetSelection>({})
  const [selectedStore, setSelectedStore] = useState<PartnerStoreMarketplaceEntity | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [pickedIds, setPickedIds] = useState<Set<string>>(() => new Set())

  // Tải toàn bộ một lần; lọc tại chỗ bằng các hàm domain thuần.
  const fetchStores = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(endpoint, { cache: "no-store" })
      if (!res.ok) {
        setLoadError({ status: res.status, message: errorFor(res.status) ?? "Không tải được danh sách cửa hàng." })
        return
      }
      const json = (await res.json()) as { data: MarketplaceLoadResult }
      setStores(json.data.stores)
      onLoaded?.(json.data)
      setLoadError(null)
    } catch {
      setLoadError({ status: 0, message: "Không kết nối được máy chủ." })
    } finally {
      setLoading(false)
    }
  }, [endpoint, errorFor, onLoaded])

  useEffect(() => {
    void (async () => {
      await fetchStores()
    })()
  }, [fetchStores])

  const searchTexts = useMemo(() => new Map(stores.map((s) => [s.id, searchTextOf(s)])), [stores])

  // Ô tìm nhanh áp trước; số đếm trong dropdown phản ánh đúng kết quả đang xem.
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? stores.filter((s) => (searchTexts.get(s.id) ?? "").includes(q)) : stores
  }, [stores, searchTexts, search])

  const groups = useMemo(() => buildFacetGroups(searched, selection), [searched, selection])
  const filteredStores = useMemo(() => searched.filter((s) => matchesFacets(s, selection)), [searched, selection])
  const hasFilter = search.trim().length > 0 || Object.keys(selection).length > 0

  const replaced = loadError && renderError?.(loadError.status)
  if (replaced) return <>{replaced}</>

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={title}
        description={`${stores.length} cửa hàng đã khảo sát — năng lực, cơ sở vật chất và phân hạng đối tác.`}
        actions={actions?.({ loading, refresh: fetchStores })}
      />

      <div className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-start">
          <div className="relative flex-1 md:max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              type="text"
              placeholder="Tìm nhanh: tên cửa hàng, khu vực, sản phẩm, ghi chú…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-caption"
              inputSize="sm"
            />
          </div>
          <MarketplaceFacetFilter groups={groups} selection={selection} onChange={setSelection} />
        </div>
        <p className="text-caption text-text-muted">
          Hiển thị: <strong className="text-text">{filteredStores.length}</strong> / {stores.length} cửa hàng đối tác
          {Object.keys(selection).length > 1 && " · cửa hàng thoả MỌI nhóm tiêu chí đã chọn"}
          {" · thông tin liên hệ đã được che một phần"}
        </p>
      </div>

      {deleteStores && !loading && (
        <MarketplaceBulkDeleteBar
          selecting={selecting}
          selectedCount={pickedIds.size}
          selectedIds={[...pickedIds]}
          visibleIds={filteredStores.map((s) => s.id)}
          totalCount={stores.length}
          onStart={() => setSelecting(true)}
          onStop={() => setSelecting(false)}
          onSelectIds={(ids) => setPickedIds((prev) => new Set([...prev, ...ids]))}
          onClear={() => setPickedIds(new Set())}
          run={async (request) => {
            const result = await deleteStores(request)
            await fetchStores()
            return result
          }}
        />
      )}

      {loadError && <InlineError message={loadError.message} />}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 py-8 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-64 animate-pulse motion-reduce:animate-none border border-border bg-surface-alt/40" />
          ))}
        </div>
      ) : filteredStores.length === 0 ? (
        <Card className="space-y-3 p-8 py-16 text-center">
          <Store className="mx-auto h-12 w-12 text-text-muted/40" />
          <h2 className="text-body-sm font-semibold text-text">Không tìm thấy cửa hàng nào phù hợp</h2>
          <p className="mx-auto max-w-sm text-meta text-text-muted">
            {hasFilter ? "Thử bỏ bớt tiêu chí hoặc đổi từ khoá tìm nhanh." : emptyHint}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredStores.map((store) => (
            <MarketplaceStoreCard
              key={store.id}
              store={store}
              onQuickView={(s) => setSelectedStore(s)}
              {...(selecting
                ? {
                    selection: {
                      selected: pickedIds.has(store.id),
                      onToggle: () =>
                        setPickedIds((prev) => {
                          const next = new Set(prev)
                          if (next.has(store.id)) next.delete(store.id)
                          else next.add(store.id)
                          return next
                        }),
                    },
                  }
                : {})}
            />
          ))}
        </div>
      )}

      <MarketplaceProfileModal
        key={selectedStore?.id ?? "none"}
        store={selectedStore}
        onClose={() => setSelectedStore(null)}
        readOnly={readOnly}
        {...(deleteStore
          ? {
              onDelete: async (store: PartnerStoreMarketplaceEntity) => {
                const error = await deleteStore(store)
                if (!error) {
                  setSelectedStore(null)
                  await fetchStores()
                }
                return error
              },
            }
          : {})}
      />
    </PageContainer>
  )
}
