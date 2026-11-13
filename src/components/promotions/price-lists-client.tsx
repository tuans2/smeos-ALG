"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { FileSpreadsheet } from "@/components/ui/icon-set/file-spreadsheet"
import { Plus } from "@/components/ui/icon-set/plus"

import { ActiveSwitch } from "@/components/promotions/active-switch"
import { EMPTY_PRICE_LIST, PriceListForm, type PriceListFormValue } from "@/components/promotions/price-list-form"
import { Button } from "@/components/ui/button"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { Dialog } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { FeatureGuidanceCard } from "@/components/ui/feature-guidance-card"
import { InlineError } from "@/components/ui/inline-error"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/lib/session"
import { PRICE_LIST_STATUS_LABEL, type PriceListStatus } from "@/modules/products/domain/price-list"
import { PageHeader } from "@/components/ui/page-header"

type PriceListRow = PriceListFormValue & { id: string; status: PriceListStatus; updatedAt: string }

const STATUS_TONE: Record<PriceListStatus, string> = {
  ACTIVE: "border-success-border bg-success-bg text-success-text",
  PAUSED: "border-warning-border bg-warning-bg text-warning-text",
  SCHEDULED: "border-info-border bg-info-bg text-info-text",
  EXPIRED: "border-border bg-surface-alt text-text-muted",
}

export function PriceListsClient() {
  const { can } = useSession()
  const canManage = can("L3")
  const [lists, setLists] = useState<PriceListRow[] | null>(null)
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([])
  const [error, setError] = useState<string | null>(null)
  // Giữ nội dung form trong lúc hộp thoại chạy hiệu ứng đóng (không bị trống)
  const [editing, setEditing] = useState<PriceListFormValue>(EMPTY_PRICE_LIST)
  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const openForm = (value: PriceListFormValue) => {
    setEditing(value)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }
  const [confirm, confirmDialog] = useConfirmDialog()

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/price-lists")
      if (!res.ok) throw new Error()
      const body = await res.json()
      setError(null)
      setLists(body.data)
      setCategories(body.categories)
    } catch {
      setError("Chưa tải được danh sách bảng giá")
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!cancelled) await load()
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [load])

  async function toggle(p: PriceListRow, next: boolean) {
    setLists((l) => l?.map((x) => (x.id === p.id ? { ...x, active: next } : x)) ?? null)
    const res = await fetch(`/api/v1/price-lists/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: next }),
    }).catch(() => null)
    if (!res?.ok) setError("Chưa đổi được trạng thái bảng giá, vui lòng thử lại")
    void load()
  }

  async function remove(p: PriceListRow) {
    const ok = await confirm({
      title: `Xoá bảng giá "${p.name}"?`,
      consequence: "Bảng giá không còn trong danh sách. Giá sản phẩm không bị ảnh hưởng.",
      confirmLabel: "Xoá bảng giá",
      tone: "danger",
    })
    if (!ok) return
    const res = await fetch(`/api/v1/price-lists/${p.id}`, { method: "DELETE" }).catch(() => null)
    if (!res?.ok) setError("Chưa xoá được bảng giá, vui lòng thử lại")
    void load()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Bảng giá sản phẩm"
          description="Bảng giá gọn gàng để gửi khách, in tại quầy hoặc lưu thành PDF."
        />
        {canManage && (
          <Button onClick={() => openForm(EMPTY_PRICE_LIST)}>
            <Plus className="h-4 w-4" aria-hidden />
            Tạo bảng giá
          </Button>
        )}
      </div>

      <FeatureGuidanceCard
        guidanceId="price-lists"
        title="Giá luôn khớp với sản phẩm"
        description="Bảng giá lấy giá đang bán của từng sản phẩm, nên chỉ cần sửa giá ở Quản lý sản phẩm. Ưu đãi in kèm là các ưu đãi đang bật ở Chương trình ưu đãi."
        tips={["Tạo nhiều bảng giá theo loại sản phẩm hoặc theo mùa.", "Tắt công tắc khi bảng giá tạm ngừng dùng."]}
      />

      {error && <InlineError message={error} onRetry={() => void load()} />}

      {lists === null && !error ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
      ) : lists?.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="Chưa có bảng giá nào"
          reason="Tạo bảng giá đầu tiên từ các sản phẩm đang bán."
          action={canManage ? { label: "Tạo bảng giá", onClick: () => openForm(EMPTY_PRICE_LIST) } : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {lists?.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-title-sm font-bold text-text">{p.name}</h2>
                  <span className={`rounded-full border px-2 py-0.5 text-meta font-semibold ${STATUS_TONE[p.status]}`}>{PRICE_LIST_STATUS_LABEL[p.status]}</span>
                </div>
                <p className="mt-1 text-meta text-text-muted">
                  {p.categories.length > 0
                    ? p.categories.map((c) => categories.find((o) => o.value === c)?.label ?? c).join(", ")
                    : "Mọi sản phẩm đang bán"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/bang-gia/${p.id}`} className="inline-flex min-h-9 items-center rounded-xl border border-border px-3 text-body-sm font-semibold text-text hover:bg-surface-alt">
                  Xem và in
                </Link>
                {canManage && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => openForm(p)}>Sửa</Button>
                    <Button variant="ghost" size="sm" onClick={() => void remove(p)}>Xoá</Button>
                    <ActiveSwitch checked={p.active} onChange={(next) => void toggle(p, next)} label={`${p.active ? "Tắt" : "Bật"} bảng giá ${p.name}`} />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen} title={editing.id ? "Sửa bảng giá" : "Tạo bảng giá"} size="lg">
        <PriceListForm
          key={formKey}
          initial={editing}
          categories={categories}
          onCancel={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); void load() }}
        />
      </Dialog>
      {confirmDialog}
    </div>
  )
}
