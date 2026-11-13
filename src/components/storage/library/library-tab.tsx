"use client"

import type { Route } from "next"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Music } from "@/components/ui/icon-set/music"
import { Search } from "@/components/ui/icon-set/search"
import { Share2 } from "@/components/ui/icon-set/share2"
import { Trash2 } from "@/components/ui/icon-set/trash2"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { ProductThumb } from "@/components/products/product-thumb"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/i18n/formatters"
import type { LibraryType } from "@/modules/storage/domain/library"
import { LIBRARY_TAB_LABEL, statusLabel, subtypeLabel } from "./library-labels"
import { UseAssetSheet } from "@/components/marketing-center/use-asset-sheet"

export type LibraryItemView = {
  id: string
  type: LibraryType
  subtype: string | null
  title: string
  status: string | null
  created_at: string
  branch: { id: string; name: string } | null
  thumbnail_url: string | null
  drive_link: string | null
  open_href: string
  asset_type?: {
    code: string
    name: string
    module: string
  } | null
}

const SINCE_OPTIONS = [
  { value: "", label: "Mọi lúc" },
  { value: "7", label: "7 ngày qua" },
  { value: "30", label: "30 ngày qua" },
  { value: "90", label: "90 ngày qua" },
]

const MODULE_OPTIONS = [
  { value: "ALL", label: "Tất cả nghiệp vụ" },
  { value: "brand", label: "Thương hiệu" },
  { value: "content", label: "Nội dung" },
  { value: "promotion", label: "Quảng bá" },
  { value: "sales", label: "Bán hàng" },
  { value: "care", label: "Chăm sóc" },
  { value: "print", label: "Ấn phẩm & In" },
]

type Props = {
  type: LibraryType
  /** `all` | `hq` | id chi nhánh — Screen Contract `kho-du-lieu.md` §5. */
  scope: string
  showBranch: boolean
  refreshKey: number
  onTrash?: ((item: LibraryItemView) => void) | undefined
}

