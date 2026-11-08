"use client"

import { useI18n } from "@/lib/i18n"
import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Save, CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSession } from "@/lib/session"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { usePromptDialog } from "@/components/ui/prompt-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type ProductCopy = {
  id: string
  analysis_id: string
  product_id: string | null
  raw: {
    suggested_name: string
    suggested_description: string
    suggested_tags: string[]
    suggested_occasions: string[]
    suggested_price_segment: string
  }
  edited: {
    suggested_name?: string
    suggested_description?: string
    suggested_tags?: string[]
    suggested_occasions?: string[]
    suggested_price_segment?: string
  } | null
  approval_state: "PENDING" | "APPROVED" | "REJECTED"
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

type ProductCopyField =
  | "suggested_name"
  | "suggested_description"
  | "suggested_tags"
  | "suggested_occasions"
  | "suggested_price_segment"

const FIELD_LABELS: Record<ProductCopyField, string> = {
  suggested_name: "Tên sản phẩm",
  suggested_description: "Mô tả",
  suggested_tags: "Thẻ (tags)",
  suggested_occasions: "Dịp phù hợp",
  suggested_price_segment: "Phân khúc giá",
}

const PRICE_SEGMENTS = ["budget", "standard", "premium", "luxury"] as const

export default function ProductCopyDetailPage() {
  const { t } = useI18n()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { capabilities } = useSession()

  const productId = params.id as string
  const copyId = params.copyId as string
  const returnTo = searchParams.get("return") ?? `/san-pham/${productId}/tinh-nang`

  const [copy, setCopy] = useState<ProductCopy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Local edit state
  const [localEdited, setLocalEdited] = useState<Partial<Record<ProductCopyField, string | string[]>>>({})
  const [confirm, confirmDialog] = useConfirmDialog()
  const [askText, promptDialog] = usePromptDialog()

  useEffect(() => {
    async function fetchCopy() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/v1/product-copies/${copyId}`)
        if (res.status === 401) {
          router.push("/dang-nhap")
          return
        }
        if (!res.ok) throw new Error(`Không tải được dữ liệu (${res.status})`)
        const data = await res.json()
        setCopy(data)
        // Initialize local edit state from existing edited or raw
        setLocalEdited(data.edited ?? data.raw)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không tải được dữ liệu")
      } finally {
        setLoading(false)
      }
    }
    fetchCopy()
  }, [copyId, router])

  const canEdit = capabilities.includes("H5")
  const canApprove = capabilities.includes("H6")
  const isPending = copy?.approval_state === "PENDING"

  function handleFieldChange(field: ProductCopyField, value: string | string[]) {
    setLocalEdited((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!canEdit) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/product-copies/${copyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edited: localEdited }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
        throw new Error(err.message ?? "Lưu thất bại")
      }
      const data = await res.json()
      setCopy(data)
      setLocalEdited(data.edited ?? data.raw)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại")
    } finally {
      setSaving(false)
    }
  }

  async function handleApprove() {
    if (!canApprove) return
    if (
      !(await confirm({
        title: "Xác nhận duyệt dữ liệu bán hàng?",
        consequence: "Dữ liệu này sẽ được dùng để tạo/cập nhật sản phẩm trong Product Master.",
        confirmLabel: "Duyệt ngay",
        tone: "default",
      }))
    ) {
      return
    }
    setActionLoading("approve")
    try {
      const res = await fetch(`/api/v1/product-copies/${copyId}/approve`, { method: "POST" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
        throw new Error(err.message ?? "Duyệt thất bại")
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Duyệt thất bại")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject() {
    if (!canApprove) return
    const reason = await askText({
      title: "Từ chối bản nội dung này?",
      label: "Lý do từ chối",
      confirmLabel: "Từ chối",
      tone: "danger",
    })
    if (!reason) return
    setActionLoading("reject")
    try {
      const res = await fetch(`/api/v1/product-copies/${copyId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
        throw new Error(err.message ?? "Từ chối thất bại")
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Từ chối thất bại")
    } finally {
      setActionLoading(null)
    }
  }

  function getEffectiveValue(field: ProductCopyField): string | string[] {
    const val = localEdited[field] ?? copy?.raw[field]
    return val ?? ""
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin motion-reduce:animate-none text-primary" />
          <p className="text-text-muted">Đang tải dữ liệu bán hàng…</p>
        </div>
      </div>
    )
  }

  if (error && !copy) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-bg">
          <AlertCircle size={32} strokeWidth={1.8} className="text-danger" />
        </div>
        <h2 className="text-title font-bold">Không tải được dữ liệu</h2>
        <p className="text-text-muted max-w-xs">{error}</p>
        <Button variant="secondary" onClick={() => router.refresh()}>
          <RefreshCw size={15} strokeWidth={2} /> Thử lại
        </Button>
      </div>
    )
  }

  if (!copy) return null

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-surface px-[18px] py-4">
          <PageHeader
            title={`Dữ liệu bán hàng #${copy.id.slice(0, 8)}`}
            backHref={returnTo}
            backLabel="Quay lại"
            badge={
              <Badge
                tone={
                  copy.approval_state === "APPROVED"
                    ? "success"
                    : copy.approval_state === "REJECTED"
                    ? "danger"
                    : "warning"
                }
                className="text-caption"
              >
                {copy.approval_state === "APPROVED"
                  ? "Đã duyệt"
                  : copy.approval_state === "REJECTED"
                  ? "Đã từ chối"
                  : "Chờ duyệt"}
              </Badge>
            }
            description={
              <span className="flex items-center gap-2 text-meta text-text-muted">
                <span>Phân tích: <code className="font-mono">{copy.analysis_id.slice(0, 8)}…</code></span>
                {copy.product_id && (
                  <>
                    <span className="flex h-4 w-[1px] bg-border" />
                    <span>Sản phẩm: <code className="font-mono">{copy.product_id.slice(0, 8)}…</code></span>
                  </>
                )}
              </span>
            }
          />
          <div className="flex items-center gap-2">
            <Button
              aria-label="Làm mới" variant="ghost" size="icon" onClick={() => router.refresh()}>
              <RefreshCw size={18} strokeWidth={2} className="text-text-muted" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-xl border-[1.5px] border-danger/30 bg-danger/10 px-3.5 py-2.5 text-body-sm font-medium text-danger">
              {error}
            </div>
          )}

          {/* Raw vs Edited Comparison */}
          <Card className="mb-4">
            <div className="border-b border-border px-4 py-3">
              <h3 className="font-bold text-title-sm">So sánh Raw ↔ Edited</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Field Name */}
                <div className="font-medium text-text-muted">Trường</div>
                <div className="font-medium text-text-muted text-center">Raw (AI)</div>
                <div className="font-medium text-text-muted text-center">Edited (User)</div>
              </div>
              <div className="mt-2 space-y-3">
                {([
                  "suggested_name",
                  "suggested_description",
                  "suggested_tags",
                  "suggested_occasions",
                  "suggested_price_segment",
                ] as ProductCopyField[]).map((field) => {
                  const rawValue = copy.raw[field]
                  const editedValue = localEdited[field] ?? copy.edited?.[field]
                  const isEdited = editedValue !== undefined && editedValue !== rawValue

                  return (
                    <div key={field} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="font-medium text-body-sm text-text-muted">
                        {FIELD_LABELS[field]}
                      </div>
                      <div className="text-center text-body-sm">
                        {Array.isArray(rawValue) ? (
                          <span className="flex flex-wrap justify-center gap-1">
                            {rawValue.map((t, i) => (
                              <Badge key={i} tone="neutral" className="text-caption h-4 px-1.5">
                                {t}
                              </Badge>
                            ))}
                          </span>
                        ) : (
                          <code className="font-mono text-meta bg-surface-alt px-2 py-1 rounded">
                            {String(rawValue)}
                          </code>
                        )}
                      </div>
                      <div className="text-center">
                        {field === "suggested_price_segment" ? (
                          <NativeSelect
                            value={String(getEffectiveValue(field))}
                            onChange={(e) => handleFieldChange(field, e.target.value)}
                            disabled={!canEdit || !isPending}
                            className="max-w-xs mx-auto"
                          >
                            {PRICE_SEGMENTS.map((seg) => (
                              <option key={seg} value={seg}>
                                {seg.charAt(0).toUpperCase() + seg.slice(1)}
                              </option>
                            ))}
                          </NativeSelect>
                        ) : Array.isArray(getEffectiveValue(field)) ? (
                          <div className="flex flex-wrap justify-center gap-1">
                            {String(getEffectiveValue(field))
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean)
                              .map((tag, i) => (
                                <Badge
                                  key={i}
                                  tone={isEdited ? "accent" : "neutral"}
                                  className="text-caption h-4 px-1.5"
                                >
                                  {tag}
                                </Badge>
                              ))}
                          </div>
                        ) : (
                          <Input
                            type="text"
                            value={String(getEffectiveValue(field))}
                            onChange={(e) => handleFieldChange(field, e.target.value)}
                            disabled={!canEdit || !isPending}
                            className="max-w-xs mx-auto"
                          />
                        )}
                        {isEdited && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="ml-1.5 text-caption text-primary font-medium">●</span>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="p-2 text-caption">
                                Đã chỉnh sửa
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card className="mb-4">
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {isPending && canEdit && (
                  <Button onClick={handleSave} disabled={saving} className="flex-1">
                    {saving ? "Đang lưu…" : "Lưu chỉnh sửa"}
                    <Save size={16} strokeWidth={2} className="ml-2" />
                  </Button>
                )}
                {isPending && canApprove && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={handleReject}
                      disabled={actionLoading === "reject"}
                      className="flex-1"
                    >
                      {actionLoading === "reject" ? "Đang từ chối…" : "Từ chối"}
                      <XCircle size={16} strokeWidth={2} className="ml-2" />
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={actionLoading === "approve"}
                      className="flex-1"
                    >
                      {actionLoading === "approve" ? "Đang duyệt…" : "Duyệt & Ghi Product Master"}
                      <CheckCircle2 size={16} strokeWidth={2} className="ml-2" />
                    </Button>
                  </>
                )}
                {!isPending && (
                  <Badge
                    tone={
                      copy.approval_state === "APPROVED" ? "success" : "danger"
                    }
                    className="text-caption flex-1 text-center"
                  >
                    {copy.approval_state === "APPROVED"
                      ? `Đã duyệt bởi ${copy.approved_by?.slice(0, 8)} lúc ${new Date(copy.approved_at!).toLocaleString("vi-VN")}`
                      : `Đã từ chối`}
                  </Badge>
                )}
              </div>
            </div>
          </Card>

          {/* Metadata */}
          <Card>
            <div className="border-b border-border px-4 py-3">
              <h3 className="font-bold text-title-sm">Thông tin</h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4 text-body-sm">
              <div>
                <div className="text-text-muted">Trạng thái duyệt</div>
                <div className="font-medium capitalize">{copy.approval_state.toLowerCase()}</div>
              </div>
              <div>
                <div className="text-text-muted">Người tạo</div>
                <div className="font-medium">{copy.id.slice(0, 8)}…</div>
              </div>
              <div>
                <div className="text-text-muted">Tạo lúc</div>
                <div className="font-medium">{new Date(copy.created_at).toLocaleString("vi-VN")}</div>
              </div>
              {copy.approved_at && (
                <>
                  <div>
                    <div className="text-text-muted">Duyệt lúc</div>
                    <div className="font-medium">{new Date(copy.approved_at).toLocaleString("vi-VN")}</div>
                  </div>
                  <div>
                    <div className="text-text-muted">Người duyệt</div>
                    <div className="font-medium">{copy.approved_by?.slice(0, 8)}…</div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
      {confirmDialog}
      {promptDialog}
    </TooltipProvider>
  )
}
