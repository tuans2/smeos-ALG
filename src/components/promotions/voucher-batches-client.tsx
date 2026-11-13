"use client"

import { useCallback, useEffect, useState } from "react"
import { Download } from "@/components/ui/icon-set/download"
import { Plus } from "@/components/ui/icon-set/plus"
import { Ticket } from "@/components/ui/icon-set/ticket"

import { ActiveSwitch } from "@/components/promotions/active-switch"
import { VoucherBatchForm, type PromotionOption } from "@/components/promotions/voucher-batch-form"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { FeatureGuidanceCard } from "@/components/ui/feature-guidance-card"
import { InlineError } from "@/components/ui/inline-error"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatDate } from "@/lib/i18n/formatters"
import { useSession } from "@/lib/session"
import { discountLabel, VOUCHER_BATCH_STATUS_LABEL, type VoucherBatchStatus, type VoucherDiscountType } from "@/modules/promotions/domain/voucher-batch"
import { PageHeader } from "@/components/ui/page-header"

interface BatchRow {
  id: string
  name: string
  status: VoucherBatchStatus
  isActive: boolean
  discountType: VoucherDiscountType
  discountValue: number
  maxDiscountVnd: number | null
  minOrderVnd: number
  expiresAt: string | null
  promotionTitle: string | null
  promotionId: string | null
  codeCount: number
  usedTotal: number
  sampleCode: string | null
}

interface CodeRow {
  code: string
  usedCount: number
  usageLimit: number | null
}

const STATUS_TONE: Record<VoucherBatchStatus, string> = {
  ACTIVE: "border-success-border bg-success-bg text-success-text",
  SCHEDULED: "border-info-border bg-info-bg text-info-text",
  EXPIRED: "border-border bg-surface-alt text-text-muted",
  PAUSED: "border-warning-border bg-warning-bg text-warning-text",
  EXHAUSTED: "border-border bg-surface-alt text-text-muted",
}

const dateVi = (iso: string | null) => (iso ? formatDate(iso) : null)

export function VoucherBatchesClient() {
  const { can } = useSession()
  const canManage = can("Q8")
  const [batches, setBatches] = useState<BatchRow[] | null>(null)
  const [promotions, setPromotions] = useState<PromotionOption[]>([])
  const [maxPercent, setMaxPercent] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const openForm = () => {
    setFormKey((k) => k + 1)
    setCreating(true)
  }
  const [detail, setDetail] = useState<{ batch: BatchRow; codes: CodeRow[] } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/vouchers/batches")
      if (!res.ok) throw new Error()
      const body = await res.json()
      setError(null)
      setBatches(body.batches)
      setPromotions(body.promotions.map((p: PromotionOption) => ({ id: p.id, title: p.title })))
      setMaxPercent(body.maxDiscountPercent)
    } catch {
      setError("Chưa tải được danh sách mã giảm giá")
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!cancelled) await load()
    }
    if (canManage) void run()
    return () => {
      cancelled = true
    }
  }, [canManage, load])

  async function toggle(b: BatchRow, next: boolean) {
    setBatches((list) => list?.map((x) => (x.id === b.id ? { ...x, isActive: next } : x)) ?? null)
    const res = await fetch(`/api/v1/vouchers/batches/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    }).catch(() => null)
    if (!res?.ok) setError("Chưa đổi được trạng thái đợt mã, vui lòng thử lại")
    void load()
  }

  async function openDetail(b: BatchRow) {
    const res = await fetch(`/api/v1/vouchers/batches/${b.id}`).catch(() => null)
    if (!res?.ok) return setError("Chưa mở được danh sách mã")
    const body = await res.json()
    setDetail({ batch: b, codes: body.codes })
  }

  if (!canManage) {
    return <EmptyState icon={Ticket} title="Bạn chưa có quyền phát hành mã giảm giá" reason="Nhờ Điều hành cấp quyền quản lý mã giảm giá cho tài khoản của bạn." />
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Phát hành mã giảm giá"
          description="Tạo mã để khách nhập khi đặt hàng qua bộ sưu tập riêng và bộ sưu tập chung."
        />
        <Button onClick={openForm}>
          <Plus className="h-4 w-4" aria-hidden />
          Phát hành đợt mới
        </Button>
      </div>

      <FeatureGuidanceCard
        guidanceId="voucher-batches"
        title="Mã giảm giá đi theo công tắc ưu đãi"
        description="Gắn đợt mã vào một chương trình ưu đãi: khi bạn (hoặc chuỗi) tắt ưu đãi đó ở Chương trình ưu đãi, mọi mã của đợt tự ngừng nhận."
        tips={["Mã chung hợp với quảng cáo, mạng xã hội; mã riêng hợp để in lên thiệp hoặc gửi từng khách.", "Tải danh sách mã (CSV) để in hoặc nhắn cho khách."]}
      />

      {error && <InlineError message={error} onRetry={() => void load()} />}

      {batches === null && !error ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : batches?.length === 0 ? (
        <EmptyState icon={Ticket} title="Chưa có đợt mã giảm giá nào" reason="Phát hành đợt đầu tiên để khách nhập mã khi đặt hàng." action={{ label: "Phát hành đợt mới", onClick: openForm }} />
      ) : (
        <ul className="flex flex-col gap-3">
          {batches?.map((b) => (
            <li key={b.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-title-sm font-bold text-text">{b.name}</h2>
                  <span className={`rounded-full border px-2 py-0.5 text-meta font-semibold ${STATUS_TONE[b.status]}`}>{VOUCHER_BATCH_STATUS_LABEL[b.status]}</span>
                </div>
                <p className="mt-1 text-body-sm text-text">
                  {discountLabel(b.discountType, b.discountValue, b.maxDiscountVnd)}
                  {b.minOrderVnd > 0 && ` · đơn từ ${formatCurrency(b.minOrderVnd)}`}
                  {dateVi(b.expiresAt) && ` · hết hạn ${dateVi(b.expiresAt)}`}
                </p>
                <p className="mt-0.5 text-meta text-text-muted">
                  {b.sampleCode ? `Mã ${b.sampleCode}` : `${b.codeCount} mã`} · đã dùng {b.usedTotal} lượt
                  {b.promotionId && ` · thuộc ưu đãi ${b.promotionTitle ?? "đang tắt"}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => void openDetail(b)}>Xem mã</Button>
                <ActiveSwitch checked={b.isActive} onChange={(next) => void toggle(b, next)} label={`${b.isActive ? "Tạm dừng" : "Mở lại"} đợt ${b.name}`} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating} title="Phát hành đợt mã giảm giá" size="lg">
        <VoucherBatchForm
          key={formKey}
          promotions={promotions}
          maxDiscountPercent={maxPercent}
          onCancel={() => setCreating(false)}
          onCreated={() => { setCreating(false); void load() }}
        />
      </Dialog>

      <Dialog
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail?.batch.name ?? ""}
        description={detail ? `${detail.codes.length} mã` : undefined}
        size="md"
        footer={detail && (
          <a href={`/api/v1/vouchers/batches/${detail.batch.id}/export`} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-body-sm font-semibold text-white">
            <Download className="h-4 w-4" aria-hidden />
            Tải danh sách mã (CSV)
          </a>
        )}
      >
        <ul className="divide-y divide-border">
          {detail?.codes.map((c) => (
            <li key={c.code} className="flex items-center justify-between py-2 text-body">
              <span className="font-mono font-semibold text-text">{c.code}</span>
              <span className="text-meta text-text-muted">đã dùng {c.usedCount}{c.usageLimit !== null ? `/${c.usageLimit}` : ""} lượt</span>
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  )
}