/** Lưới một loại dữ liệu của Kho dữ liệu v2 (`GET /api/v1/storage/library`). */
export function LibraryTab({ type, scope, showBranch, refreshKey, onTrash }: Props) {
  const [items, setItems] = useState<LibraryItemView[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [sinceDays, setSinceDays] = useState("")
  const [selectedModule, setSelectedModule] = useState("ALL")
  const [selectedUsageItem, setSelectedUsageItem] = useState<LibraryItemView | null>(null)

  const load = useCallback(
    async (after: string | null) => {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ type, scope })
      if (q.trim()) params.set("q", q.trim())
      if (sinceDays) params.set("from", new Date(Date.now() - Number(sinceDays) * 86_400_000).toISOString())
      if (after) params.set("cursor", after)
      try {
        const res = await fetch(`/api/v1/storage/library?${params}`)
        if (!res.ok) throw new Error()
        const body = (await res.json()) as { data: { items: LibraryItemView[]; next_cursor: string | null } }
        setItems((prev) => (after ? [...prev, ...body.data.items] : body.data.items))
        setCursor(body.data.next_cursor)
      } catch {
        setError("Chưa tải được danh sách. Vui lòng thử lại.")
      } finally {
        setLoading(false)
      }
    },
    [type, scope, q, sinceDays]
  )

  useEffect(() => {
    const timer = setTimeout(() => void load(null), q ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, q, refreshKey])

  const filteredItems = useMemo(() => {
    if (selectedModule === "ALL") return items
    return items.filter((item) => item.asset_type?.module === selectedModule)
  }, [items, selectedModule])

  const label = LIBRARY_TAB_LABEL[type].toLowerCase()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="sr-only">Tìm {label}</span>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10 pointer-events-none" aria-hidden />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Tìm ${label} theo tên`}
            className="pl-9"
          />
        </div>
        <div className="sm:w-44">
          <span className="sr-only">Thời gian tạo</span>
          <NativeSelect
            value={sinceDays}
            onChange={(e) => setSinceDays(e.target.value)}
            className="w-full"
          >
            {SINCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="sm:w-44">
          <span className="sr-only">Nghiệp vụ</span>
          <NativeSelect
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full"
          >
            {MODULE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-bg p-3.5 text-caption text-danger">
          <AlertCircle size={15} />
          {error}
          <Button variant="outline" size="sm" className="ml-auto text-caption" onClick={() => void load(null)}>
            Thử lại
          </Button>
        </div>
      )}

      {!loading && !error && filteredItems.length === 0 && (
        <Card className="border-dashed bg-surface-alt p-8 text-center">
          <FileText size={32} className="mx-auto mb-2 text-text-muted opacity-50" aria-hidden />
          <div className="text-title-sm font-bold text-text">Chưa có {label} nào</div>
          <p className="mx-auto mt-1 max-w-sm text-caption text-text-muted">Mục bạn tạo trong công cụ sẽ tự xuất hiện ở đây.</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filteredItems.map((item) => {
          const name = item.title || subtypeLabel(item.subtype) || LIBRARY_TAB_LABEL[type]
          const status = statusLabel(item.status)
          return (
            <Card key={item.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="relative aspect-square w-full overflow-hidden bg-surface-alt">
                {type === "audio" ? (
                  <div className="flex h-full w-full items-center justify-center text-text-muted">
                    <Music size={28} className="opacity-50" aria-hidden />
                  </div>
                ) : (
                  <ProductThumb name={name} masterImageUrl={item.thumbnail_url ?? undefined} driveLink={item.drive_link ?? undefined} size="card" />
                )}
                {showBranch && (
                  <Badge className="absolute left-2 top-2 border-none bg-surface px-1.5 py-0 text-caption font-bold text-text">
                    {item.branch?.name ?? "Trụ sở"}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-1.5 p-3">
                <div className="truncate text-meta font-semibold text-text" title={name}>
                  {name}
                </div>
                {item.asset_type && (
                  <div className="flex">
                    <span className="inline-block rounded-md bg-surface-alt px-1.5 py-0.5 text-caption font-semibold text-text-muted">
                      {item.asset_type.name}
                    </span>
                  </div>
                )}
                <div className="text-caption text-text-muted">
                  {formatDate(item.created_at)}
                  {status ? ` · ${status}` : ""}
                </div>
                <div className="flex items-center gap-1.5">
                  <Link
                    href={item.open_href as Route}
                    className="flex h-7 flex-1 items-center justify-center gap-1 rounded-lg border border-border text-caption font-semibold text-text hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <ExternalLink size={12} aria-hidden />
                    Mở
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUsageItem(item)}
                    className="h-7 px-2 text-caption font-semibold"
                    title="Cấu hình nơi sử dụng và theo dõi hiệu quả"
                  >
                    <Share2 size={12} aria-hidden />
                    Dùng
                  </Button>
                  {onTrash && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onTrash(item)}
                      aria-label={`Chuyển ${name} vào thùng rác`}
                      title="Chuyển vào thùng rác 30 ngày (Chỉ Điều hành)"
                      className="h-7 w-7 p-0 shrink-0 text-text-muted hover:bg-danger-bg hover:text-danger hover:border-danger/30"
                    >
                      <Trash2 size={13} aria-hidden />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {loading && <SkeletonBlock lines={3} label="Đang tải danh sách" />}
      {cursor && !loading && (
        <Button variant="outline" size="sm" className="mx-auto text-caption" onClick={() => void load(cursor)}>
          Xem thêm
        </Button>
      )}

      {selectedUsageItem && (
        <UseAssetSheet
          open={Boolean(selectedUsageItem)}
          onOpenChange={(open) => !open && setSelectedUsageItem(null)}
          sourceType={selectedUsageItem.type}
          sourceId={selectedUsageItem.id}
          assetTypeCode={selectedUsageItem.asset_type?.code ?? "8"}
          assetTitle={selectedUsageItem.title || subtypeLabel(selectedUsageItem.subtype) || LIBRARY_TAB_LABEL[type]}
        />
      )}
    </div>
  )
}
