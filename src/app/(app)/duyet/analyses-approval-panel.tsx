"use client"

import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Download } from "@/components/ui/icon-set/download"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"

export type PendingAnalysis = {
  id: string
  asset_id: string
  provider: string
  created_at: string
}

function dinhDangGio(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("vi-VN")
}

export function AnalysesApprovalPanel({
  analyses,
  dangDuyet,
  onApprove,
  onReject,
  onNavigateUpload,
}: {
  analyses: PendingAnalysis[]
  dangDuyet: string | null
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onNavigateUpload: () => void
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="text-body font-bold">Phân tích ảnh chờ duyệt ({analyses.length})</div>
      {analyses.length === 0 ? (
        <EmptyState
          title="Không có phân tích nào chờ duyệt"
          reason="Tất cả các lượt phân tích ảnh hoa đã được duyệt hoặc xử lý."
          action={{
            label: "Tải ảnh mới để phân tích",
            onClick: onNavigateUpload,
          }}
        />
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {analyses.map((a) => (
            <div key={a.id} className="flex min-h-11 items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <CheckCircle2 size={18} strokeWidth={1.8} className="flex-shrink-0 text-secondary" />
                <div className="min-w-0">
                  <div className="truncate text-body-sm font-semibold">Lượt phân tích #{a.id.slice(0, 8)}</div>
                  <div className="truncate text-caption text-text-muted">
                    {a.provider} · {dinhDangGio(a.created_at)}
                  </div>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  disabled={dangDuyet === a.id}
                  onClick={() => onApprove(a.id)}
                >
                  {dangDuyet === a.id ? "Đang duyệt…" : "Duyệt"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={dangDuyet === a.id}
                  onClick={() => onReject(a.id)}
                >
                  Không đạt
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {analyses.length > 0 && (
        <a
          href="/api/v1/vision/analyses/export"
          download
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3.5 py-2 text-caption font-semibold text-text-muted hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Download size={15} strokeWidth={1.9} />
          Tải toàn bộ lượt phân tích để đối soát (CSV)
        </a>
      )}
    </Card>
  )
}
