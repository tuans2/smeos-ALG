"use client"

import { NativeSelect } from "@/components/ui/select"
import React, { useState } from "react"
import { BookOpen, Plus, RefreshCw, Loader2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { BrochurePreviewModal } from "@/components/greeting-card/customer/brochure-preview-modal"
import { readApiError } from "@/components/greeting-card/api-error"
import { CATALOG_CHANNELS } from "@/modules/greeting-card/domain/catalog-channel"
import { copyFromServer, createShareUrl } from "@/components/greeting-card/share/tracked-copy"
import { useApi } from "@/components/greeting-card/greeting-api"
import { useSession } from "@/lib/session"
import { CatalogCreateModal } from "./catalog-create-modal"
import { CatalogCard, type CatalogItem } from "./catalog-card"
import { CatalogListFilters, type CatalogDaysFilter, type CatalogStatusFilter } from "./catalog-list-filters"
import { useI18n } from "@/lib/i18n"

type Props = {
  onSelectCatalog: (catalog: CatalogItem) => void
}

export function CatalogListTab({ onSelectCatalog }: Props) {
  const [confirm, confirmDialog] = useConfirmDialog()
  const { can } = useSession()
  const { ti } = useI18n()
  const rawCatalogTitle = ti("catalogTitle") || "Bộ sưu tập"
  const isHomestay = rawCatalogTitle.toLowerCase().includes("phòng")
  const isFnb = rawCatalogTitle.toLowerCase().includes("thực đơn")
  const catalogHeading = isHomestay ? "danh sách phòng" : isFnb ? "thực đơn món" : rawCatalogTitle.toLowerCase()
  const createBtnText = isHomestay ? "Tạo danh sách phòng" : isFnb ? "Tạo thực đơn" : "Tạo bộ sưu tập"

  const me = useApi<{ user: { id: string; name: string | null } }>("/api/v1/auth/me")
  const currentUserId = me.data?.user.id ?? null
  // L4 product.archive — được ẩn/khôi phục catalog của người khác (khớp server: delete-greeting-catalog.ts)
  const isOperator = can("L4")

  const [staffFilter, setStaffFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<CatalogStatusFilter>("active")
  const [daysFilter, setDaysFilter] = useState<CatalogDaysFilter>("all")


  // URL query
  const queryParams = new URLSearchParams()
  if (statusFilter === "archived") queryParams.set("status", "archived")
  if (staffFilter) queryParams.set("created_by", staffFilter)
  if (daysFilter === "3") queryParams.set("days", "3")
  const isFiltered = statusFilter !== "active" || staffFilter !== "" || daysFilter !== "all"
  const clearFilters = () => {
    setStatusFilter("active")
    setStaffFilter("")
    setDaysFilter("all")
  }
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ""

  const list = useApi<{ data: CatalogItem[] }>(`/api/v1/greeting-card/catalogs${queryString}`)
  const catalogs = list.data?.data ?? []
  const loading = list.isLoading || list.isValidating
  const loadCatalogs = () => list.mutate()

  // Danh sách nhân sự để Điều hành chọn lọc theo từng người
  const staffApi = useApi<{ data: { members: Array<{ userId: string; name: string }> } }>(
    isOperator ? "/api/v1/greeting-card/messages/recipients" : null
  )
  const staffList = staffApi.data?.data.members ?? []

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState<string>("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copiedCatalogId, setCopiedCatalogId] = useState<string | null>(null)
  const [shareChannel, setShareChannel] = useState("")
  // Slug tổ chức để dựng URL thân thiện; chưa có → dùng link /g/{id}
  const org = useApi<{ slug?: string }>("/api/v1/organizations/current")
  const orgSlug = org.data?.slug ?? null

  function buildPublicUrl(catalog: CatalogItem) {
    if (orgSlug && catalog.code) {
      return `${window.location.origin}/bst/${orgSlug}/${catalog.code}`
    }
    return `${window.location.origin}/g/${catalog.id}`
  }

  // Mỗi lần sao chép = một link mang tên người bấm (theo dõi từ lúc khách mở tới khi xong đơn)
  async function copyPublicLink(catalog: CatalogItem) {
    setActionError(null)
    try {
      await copyFromServer(() => createShareUrl(catalog.id, shareChannel))
      setCopiedCatalogId(catalog.id)
      setTimeout(() => setCopiedCatalogId(null), 2000)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Không sao chép được link")
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Ẩn bộ sưu tập này?",
      consequence: "Các link đã gửi vẫn hoạt động; bạn hoặc Điều hành có thể khôi phục trong mục “Đã ẩn”.",
      confirmLabel: "Ẩn bộ sưu tập",
    })
    if (!ok) return
    setDeletingId(id)
    setActionError(null)
    try {
      const res = await fetch(`/api/v1/greeting-card/catalogs/${id}`, { method: "DELETE" })
      if (!res.ok) setActionError(await readApiError(res, "Không xóa được bộ sưu tập"))
      await loadCatalogs()
    } finally {
      setDeletingId(null)
    }
  }

  async function handleRestore(id: string) {
    setRestoringId(id)
    setActionError(null)
    try {
      const res = await fetch(`/api/v1/greeting-card/catalogs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      })
      if (!res.ok) setActionError(await readApiError(res, "Không khôi phục được bộ sưu tập"))
      await loadCatalogs()
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {actionError && (
        <div role="alert" className="p-3 rounded-xl bg-danger-bg text-danger text-body-sm font-medium">
          {actionError}
        </div>
      )}
      <label className="flex flex-wrap items-center gap-2 text-body-sm text-text-muted">
        Sao chép link cho kênh
        <NativeSelect
          value={shareChannel}
          onChange={(e) => setShareChannel(e.target.value)}
          className="h-9 rounded-lg border border-border bg-surface px-2 text-body-sm text-text"
        >
          <option value="">Không chọn kênh</option>
          {CATALOG_CHANNELS.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </NativeSelect>
        <span className="text-caption">Link này gắn với tên bạn. Đơn khách đặt từ link sẽ được tính cho bạn.</span>
      </label>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <h2 className="text-title font-extrabold text-text flex items-center gap-2">
            <BookOpen size={20} />
            <span className="capitalize">Quản lý {catalogHeading}</span>
          </h2>
          <p className="text-body-sm text-text-muted mt-1">
            Tạo và chỉnh sửa các {catalogHeading} để gửi cho khách hàng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadCatalogs()}
            className="gap-1.5 text-caption h-9"
          >
            <RefreshCw size={14} className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
            <span>Làm mới</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="bg-primary hover:bg-primary-dark text-white font-bold gap-1.5 text-body-sm h-9 shadow-sm"
          >
            <Plus size={16} />
            <span>{createBtnText}</span>
          </Button>
        </div>
      </div>


      <CatalogListFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        daysFilter={daysFilter}
        setDaysFilter={setDaysFilter}
        staffFilter={staffFilter}
        setStaffFilter={setStaffFilter}
        staffList={staffList}
        showStaffFilter={isOperator}
      />

      {isCreateOpen && (
        <CatalogCreateModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            setIsCreateOpen(false)
            void loadCatalogs()
          }}
        />
      )}

      {/* Catalog Grid */}
      {loading && catalogs.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 size={24} className="animate-spin motion-reduce:animate-none mr-2" />
          <span className="text-body-sm">Đang tải danh sách...</span>
        </div>
      ) : catalogs.length === 0 && isFiltered ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-center">
            <p className="text-title-sm font-bold text-text">Không có {catalogHeading} nào khớp bộ lọc</p>
            <p className="text-body-sm text-text-muted mt-1">
              Thử xem tất cả thời gian, tất cả nhân sự hoặc mục đang hoạt động
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={clearFilters} className="mt-2">
            Bỏ lọc
          </Button>
        </div>
      ) : catalogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
            <BookOpen size={28} className="text-text-muted" />
          </div>
          <div className="text-center">
            <p className="text-title-sm font-bold text-text">Chưa có {catalogHeading} nào</p>
            <p className="text-body-sm text-text-muted mt-1">
              Tạo {catalogHeading} đầu tiên để bắt đầu gửi link riêng cho khách
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 mt-2"
          >
            <Plus size={16} />
            <span className="capitalize">{createBtnText}</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalogs.map((catalog) => (
            <CatalogCard
              key={catalog.id}
              catalog={catalog}
              canManageState={isOperator || (Boolean(currentUserId) && catalog.created_by === currentUserId)}
              copied={copiedCatalogId === catalog.id}
              deleting={deletingId === catalog.id}
              restoring={restoringId === catalog.id}
              onSelect={() => onSelectCatalog(catalog)}
              onPreview={() => {
                setPreviewUrl(buildPublicUrl(catalog))
                setPreviewTitle(`Xem trước: ${catalog.name} (${orgSlug}/${catalog.code})`)
              }}
              onCopy={() => void copyPublicLink(catalog)}
              onDelete={() => void handleDelete(catalog.id)}
              onRestore={() => void handleRestore(catalog.id)}
            />
          ))}
        </div>
      )}

      {/* Live Preview Modal */}
      {previewUrl && (
        <BrochurePreviewModal
          url={previewUrl}
          title={previewTitle}
          onClose={() => setPreviewUrl(null)}
        />
      )}
      {confirmDialog}
    </div>
  )
}
