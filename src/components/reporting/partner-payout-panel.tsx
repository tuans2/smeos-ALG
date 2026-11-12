"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useApi } from "@/components/greeting-card/greeting-api"
import { PARTNER_DIRECTORY_URL } from "@/components/coordinator/partner-management-modal"
import { PartnerStatementModal } from "@/components/coordinator/partner-statement-modal"
import type { PeriodState } from "./report-fetch"

interface WorkshopPartner { id: string; code: string; name: string; isActive: boolean; district: string | null; province: string | null }

/**
 * Tiền công đối tác (audit BL-22): danh bạ xưởng gia công, mỗi xưởng mở bảng kê + sổ quyết toán của kỳ đang chọn.
 * Lối vào cho người có mã R19 (Điều hành, Kế toán) — trung tâm mạng lưới chỉ dành cho vai Điều phối, không có R19.
 */
export function PartnerPayoutPanel({ period }: { period: PeriodState }) {
  const { data, error, isLoading, mutate } = useApi<{ partners: WorkshopPartner[] }>(PARTNER_DIRECTORY_URL)
  const [open, setOpen] = useState<WorkshopPartner | null>(null)
  if (error) return <InlineError message={error instanceof Error ? error.message : "Chưa tải được danh bạ xưởng"} onRetry={() => void mutate()} />
  if (isLoading || !data) return <SkeletonBlock lines={3} label="Đang tải danh bạ xưởng" />
  const partners = data.partners
  return (
    <div className="space-y-3">
      <p className="text-caption text-text-muted">Tiền công ghi lúc đóng đơn: phí gia công đã chốt sau khấu trừ, hoặc giá thoả thuận lúc giao xưởng.</p>
      {partners.length === 0 ? (
        <p className="text-caption text-text-muted">Chưa có xưởng gia công nào.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {partners.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <div className="text-body-sm font-semibold text-text">{p.name}{p.isActive ? "" : " · đang tạm ngưng"}</div>
                <div className="text-caption text-text-muted">{[p.district, p.province].filter(Boolean).join(", ") || "Chưa ghi khu vực"}</div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(p)}>Bảng kê</Button>
            </li>
          ))}
        </ul>
      )}
      <PartnerStatementModal key={`${open?.id ?? "none"}-${period.from}-${period.to}`} partner={open} initialFrom={period.from} initialTo={period.to} onClose={() => setOpen(null)} />
    </div>
  )
}
