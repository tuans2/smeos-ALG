"use client"

import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Eye } from "@/components/ui/icon-set/eye"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"

export type PendingProductCopy = {
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
  created_at: string
}

function dinhDangGio(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("vi-VN")
}

export function ProductCopiesApprovalPanel({
  productCopies,
  dangDuyet,
  onApprove,
  onReject,
  onViewDetail,
  onNavigateCreate,
}: {
  productCopies: PendingProductCopy[]
  dangDuyet: string | null
  onApprove: (id: string, name: string) => Promise<void>
  onReject: (id: string, name: string) => Promise<void>
  onViewDetail: (productId: string | null, id: string) => void
  onNavigateCreate: () => void
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="text-body font-bold">Dữ liệu bán hàng chờ duyệt ({productCopies.length})</div>
      {productCopies.length === 0 ? (
        <EmptyState
          title="Không có dữ liệu bán hàng nào chờ duyệt"
          reason="Mọi nội dung mô tả bán hàng đã được duyệt hoặc chuyển giao."
          action={{
            label: "Tạo nội dung bán hàng",
            onClick: onNavigateCreate,
          }}
        />
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {productCopies.map((pc) => (
            <div key={pc.id} className="flex flex-col gap-1 py-2.5">
              <div className="flex min-h-11 items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onViewDetail(pc.product_id, pc.id)}
                  className="flex min-w-0 flex-1 items-center justify-start gap-2.5 text-left h-auto p-1"
                >
                  <CheckCircle2 size={18} strokeWidth={1.8} className="flex-shrink-0 text-secondary" />
                  <div className="min-w-0">
                    <div className="truncate text-body-sm font-semibold">{pc.raw.suggested_name}</div>
                    <div className="truncate text-caption text-text-muted">
                      Phân tích: #{pc.analysis_id.slice(0, 8)} · {dinhDangGio(pc.created_at)}
                      {pc.product_id && ` · SP: #${pc.product_id.slice(0, 8)}`}
                    </div>
                  </div>
                </Button>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetail(pc.product_id, pc.id)}
                    aria-label="Xem chi tiết"
                    title="Xem chi tiết"
                  >
                    <Eye size={16} aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    disabled={dangDuyet === pc.id}
                    onClick={() => onApprove(pc.id, pc.raw.suggested_name)}
                  >
                    {dangDuyet === pc.id ? "Đang duyệt…" : "Duyệt"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={dangDuyet === pc.id}
                    onClick={() => onReject(pc.id, pc.raw.suggested_name)}
                  >
                    Không đạt
                  </Button>
                </div>
              </div>
              {pc.edited && (
                <div className="pl-7 text-caption text-text-muted">
                  Đã chỉnh sửa: {Object.keys(pc.edited).join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
